/**
 * NutriVision — Application Entry Point
 *
 * This file is the first thing Vite loads.
 *
 * RESPONSIBILITIES (Phase 2):
 * 1. Import all global CSS
 * 2. Check if the user has an existing session (returning visitor)
 * 3. If yes  → fetch profile → show the authenticated placeholder
 * 4. If no   → show the login page
 * 5. Listen for auth state changes (logout, session expiry)
 *
 * PHASE 3 will replace renderAuthenticatedPlaceholder() with the
 * full application shell (sidebar, header, router).
 *
 * IMPORT ORDER MATTERS for CSS:
 * variables.css must load before anything that uses var(--...) tokens.
 * global.css imports variables.css itself, so we only need to import
 * global.css here and the cascade handles the rest.
 */

import './styles/global.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/auth.css';

import { getSession, onAuthStateChange } from './core/auth.js';
import { fetchProfile, logout }          from './features/auth/auth.service.js';
import { renderLoginPage }               from './features/auth/auth.page.js';
import { getRoleLabel }                  from './core/permissions.js';
import { APP_NAME, APP_ORGANIZATION }    from './shared/constants/app.constants.js';

// ── Application State ──────────────────────────────────────────────
// currentProfile holds the signed-in user's profile.
// null = nobody is signed in.
let currentProfile = null;

// ── Boot the Application ───────────────────────────────────────────
initApp();

async function initApp() {
  // Show a loading screen while we check for an existing session.
  // This prevents a flash of the login page for already-logged-in users.
  renderLoading();

  // Check if the user already has a valid session from a previous visit.
  // Supabase stores the session in localStorage automatically.
  const { data: { session }, error: sessionError } = await getSession();

  if (sessionError || !session) {
    // No session — show the login page
    renderLoginPage(handleLoginSuccess);
    return;
  }

  // Session exists — restore the user's profile
  const { profile, error: profileError } = await fetchProfile(session.user.id);

  if (profileError || !profile || !profile.is_active) {
    // Profile missing or account deactivated — force to login
    renderLoginPage(handleLoginSuccess);
    return;
  }

  // All good — restore authenticated state
  currentProfile = profile;
  renderAuthenticatedPlaceholder(profile);
}

// ── Auth State Listener ────────────────────────────────────────────
// Listens for auth events AFTER the initial load.
// Handles:
//   - SIGNED_OUT   → show login page (user clicked logout, or session expired)
//   - TOKEN_REFRESHED → no UI change needed (Supabase refreshed silently)
//
// WHY use onAuthStateChange in addition to getSession()?
// getSession() is a one-time check at startup.
// onAuthStateChange handles ongoing events while the app is running.
// If a session expires in the background, this fires SIGNED_OUT
// and we redirect to login automatically — without requiring user action.
onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    currentProfile = null;
    renderLoginPage(handleLoginSuccess);
  }
});

// ── Callbacks ──────────────────────────────────────────────────────

/**
 * Called by auth.page.js after a successful login.
 * Receives the authenticated user's profile.
 */
function handleLoginSuccess(profile) {
  currentProfile = profile;
  renderAuthenticatedPlaceholder(profile);
}

// ── Render Functions ───────────────────────────────────────────────

/**
 * Full-screen loading indicator.
 * Shown briefly while we check for an existing session on page load.
 */
function renderLoading() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div style="
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--color-background);
    " role="status" aria-label="Loading">
      <div style="text-align: center;">
        <div class="spinner" style="
          width: 32px;
          height: 32px;
          margin: 0 auto var(--space-4);
        " aria-hidden="true"></div>
        <p style="font-size: var(--font-size-sm); color: var(--color-text-subtle);">
          Loading ${APP_NAME}...
        </p>
      </div>
    </div>
  `;
}

/**
 * Temporary post-login placeholder.
 *
 * WHY this exists:
 * Phase 2 only builds authentication. The full application shell
 * (sidebar, navigation, dashboard) is built in Phase 3.
 * This placeholder confirms that login works correctly and shows
 * the user's profile data from the database.
 *
 * This function will be REPLACED in Phase 3 by the router + shell.
 *
 * @param {Object} profile - The logged-in user's profile
 */
function renderAuthenticatedPlaceholder(profile) {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="auth-success-placeholder">
      <div class="auth-success-card">

        <div class="auth-success-card__icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>

        <h1 class="auth-success-card__title">Login Successful</h1>

        <p class="auth-success-card__meta">
          <strong>${profile.full_name}</strong>
        </p>
        <p class="auth-success-card__meta" style="margin-bottom: var(--space-5);">
          ${getRoleLabel(profile)}
        </p>

        <div style="
          background-color: var(--color-primary-bg);
          border-radius: var(--radius-lg);
          padding: var(--space-3) var(--space-4);
          margin-bottom: var(--space-6);
        ">
          <p style="font-size: var(--font-size-xs); color: var(--color-primary); font-weight: var(--font-weight-semibold);">
            Phase 2 complete — Authentication is working.
          </p>
          <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: var(--space-1);">
            The full application shell will be built in Phase 3.
          </p>
        </div>

        <button
          id="logout-btn"
          class="btn btn-secondary btn-full"
          type="button"
        >
          Sign Out
        </button>

      </div>
    </div>
  `;

  document.getElementById('logout-btn').addEventListener('click', handleLogout);
}

/**
 * Handles the logout button click.
 */
async function handleLogout() {
  const btn = document.getElementById('logout-btn');
  if (btn) {
    btn.textContent = 'Signing out...';
    btn.disabled = true;
  }

  await logout(currentProfile);
  // onAuthStateChange will fire SIGNED_OUT and call renderLoginPage()
}
