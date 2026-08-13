/**
 * Authentication Service
 *
 * Business logic layer between the UI and Supabase Auth.
 *
 * Architecture:
 *   auth.page.js (UI)
 *       ↓
 *   auth.service.js (business logic) ← YOU ARE HERE
 *       ↓
 *   core/auth.js (Supabase Auth wrapper)
 *       ↓
 *   Supabase
 *
 * This layer is responsible for:
 * 1. Calling Supabase Auth
 * 2. Fetching the user's profile after authentication
 * 3. Validating the profile (active? exists?)
 * 4. Writing audit log entries
 * 5. Returning clean result objects to the UI
 *
 * The UI layer (auth.page.js) should NOT need to know about
 * Supabase table names, column names, or query structure.
 * All of that lives here.
 */

import { supabase } from '../../core/supabase.js';
import { signIn, signOut } from '../../core/auth.js';
import { isActive } from '../../core/permissions.js';
import { AUDIT_ACTIONS } from '../../shared/constants/app.constants.js';

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
    // PGRST116 = "no rows returned" — the profile doesn't exist
    if (error.code === 'PGRST116') {
      return { profile: null, error: 'No profile found for this account.' };
    }
    return { profile: null, error: 'Failed to load user profile.' };
  }

  return { profile: data, error: null };
}

/**
 * Write an entry to the audit_logs table.
 *
 * This is a best-effort operation. If it fails, we log the error
 * to the console but do NOT block the user's action.
 * A failed audit log is not a reason to prevent login.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.action     - From AUDIT_ACTIONS constants
 * @param {string} [params.entityType]
 * @param {string} [params.entityId]
 * @param {string} [params.description]
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
    // Don't throw — audit log failure should not break the app
    console.warn('[NutriVision] Audit log write failed:', error.message);
  }
}

/**
 * Perform a complete login flow:
 * 1. Authenticate with Supabase Auth
 * 2. Fetch the user's profile
 * 3. Check that the account is active
 * 4. Write a LOGIN audit log entry
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ profile: Object|null, error: string|null }>}
 */
export async function login(email, password) {
  // Step 1: Authenticate
  const { data: authData, error: authError } = await signIn(email, password);

  if (authError) {
    // Map Supabase error messages to user-friendly messages.
    // WHY? Supabase returns technical errors like "Invalid login credentials".
    // We can do better than that for the user experience.
    return { profile: null, error: mapAuthError(authError.message) };
  }

  const userId = authData.user.id;

  // Step 2: Fetch profile from our profiles table
  const { profile, error: profileError } = await fetchProfile(userId);

  if (profileError) {
    // Profile doesn't exist — edge case (auth user exists but no profile)
    await signOut(); // Sign them back out — don't leave them in a broken state
    return {
      profile: null,
      error: 'Your account profile could not be found. Please contact the administrator.',
    };
  }

  // Step 3: Check account is active
  if (!isActive(profile)) {
    await signOut(); // Deactivated accounts cannot access the system
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
 *
 * WHY write the audit log before signing out?
 * After signOut(), auth.uid() returns null.
 * The RLS policy on audit_logs requires user_id = auth.uid().
 * If we sign out first, the INSERT would be rejected by RLS.
 *
 * @param {Object} profile - The current user's profile
 * @returns {Promise<{ error: string|null }>}
 */
export async function logout(profile) {
  // Write log FIRST — while still authenticated
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
 *
 * WHY: Supabase error messages are designed for developers, not users.
 * "Invalid login credentials" is acceptable. But some errors are more
 * technical and confusing. We intercept and translate them here.
 *
 * @param {string} message - The error message from Supabase Auth
 * @returns {string} - A user-friendly error message
 */
function mapAuthError(message) {
  if (!message) return 'An unexpected error occurred. Please try again.';

  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials') || lower.includes('invalid email or password')) {
    return 'Incorrect email or password. Please try again.';
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

  // Fallback: show the original message from Supabase
  return message;
}
