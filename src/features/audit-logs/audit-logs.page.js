/**
 * Audit Logs Page
 *
 * Phase 3: Placeholder only.
 * Full implementation in Phase 8.
 * Accessible to administrators only — enforced by the router guard.
 *
 * Will contain:
 *   - Audit log table (who, action, entity, when)
 *   - Date range filter
 *   - Action type filter
 *   - User filter (admin only sees all)
 *   - Pagination
 */

export function renderAuditLogsPage(profile) {
  const content = document.getElementById('page-content');
  if (!content) return;

  content.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Audit Logs</h1>
      <p class="page-header__subtitle">
        Complete history of system activity
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
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      </div>
      <h2 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-text); margin-bottom: var(--space-2);">
        Coming in Phase 8
      </h2>
      <p style="font-size: var(--font-size-sm); color: var(--color-text-muted); max-width: 320px; margin: 0 auto;">
        Activity history, filters, and pagination will be built in Phase 8.
      </p>
    </div>
  `;
}
