/**
 * User Management Page
 * Full implementation: Phase 7
 * Administrator only.
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

    <div class="empty-state">
      <div class="empty-state__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <h2 class="empty-state__title">No users found</h2>
      <p class="empty-state__description">
        No additional user accounts have been created yet.
      </p>
    </div>
  `;
}
