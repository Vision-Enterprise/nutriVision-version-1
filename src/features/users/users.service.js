/**
 * User Management Service
 *
 * Handles all database operations and account provisioning for NutriVision users.
 * All mutating actions record an entry in the audit_logs table.
 */

import { supabase, createIsolatedAuthClient } from '../../core/supabase.js';
import { AUDIT_ACTIONS, ROLES } from '../../shared/constants/app.constants.js';

// ── Read ──────────────────────────────────────────────────────────────────

/**
 * Fetch all registered user profiles ordered by full name.
 * @returns {Promise<{ users: Array, error: string|null }>}
 */
export async function fetchUsers() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, is_active, created_at, updated_at')
      .order('full_name');

    if (error) throw error;
    return { users: data || [], error: null };
  } catch (err) {
    console.error('[UsersService] fetchUsers error:', err);
    return { users: [], error: 'Failed to load user accounts.' };
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

    const { data, error: authError } = await isolatedClient.auth.signUp({
      email: formData.email.trim().toLowerCase(),
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
        return { user: null, error: 'An account with this email/username already exists.' };
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
      description: `Created user account for ${formData.full_name.trim()} (${roleLabel}) with email ${formData.email.trim().toLowerCase()}`,
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
