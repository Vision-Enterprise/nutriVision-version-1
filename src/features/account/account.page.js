/**
 * Account Settings Page
 *
 * Phase 3: Placeholder only.
 * Full implementation in Phase 9.
 *
 * Will contain:
 *   - Profile form (update full name)
 *   - Change password form
 *   - Role display (read-only)
 *   - Account status display
 */

export function renderAccountPage(profile) {
  const content = document.getElementById('page-content');
  if (!content) return;

  content.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Account Settings</h1>
      <p class="page-header__subtitle">
        Manage your profile and password
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
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <h2 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-text); margin-bottom: var(--space-2);">
        Coming in Phase 9
      </h2>
      <p style="font-size: var(--font-size-sm); color: var(--color-text-muted); max-width: 320px; margin: 0 auto;">
        Profile editing and password management will be built in Phase 9.
      </p>
    </div>
  `;
}
