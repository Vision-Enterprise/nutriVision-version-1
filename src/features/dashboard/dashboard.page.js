/**
 * Dashboard Page
 *
 * Phase 3: Placeholder only.
 * Full implementation in Phase 4.
 *
 * Will contain:
 *   - Summary stat cards (total commodities, total batches, near-expiry count, expired count)
 *   - Expiration status breakdown chart
 *   - Recent audit activity
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
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
      </div>
      <h2 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-text); margin-bottom: var(--space-2);">
        Phase 3 Complete
      </h2>
      <p style="font-size: var(--font-size-sm); color: var(--color-text-muted); max-width: 320px; margin: 0 auto;">
        The application shell is working. Dashboard summary cards and charts will be built in Phase 4.
      </p>
    </div>
  `;
}
