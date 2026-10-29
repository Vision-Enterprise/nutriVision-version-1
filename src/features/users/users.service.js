/**
 * User Management Service
 *
 * Handles all database operations and account provisioning for NutriVision users.
 * All mutating actions record an entry in the audit_logs table.
 */

import { supabase, createIsolatedAuthClient } from '../../core/supabase.js';
import { AUDIT_ACTIONS, ROLES } from '../../shared/constants/app.constants.js';

export const DEFAULT_STAFF_DOMAIN = 'mnao.ph';

/**
 * Normalize a staff login identifier or email:
 * - If only an ID/username is typed (e.g. "20260001"), appends "@mnao.ph"
 * - If full email is typed (e.g. "20260001@mnao.ph"), keeps it lowercase
 */
export function normalizeStaffEmail(rawInput) {
  const val = String(rawInput ?? '').trim().toLowerCase();
  if (!val) return '';
  if (!val.includes('@')) {
    return `${val}@${DEFAULT_STAFF_DOMAIN}`;
  }
  return val;
}

/**
 * Generate the next sequential MNAO Staff Email/ID in YYYYXXXX@mnao.ph format
 * (e.g. 20260001@mnao.ph, 20260002@mnao.ph).
 */
export function generateNextStaffEmail(users = []) {
  const year = new Date().getFullYear();
  const yearPrefix = String(year);
  let maxSeq = Array.isArray(users) ? users.length : 0;

  for (const u of (users || [])) {
    const emailStr = String(u.email || u.staff_id || '').trim().toLowerCase();
    const localPart = emailStr.split('@')[0] || '';
    if (localPart.startsWith(yearPrefix) && /^\d{8}$/.test(localPart)) {
      const seq = parseInt(localPart.slice(4), 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `${yearPrefix}${String(nextSeq).padStart(4, '0')}@${DEFAULT_STAFF_DOMAIN}`;
}

/**
 * Compute a deterministic recommended MNAO ID (YYYYXXXX@mnao.ph) for an existing user
 * based on their registration year and chronological signup order.
 */
export function getRecommendedStaffEmailForUser(targetUserId, allUsers = []) {
  if (!Array.isArray(allUsers) || allUsers.length === 0) {
    return `${new Date().getFullYear()}0001@${DEFAULT_STAFF_DOMAIN}`;
  }

  const sorted = [...allUsers].sort(
    (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
  );
  const idx = sorted.findIndex(u => u.id === targetUserId);
  const seq = idx >= 0 ? idx + 1 : sorted.length + 1;
  const userObj = idx >= 0 ? sorted[idx] : null;
  const regYear = userObj?.created_at
    ? new Date(userObj.created_at).getFullYear()
    : new Date().getFullYear();

  return `${regYear}${String(seq).padStart(4, '0')}@${DEFAULT_STAFF_DOMAIN}`;
}

// ── Read ──────────────────────────────────────────────────────────────────

/**
 * Fetch all registered user profiles ordered by full name, enriched with
 * known email / staff ID from audit logs or chronological registration sequence.
 * @returns {Promise<{ users: Array, error: string|null }>}
 */
export async function fetchUsers() {
  try {
    const [profilesRes, emailLogsRes, currentAuthRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, role, is_active, created_at, updated_at')
        .order('full_name'),
      supabase
        .from('audit_logs')
        .select('entity_id, user_id, description, created_at')
        .eq('entity_type', 'profile')
        .order('created_at', { ascending: false })
        .limit(300),
      supabase.auth.getUser()
    ]);

    if (profilesRes.error) throw profilesRes.error;
    const profiles = profilesRes.data || [];
    const currentUser = currentAuthRes?.data?.user || null;

    // Extract latest known email per profile from audit_logs descriptions
    const emailByUserId = {};
    for (const log of (emailLogsRes.data || [])) {
      const targetId = log.entity_id || log.user_id;
      if (!targetId || emailByUserId[targetId]) continue;
      const match = String(log.description || '').match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
      if (match) {
        emailByUserId[targetId] = match[1].toLowerCase();
      }
    }

    if (currentUser?.id && currentUser?.email) {
      emailByUserId[currentUser.id] = currentUser.email.toLowerCase();
    }

    const enriched = profiles.map(u => {
      const recEmail = getRecommendedStaffEmailForUser(u.id, profiles);
      return {
        ...u,
        email: emailByUserId[u.id] || recEmail,
        recommended_email: recEmail,
      };
    });

    return { users: enriched, error: null };
  } catch (err) {
    console.error('[UsersService] fetchUsers error:', err);
    return { users: [], error: 'Failed to load user accounts.' };
  }
}

/**
 * Fetch user activity logs (logins, logouts, account creation, activation/deactivation).
 * @returns {Promise<{ logs: Array, error: string|null }>}
 */
export async function fetchUserLogs() {
  try {
    const userActions = [
      AUDIT_ACTIONS.LOGIN,
      AUDIT_ACTIONS.LOGOUT,
      AUDIT_ACTIONS.CREATE_USER,
      AUDIT_ACTIONS.ACTIVATE_USER,
      AUDIT_ACTIONS.DEACTIVATE_USER,
    ];

    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        entity_type,
        description,
        created_at,
        profiles ( full_name )
      `)
      .in('action', userActions)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;
    return { logs: data || [], error: null };
  } catch (err) {
    console.error('[UsersService] fetchUserLogs error:', err);
    return { logs: [], error: 'Failed to load user activity logs.' };
  }
}

// ── Create ────────────────────────────────────────────────────────────────

/**
 * Provision a new user account and record an audit log entry.
 *
 * Uses an isolated Supabase client to prevent overwriting the active Admin session.
 *
 * @param {{ full_name: string, email: string, password: string, role: string }} formData
 * @param {Object} adminProfile - Current logged-in administrator profile
 * @returns {Promise<{ user: Object|null, error: string|null }>}
 */
export async function createUser(formData, adminProfile) {
  try {
    const isolatedClient = createIsolatedAuthClient();
    const normalizedEmail = normalizeStaffEmail(formData.email);

    const { data, error: authError } = await isolatedClient.auth.signUp({
      email: normalizedEmail,
      password: formData.password,
      options: {
        data: {
          full_name: formData.full_name.trim(),
          role: formData.role,
        },
      },
    });

    if (authError) {
      if (authError.message?.toLowerCase().includes('already registered')) {
        return { user: null, error: 'An account with this Account ID / email already exists.' };
      }
      return { user: null, error: authError.message || 'Failed to create user account.' };
    }

    const createdUser = data.user;
    if (!createdUser) {
      return { user: null, error: 'Could not create user. Please check your inputs.' };
    }

    // Record audit log entry using the Admin's authenticated client
    const roleLabel = formData.role === ROLES.ADMINISTRATOR ? 'Administrator' : 'Nutrition Personnel';
    await supabase.from('audit_logs').insert({
      user_id: adminProfile.id,
      action: AUDIT_ACTIONS.CREATE_USER,
      entity_type: 'profile',
      entity_id: createdUser.id,
      description: `Created user account for ${formData.full_name.trim()} (${roleLabel}) with email ${normalizedEmail}`,
    });

    return { user: createdUser, error: null };
  } catch (err) {
    console.error('[UsersService] createUser error:', err);
    return { user: null, error: err.message || 'Failed to create user account.' };
  }
}

// ── Toggle Status (Activate / Deactivate) ─────────────────────────────────

/**
 * Toggle user active status (deactivate or reactivate) and write an audit log.
 *
 * @param {Object} targetUser - The profile object being toggled
 * @param {Object} adminProfile - Current logged-in administrator profile
 * @returns {Promise<{ profile: Object|null, error: string|null }>}
 */
export async function toggleUserStatus(targetUser, adminProfile) {
  try {
    // Guard against self-deactivation
    if (targetUser.id === adminProfile.id) {
      return { profile: null, error: 'You cannot deactivate your own logged-in administrator account.' };
    }

    const nextStatus = !targetUser.is_active;
    const actionType = nextStatus ? AUDIT_ACTIONS.ACTIVATE_USER : AUDIT_ACTIONS.DEACTIVATE_USER;

    const { data, error } = await supabase
      .from('profiles')
      .update({ is_active: nextStatus })
      .eq('id', targetUser.id)
      .select()
      .single();

    if (error) throw error;

    // Record audit log entry
    await supabase.from('audit_logs').insert({
      user_id: adminProfile.id,
      action: actionType,
      entity_type: 'profile',
      entity_id: targetUser.id,
      description: `${nextStatus ? 'Activated' : 'Deactivated'} account for ${targetUser.full_name}`,
    });

    return { profile: data, error: null };
  } catch (err) {
    console.error('[UsersService] toggleUserStatus error:', err);
    return { profile: null, error: 'Failed to update user account status.' };
  }
}
