/**
 * User Management Page
 *
 * Phase 3: Placeholder only.
 * Full implementation in Phase 7.
 * Accessible to administrators only — enforced by the router guard.
 *
 * Will contain:
 *   - User list table (name, role, status, last login)
 *   - Create User modal (admin only)
 *   - Activate / Deactivate user actions
 *   - Role badge display
 */

export function renderUsersPage(profile) {
  const content = document.getElementById('page-content');
  if (!content) return;

  content.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">User Management</h1>
      <p class="page-header__subtitle">
        Create and manage NutriVision user accounts
      </p>
    </div>

    <div class="card" style="text-align: center; padding: var(--space-16);">
      <div style="
        width: 56px;
        height: 56px;
        background-color: var(--color-primary-bg);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto var(--space-4);
        color: var(--color-primary);
      " aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <h2 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-text); margin-bottom: var(--space-2);">
        Coming in Phase 7
      </h2>
      <p style="font-size: var(--font-size-sm); color: var(--color-text-muted); max-width: 320px; margin: 0 auto;">
        User creation, role assignment, and account activation will be built in Phase 7.
      </p>
    </div>
  `;
}
