/**
 * Commodities Page
 *
 * Phase 3: Placeholder only.
 * Full implementation in Phase 5.
 *
 * Will contain:
 *   - Commodity list table with search and filter
 *   - Add Commodity modal form
 *   - Batch management per commodity
 *   - Expiration status badges
 *   - Soft delete (archive) commodity action
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
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        </svg>
      </div>
      <h2 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-text); margin-bottom: var(--space-2);">
        Coming in Phase 5
      </h2>
      <p style="font-size: var(--font-size-sm); color: var(--color-text-muted); max-width: 320px; margin: 0 auto;">
        Commodity registration, batch management, and expiration tracking will be built in Phase 5.
      </p>
    </div>
  `;
}
