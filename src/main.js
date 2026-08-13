/**
 * NutriVision — Application Entry Point
 *
 * This file is the first thing Vite loads.
 *
 * RESPONSIBILITIES (Phase 3):
 * 1. Import all global CSS
 * 2. Check if the user has an existing session (returning visitor)
 * 3. If yes  → fetch profile → render the application shell
 * 4. If no   → show the login page
 * 5. Listen for auth state changes (logout, session expiry)
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
import { fetchProfile }                  from './features/auth/auth.service.js';
import { renderLoginPage }               from './features/auth/auth.page.js';
import { renderShell }                   from './shared/components/shell.component.js';
import { APP_NAME }                      from './shared/constants/app.constants.js';

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
  renderShell(profile, handleLogoutComplete);
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
  renderShell(profile, handleLogoutComplete);
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
 * Called after the user successfully logs out.
 * Re-shows the login page.
 */
function handleLogoutComplete() {
  currentProfile = null;
  renderLoginPage(handleLoginSuccess);
}
