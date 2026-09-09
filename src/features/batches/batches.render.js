/**
 * Batch Management - View (Render)
 *
 * Pure HTML rendering functions for the Batches feature.
 * Zero database calls or mutation logic.
 */

import { formatDate, getExpirationStatus, getDaysRemaining } from '../../shared/utils/date.utils.js';
import { EXPIRATION_STATUS } from '../../shared/constants/app.constants.js';

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function statusBadgeClass(status) {
  const map = {
    [EXPIRATION_STATUS.GOOD]:        'badge-good',
    [EXPIRATION_STATUS.MODERATE]:    'badge-moderate',
    [EXPIRATION_STATUS.NEAR_EXPIRY]: 'badge-near-expiry',
    [EXPIRATION_STATUS.EXPIRED]:     'badge-expired',
  };
  return map[status] ?? '';
}

export function renderBatchesLayout({ batches, commodities, filtered, filterComm, filterStatus }) {
  return `
    <!-- Header row -->
    <div style="display:flex; align-items:flex-start; justify-content:space-between;
                gap:var(--space-4); flex-wrap:wrap; margin-bottom:var(--space-6);">
      <div>
        <h1 class="page-header__title">Batch Management</h1>
        <p class="page-header__subtitle">
          ${batches.length} batch${batches.length !== 1 ? 'es' : ''} on record
        </p>
      </div>
      <div style="display:flex; gap:var(--space-3); align-items:center; flex-wrap:wrap;">
        <button id="bulk-release-btn" class="btn btn-bulk-release" type="button"
                aria-label="Open Bulk Release Manifest">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          Bulk Release
        </button>
        <button id="add-batch-btn" class="btn btn-primary" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Batch
        </button>
      </div>
    </div>

    <!-- Expiry Legend -->
    <div style="display:flex; flex-wrap:wrap; gap:var(--space-3); margin-bottom:var(--space-4); font-size: var(--font-size-sm); color: var(--color-text-muted); background: var(--color-surface); padding: var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--color-border); align-items: center;">
      <strong style="color: var(--color-text); margin-right: var(--space-2);">Expiration Guide:</strong>
      <div style="display: flex; align-items: center; gap: var(--space-1);"><span class="badge badge-good" style="margin:0;">Good</span> > 6 Months</div>
      <div style="display: flex; align-items: center; gap: var(--space-1);"><span class="badge badge-moderate" style="margin:0;">Moderate</span> 3-6 Months</div>
      <div style="display: flex; align-items: center; gap: var(--space-1);"><span class="badge badge-near-expiry" style="margin:0;">Near Expiry</span> 0-3 Months</div>
      <div style="display: flex; align-items: center; gap: var(--space-1);"><span class="badge badge-expired" style="margin:0;">Expired</span> < 0 Days</div>
    </div>

    <!-- Filters -->
    <div style="display:flex; gap:var(--space-3); margin-bottom:var(--space-4); flex-wrap:wrap;">
      <select id="filter-commodity" class="form-input" style="max-width:260px;"
              aria-label="Filter by commodity">
        <option value="all">All Commodities</option>
        ${commodities.map(c =>
          `<option value="${c.id}" ${filterComm === c.id ? 'selected' : ''}>
            ${escapeHtml(c.name)}
          </option>`
        ).join('')}
      </select>

      <select id="filter-status" class="form-input" style="max-width:180px;"
              aria-label="Filter by status">
        <option value="all">All Statuses</option>
        <option value="${EXPIRATION_STATUS.GOOD}"       ${filterStatus === EXPIRATION_STATUS.GOOD       ? 'selected' : ''}>Good</option>
        <option value="${EXPIRATION_STATUS.MODERATE}"   ${filterStatus === EXPIRATION_STATUS.MODERATE   ? 'selected' : ''}>Moderate</option>
        <option value="${EXPIRATION_STATUS.NEAR_EXPIRY}"${filterStatus === EXPIRATION_STATUS.NEAR_EXPIRY? 'selected' : ''}>Near Expiry</option>
        <option value="${EXPIRATION_STATUS.EXPIRED}"    ${filterStatus === EXPIRATION_STATUS.EXPIRED    ? 'selected' : ''}>Expired</option>
      </select>
    </div>

    ${filterComm !== 'all' || filterStatus !== 'all' ? `
      <p style="font-size:var(--font-size-sm); color:var(--color-text-muted);
                margin-bottom:var(--space-3);">
        Showing ${filtered.length} of ${batches.length} batches
      </p>` : ''}

    <!-- Table region -->
    <div id="batch-table-region">
      ${filtered.length === 0 ? renderEmpty(Boolean(filterComm !== 'all' || filterStatus !== 'all')) : renderTable(filtered)}
    </div>
  `;
}

