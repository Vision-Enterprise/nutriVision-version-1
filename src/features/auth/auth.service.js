/**
 * Authentication Service
 *
 * Business logic layer between the UI and Supabase Auth.
 */

import { supabase } from '../../core/supabase.js';
import { signIn, signOut } from '../../core/auth.js';
import { isActive } from '../../core/permissions.js';
import { AUDIT_ACTIONS } from '../../shared/constants/app.constants.js';
import { normalizeStaffEmail } from '../users/users.service.js';

const EMAIL_ALIASES_STORAGE_KEY = 'nutrivision_email_aliases';

export function saveEmailAlias(newEmail, authEmail) {
  try {
    const raw = localStorage.getItem(EMAIL_ALIASES_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[normalizeStaffEmail(newEmail)] = String(authEmail || '').trim().toLowerCase();
    localStorage.setItem(EMAIL_ALIASES_STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

function getEmailAlias(inputEmail) {
  try {
    const raw = localStorage.getItem(EMAIL_ALIASES_STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[normalizeStaffEmail(inputEmail)] || null;
  } catch {
    return null;
  }
}

/**
 * Fetch a user's profile from the profiles table.
 *
 * @param {string} userId - The auth user's UUID
 * @returns {Promise<{ profile: Object|null, error: string|null }>}
 */
export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { profile: null, error: 'No profile found for this account.' };
    }
    return { profile: null, error: 'Failed to load user profile.' };
  }

  return { profile: data, error: null };
}

/**
 * Write an entry to the audit_logs table.
 */
async function writeAuditLog({ userId, action, entityType = null, entityId = null, description = null }) {
  const { error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      description,
    });

  if (error) {
    console.warn('[NutriVision] Audit log write failed:', error.message);
  }
}

/**
 * Perform a complete login flow:
 * 1. Normalize Account ID (e.g. "20260001" -> "20260001@mnao.ph")
 * 2. Authenticate with Supabase Auth (with seamless fallback if Account ID is an alias for an existing account)
 * 3. Fetch the user's profile
 * 4. Check that the account is active
 * 5. Write a LOGIN audit log entry
 */
export async function login(emailInput, password) {
  const normalizedEmail = normalizeStaffEmail(emailInput);

  // Step 1: Authenticate with normalized email
  let { data: authData, error: authError } = await signIn(normalizedEmail, password);

  // Seamless alias fallback if user changed Account ID in Account Settings before running SQL migration
  if (authError) {
    const aliasTarget = getEmailAlias(normalizedEmail);
    if (aliasTarget && aliasTarget !== normalizedEmail) {
      const retryRes = await signIn(aliasTarget, password);
      if (!retryRes.error && retryRes.data?.user) {
        authData = retryRes.data;
        authError = null;
      }
    }
  }

  if (authError) {
    return { profile: null, error: mapAuthError(authError.message) };
  }

  const userId = authData.user.id;

  // Step 2: Fetch profile from our profiles table
  const { profile, error: profileError } = await fetchProfile(userId);

  if (profileError) {
    await signOut();
    return {
      profile: null,
      error: 'Your account profile could not be found. Please contact the administrator.',
    };
  }

  // Step 3: Check account is active
  if (!isActive(profile)) {
    await signOut();
    return {
      profile: null,
      error: 'Your account has been deactivated. Please contact the administrator.',
    };
  }

  // Step 4: Write audit log
  await writeAuditLog({
    userId,
    action: AUDIT_ACTIONS.LOGIN,
    description: `${profile.full_name} signed in.`,
  });

  return { profile, error: null };
}

/**
 * Perform a complete logout flow:
 * 1. Write a LOGOUT audit log entry (must happen BEFORE signOut)
 * 2. Sign out from Supabase Auth
 */
export async function logout(profile) {
  await writeAuditLog({
    userId: profile.id,
    action: AUDIT_ACTIONS.LOGOUT,
    description: `${profile.full_name} signed out.`,
  });

  const { error } = await signOut();

  if (error) {
    return { error: 'Failed to sign out. Please try again.' };
  }

  return { error: null };
}

/**
 * Map Supabase Auth error messages to user-friendly strings.
 */
function mapAuthError(message) {
  if (!message) return 'An unexpected error occurred. Please try again.';

  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials') || lower.includes('invalid email or password')) {
    return 'Incorrect Account ID / email or password. Please try again.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in.';
  }
  if (lower.includes('too many requests') || lower.includes('rate limit')) {
    return 'Too many sign-in attempts. Please wait a few minutes and try again.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Network error. Please check your internet connection and try again.';
  }

  return message;
}
