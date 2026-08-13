/**
 * Commodities Page
 * Full implementation: Phase 5
 */

export function renderCommoditiesPage(profile) {
  const content = document.getElementById('page-content');
  if (!content) return;

  content.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Commodity Management</h1>
      <p class="page-header__subtitle">
        Register and manage nutrition commodities and their batches
      </p>
    </div>

    <div class="empty-state">
      <div class="empty-state__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        </svg>
      </div>
      <h2 class="empty-state__title">No commodities registered</h2>
      <p class="empty-state__description">
        No nutrition commodities have been added yet. Add a commodity to get started.
      </p>
    </div>
  `;
}