export function renderTable(batches) {
  return `
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Batch #</th>
            <th>Commodity</th>
            <th>Quantity</th>
            <th>Delivered</th>
            <th>Expires</th>
            <th>Status</th>
            <th style="text-align:right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${batches.map(b => {
            const status  = getExpirationStatus(b.expiration_date);
            const days    = getDaysRemaining(b.expiration_date);
            const daysStr = days <= 0
              ? `${Math.abs(days)}d ago`
              : `in ${days}d`;

            return `
              <tr class="batch-row" data-batch-id="${b.id}" style="cursor: pointer;" title="Click to view notes">
                <td>
                  <code style="font-size:var(--font-size-xs);
                               background:var(--color-surface-alt);
                               color:var(--color-primary);
                               padding:2px 8px;
                               border-radius:var(--radius-sm);
                               font-weight:var(--font-weight-medium);
                               letter-spacing:0.05em;">
                    ${escapeHtml(b.batch_number)}
                  </code>
                </td>
                <td>
                  <span style="font-weight:var(--font-weight-medium);">
                    ${escapeHtml(b.commodities?.name ?? '—')}
                  </span>
                  <br>
                  <span style="font-size:var(--font-size-xs); color:var(--color-text-muted);">
                    ${escapeHtml(b.commodities?.commodity_code ?? '')}
                  </span>
                </td>
                <td>${b.quantity.toLocaleString()} ${escapeHtml(b.commodities?.unit ?? '')}</td>
                <td style="color:var(--color-text-muted); font-size:var(--font-size-sm);">
                  ${formatDate(b.delivery_date)}
                </td>
                <td>
                  <span style="font-size:var(--font-size-sm);">${formatDate(b.expiration_date)}</span>
                  <br>
                  <span style="font-size:var(--font-size-xs); color:var(--color-text-muted);">
                    ${daysStr}
                  </span>
                </td>
                <td>
                  <span class="badge ${statusBadgeClass(status)}">${status}</span>
                </td>
                <td style="text-align:right; white-space:nowrap;">
                  ${b.quantity > 0 ? `<button class="btn btn-ghost btn-sm release-batch-btn"
                          data-id="${b.id}" type="button"
                          style="color: var(--color-primary);"
                          aria-label="Release batch ${escapeHtml(b.batch_number)}">Release</button>` : ''}
                  <button class="btn btn-ghost btn-sm edit-batch-btn"
                          data-id="${b.id}" type="button"
                          aria-label="Edit batch ${escapeHtml(b.batch_number)}">Edit</button>
                  <button class="btn btn-ghost btn-sm delete-batch-btn"
                          data-id="${b.id}" type="button"
                          style="color:var(--color-danger);"
                          aria-label="Delete batch ${escapeHtml(b.batch_number)}">Delete</button>
                </td>
              </tr>
              <tr class="batch-desc-row" id="desc-${b.id}" style="display: none; background: var(--color-surface-alt);">
                <td colspan="7" style="padding: var(--space-3) var(--space-4); border-top: 1px solid var(--color-border-subtle); border-bottom: 1px solid var(--color-border-subtle);">
                  <div style="display: flex; gap: var(--space-2); align-items: flex-start;">
                    <span class="icon icon--sm" style="color: var(--color-text-muted); margin-top: 2px;">info</span>
                    <div style="font-size: var(--font-size-sm); color: var(--color-text-muted); line-height: 1.5; white-space: pre-wrap;">
                      ${b.notes ? escapeHtml(b.notes) : '<em>No notes provided.</em>'}
                    </div>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function renderEmpty(hasFilters = false) {
  return `
    <div style="text-align:center; padding:var(--space-16) var(--space-8);
                color:var(--color-text-muted);">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="1.5"
           stroke-linecap="round" stroke-linejoin="round"
           style="margin:0 auto var(--space-4); display:block; opacity:0.4;">
        <rect x="1" y="3" width="15" height="13"></rect>
        <polygon points="16 8 20 8 23 11 23 16 16 16 8"></polygon>
        <circle cx="5.5" cy="18.5" r="2.5"></circle>
        <circle cx="18.5" cy="18.5" r="2.5"></circle>
      </svg>
      <p style="font-size:var(--font-size-base); font-weight:var(--font-weight-medium);
                margin-bottom:var(--space-1);">
        ${hasFilters ? 'No matching batches' : 'No batches yet'}
      </p>
      <p style="font-size:var(--font-size-sm);">
        ${hasFilters
          ? 'Try adjusting your filters.'
          : 'Click "Add Batch" to record the first delivery.'}
      </p>
    </div>
  `;
}

export function renderErrorAlert(message) {
  return `
    <div class="alert alert-error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
}
