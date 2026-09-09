/**
 * Bulk Release - Render (Pure HTML Templates)
 *
 * All HTML for the Bulk Release full-screen workspace.
 * Zero side-effects, no DB calls — pure render functions only.
 */

import { getExpirationStatus, getDaysRemaining } from '../../shared/utils/date.utils.js';
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

/**
 * Full-screen Bulk Release workspace shell.
 */
export function renderBulkReleaseShell() {
  const today = new Date().toISOString().split('T')[0];
  return `
    <div class="bulk-release-workspace" id="bulk-release-workspace" role="dialog"
         aria-modal="true" aria-label="Bulk Release Manifest">

      <!-- Top Bar -->
      <div class="bulk-release-topbar">
        <div class="bulk-release-topbar__info">
          <h1 class="bulk-release-topbar__title">Bulk Release</h1>
          <p class="bulk-release-topbar__sub">Select multiple batches to distribute to a single destination.</p>
        </div>
        <button id="bulk-release-back-btn" class="btn btn-secondary" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Batches
        </button>
      </div>

      <!-- Split Panel Layout -->
      <div class="bulk-release-body">

        <!-- LEFT: Batch Selector -->
        <section class="bulk-release-panel bulk-release-panel--left" aria-label="Batch selector">
          <div class="bulk-release-panel__header">
            <div style="display:flex; align-items:center; gap:var(--space-2);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round"
                   stroke-linejoin="round" aria-hidden="true">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              </svg>
              <span class="bulk-release-panel__title">Select Available Batches</span>
            </div>
            <span class="bulk-release-stock-note">Showing active stock only</span>
          </div>

          <!-- Filters -->
          <div class="bulk-release-filters">
            <select id="bulk-filter-commodity" class="form-input" style="flex:1; min-width:140px;" aria-label="Filter by commodity">
              <option value="all">All Commodities</option>
            </select>
            <select id="bulk-filter-sort" class="form-input" style="flex:1; min-width:160px;" aria-label="Sort order">
              <option value="fefo">FEFO Sort (Expiring First)</option>
              <option value="name">Sort by Commodity Name</option>
              <option value="qty-desc">Sort by Qty (High→Low)</option>
              <option value="qty-asc">Sort by Qty (Low→High)</option>
            </select>
          </div>

          <!-- Batch Table -->
          <div class="table-wrapper" id="bulk-batch-table-region" style="flex:1; overflow-y:auto; min-height:0;">
            <div style="padding:var(--space-8); text-align:center; color:var(--color-text-muted);">
              <div class="spinner" style="width:28px;height:28px;margin:0 auto var(--space-3);"></div>
              <p style="font-size:var(--font-size-sm);">Loading available stock…</p>
            </div>
          </div>
        </section>

        <!-- RIGHT: Dispatch Cart + Destination Form -->
        <section class="bulk-release-panel bulk-release-panel--right" aria-label="Dispatch details">

          <!-- Cart Header -->
          <div class="bulk-release-panel__header">
            <div style="display:flex; align-items:center; gap:var(--space-2);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round"
                   stroke-linejoin="round" aria-hidden="true">
                <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              <span class="bulk-release-panel__title">Dispatch Cart</span>
            </div>
            <span id="bulk-cart-count" class="bulk-release-cart-badge" style="display:none;">0 Selected</span>
          </div>

          <!-- Cart Items Region -->
          <div id="bulk-cart-items" class="bulk-release-cart" aria-live="polite" aria-label="Selected batches">
            <div class="bulk-release-cart__empty" id="bulk-cart-empty">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                   stroke-linejoin="round" style="opacity:0.35; margin-bottom:var(--space-2);">
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              <p style="font-size:var(--font-size-sm); color:var(--color-text-muted);">
                Check batches on the left to add them here.
              </p>
            </div>
          </div>

          <!-- Destination Form -->
          <div class="bulk-release-destination">
            <div class="form-group">
              <label class="form-label form-label--required" for="bulk-barangay">
                DESTINATION <span style="color:var(--color-text-muted); font-weight:normal;">(BARANGAY/LGU)</span>
              </label>
              <select id="bulk-barangay" name="barangay" class="form-input" required>
                <option value="">Select Destination…</option>
              </select>
              <span class="form-error" id="err-barangay" role="alert"></span>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-3);">
              <div class="form-group">
                <label class="form-label form-label--required" for="bulk-release-date">RELEASE DATE</label>
                <input type="date" id="bulk-release-date" name="release_date"
                       class="form-input" value="${today}" required />
                <span class="form-error" id="err-release-date" role="alert"></span>
              </div>
              <div class="form-group">
                <label class="form-label form-label--required" for="bulk-recipient">RECEIVED BY</label>
                <input type="text" id="bulk-recipient" name="recipient_name"
                       class="form-input" placeholder="Name of signatory" required />
                <span class="form-error" id="err-recipient" role="alert"></span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="bulk-notes">PURPOSE / REMARKS</label>
              <input type="text" id="bulk-notes" name="notes"
                     class="form-input"
                     placeholder="e.g., Monthly Allocation, Relief Operations" />
            </div>
          </div>

          <!-- Error Alert -->
          <div id="bulk-release-error-alert" class="alert alert-error" style="display:none; margin:0 var(--space-4);" role="alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span id="bulk-release-error-msg"></span>
          </div>

          <!-- Confirm Button -->
          <div class="bulk-release-action-bar">
            <button id="bulk-confirm-btn" class="btn btn-primary btn-lg btn-full" type="button" disabled>
              <svg id="bulk-confirm-spinner" class="spinner" viewBox="0 0 24 24"
                   style="display:none; width:18px; height:18px;" aria-hidden="true">
                <circle class="path" cx="12" cy="12" r="10" fill="none" stroke-width="3"></circle>
              </svg>
              <svg id="bulk-confirm-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
                   stroke-linejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span id="bulk-confirm-text">Confirm &amp; Release Stock</span>
            </button>
          </div>

        </section>
      </div>
    </div>
  `;
}

