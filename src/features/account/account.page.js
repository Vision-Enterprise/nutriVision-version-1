/**
 * Account Settings Page
 * Full implementation: Phase 9
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

    <div class="empty-state">
      <div class="empty-state__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <h2 class="empty-state__title">Account settings</h2>
      <p class="empty-state__description">
        Profile and password management options will be available here.
      </p>
    </div>
  `;
}
