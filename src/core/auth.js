/**
 * Authentication Core Module
 *
 * This module wraps Supabase Auth methods and provides a clean
 * interface for the rest of the application.
 *
 * WHY wrap Supabase instead of calling it directly?
 * If we call supabase.auth.signInWithPassword() in 5 different places,
 * and Supabase changes its API, we update 5 places.
 * With this wrapper, we update ONE place and every caller is fixed.
 *
 * WHAT this module does NOT do:
 * - Business logic (that's in auth.service.js)
 * - UI (that's in auth.page.js)
 * - Role checks (that's in permissions.js)
 * This module only talks to Supabase Auth.
 */

import { supabase } from './supabase.js';

/**
 * Sign in with email and password.
 *
 * Returns the Supabase response object which contains:
 *   data.user    — the authenticated user
 *   data.session — the session token
 *   error        — any error that occurred
 *
 * WHY async/await?
 * Supabase network calls are asynchronous — they take time to complete.
 * async/await lets us write asynchronous code that reads like synchronous
 * code. Without it, we'd use callbacks or promise chains (.then().catch())
 * which are harder to follow.
 */
export async function signIn(email, password) {
  return await supabase.auth.signInWithPassword({ email, password });
}

/**
 * Sign out the current user.
 * Clears the local session and invalidates the token with Supabase.
 */
export async function signOut() {
  return await supabase.auth.signOut();
}

/**
 * Get the current session.
 *
 * Returns { data: { session }, error }
 * session is null if the user is not logged in.
 *
 * WHY call this on page load?
 * Supabase stores the session in localStorage after login.
 * When the user refreshes the page, we call getSession() to restore
 * their authentication state — they don't have to log in again.
 */
export async function getSession() {
  return await supabase.auth.getSession();
}

/**
 * Subscribe to authentication state changes.
 *
 * callback receives (event, session) whenever:
 *   - User logs in   → event = 'SIGNED_IN'
 *   - User logs out  → event = 'SIGNED_OUT'
 *   - Token refreshes → event = 'TOKEN_REFRESHED'
 *
 * WHY listen to auth state changes instead of just checking once?
 * Sessions expire. Supabase automatically refreshes tokens in the
 * background. If the token refresh fails (network issue), the user
 * gets signed out. This listener detects that and redirects to login
 * automatically — without waiting for the next user action to fail.
 *
 * Returns an unsubscribe function. Call it when the component is removed
 * to prevent memory leaks.
 */
export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange(callback);
  return data.subscription;
}