/**
 * Render the batch selector table rows.
 * @param {Array} batches - Filtered + sorted batch list
 * @param {Set<string>} selectedIds - Currently checked batch IDs
 */
export function renderBatchSelectorTable(batches, selectedIds = new Set()) {
  if (batches.length === 0) {
    return `
      <div style="padding:var(--space-10) var(--space-6); text-align:center; color:var(--color-text-muted);">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
             style="opacity:0.35; margin:0 auto var(--space-3); display:block;">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        </svg>
        <p style="font-size:var(--font-size-sm);">No batches match your filter.</p>
      </div>`;
  }

  return `
    <table class="table" style="min-width:0;">
      <thead>
        <tr>
          <th style="width:40px;"></th>
          <th>BATCH #</th>
          <th>COMMODITY</th>
          <th>AVAILABLE QTY</th>
          <th>STATUS (EXPIRY)</th>
        </tr>
      </thead>
      <tbody>
        ${batches.map(b => {
          const status  = getExpirationStatus(b.expiration_date);
          const days    = getDaysRemaining(b.expiration_date);
          const expired = days <= 0;
          const daysStr = expired ? `${Math.abs(days)}d ago` : `${days}d`;
          const checked = selectedIds.has(b.id);
          const disabled = expired || b.quantity <= 0;

          return `
            <tr class="bulk-batch-row${disabled ? ' bulk-batch-row--disabled' : ''}"
                data-batch-id="${b.id}" style="${disabled ? 'opacity:0.5;' : 'cursor:pointer;'}">
              <td>
                <input type="checkbox"
                       class="bulk-batch-check"
                       data-batch-id="${b.id}"
                       id="chk-${b.id}"
                       ${checked  ? 'checked'   : ''}
                       ${disabled ? 'disabled'  : ''}
                       aria-label="Select batch ${escapeHtml(b.batch_number)}" />
              </td>
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
              <td style="font-weight:var(--font-weight-medium);">
                ${b.quantity <= 0 ? '<em style="color:var(--color-text-muted);">0</em>' : b.quantity.toLocaleString()}
              </td>
              <td>
                <span class="badge ${statusBadgeClass(status)}">${status}</span>
                <br>
                <span style="font-size:var(--font-size-xs); color:var(--color-text-muted);">
                  ${expired ? daysStr : daysStr}
                </span>
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

/**
 * Render a single cart item row.
 * @param {Object} batch
 * @param {number} qty - Quantity currently entered for this batch
 */
export function renderCartItem(batch, qty = 1) {
  const unit = escapeHtml(batch.commodities?.unit ?? '');
  return `
    <div class="bulk-cart-item" id="cart-item-${batch.id}" data-batch-id="${batch.id}">
      <div class="bulk-cart-item__info">
        <span class="bulk-cart-item__name">${escapeHtml(batch.commodities?.name ?? '—')}</span>
        <span class="bulk-cart-item__code">${escapeHtml(batch.batch_number)}</span>
      </div>
      <div class="bulk-cart-item__controls">
        <input type="number"
               class="form-input bulk-cart-qty"
               id="cart-qty-${batch.id}"
               data-batch-id="${batch.id}"
               data-max="${batch.quantity}"
               value="${Math.min(qty, batch.quantity)}"
               min="1"
               max="${batch.quantity}"
               aria-label="Quantity for ${escapeHtml(batch.batch_number)}"
               style="width:80px; text-align:center;" />
        <span class="bulk-cart-item__max">/ ${batch.quantity.toLocaleString()} ${unit}</span>
        <button class="btn btn-ghost btn-sm bulk-cart-remove"
                data-batch-id="${batch.id}"
                type="button"
                aria-label="Remove ${escapeHtml(batch.batch_number)} from cart"
                style="color:var(--color-danger); padding:var(--space-1);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>`;
}

/**
 * Render a success result summary.
 * @param {Array} results
 * @param {Array} errors
 * @param {string} barangay
 */
export function renderSuccessSummary(results, errors, barangay) {
  return `
    <div class="bulk-release-success" role="status" aria-live="polite">
      <div class="bulk-release-success__icon" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      </div>
      <h2 class="bulk-release-success__title">Release Successful!</h2>
      <p class="bulk-release-success__sub">
        ${results.length} batch${results.length !== 1 ? 'es' : ''} dispatched to <strong>${escapeHtml(barangay)}</strong>.
      </p>
      ${errors.length > 0 ? `
        <div class="alert alert-warning" style="margin:var(--space-4) 0; text-align:left;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <div>
            <strong>${errors.length} batch${errors.length !== 1 ? 'es' : ''} had errors:</strong>
            <ul style="margin:var(--space-2) 0 0 var(--space-4); padding:0;">
              ${errors.map(e => `<li style="font-size:var(--font-size-sm);">${escapeHtml(e.batchNumber)}: ${escapeHtml(e.reason)}</li>`).join('')}
            </ul>
          </div>
        </div>` : ''}
      <button id="bulk-release-back-after-success" class="btn btn-primary" type="button">
        Back to Batches
      </button>
    </div>`;
}
