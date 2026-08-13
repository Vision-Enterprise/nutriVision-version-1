/**
 * Dashboard Page
 * Full implementation: Phase 4
 */

export function renderDashboardPage(profile) {
  const content = document.getElementById('page-content');
  if (!content) return;

  content.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Dashboard</h1>
      <p class="page-header__subtitle">
        Overview of nutrition commodity inventory status
      </p>
    </div>

    <div class="empty-state">
      <div class="empty-state__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
      </div>
      <h2 class="empty-state__title">No data to display yet</h2>
      <p class="empty-state__description">
        Add commodities and batches to start seeing inventory summaries here.
      </p>
    </div>
  `;
}

