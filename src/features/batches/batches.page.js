/**
 * Batch Management Page
 *
 * Features:
 *   - Table of all active batches sorted by expiration date (soonest first)
 *   - Expiration status badge (Good / Moderate / Near Expiry / Expired)
 *   - Filter by commodity and by expiration status
 *   - Add modal (create batch)
 *   - Edit modal (update batch)
 *   - Soft-delete with confirmation
 */

import {
  fetchBatches,
  fetchActiveCommodities,
  createBatch,
  updateBatch,
  deleteBatch,
  releaseBatch,
} from './batches.service.js';
import { formatDate, getExpirationStatus, getDaysRemaining } from '../../shared/utils/date.utils.js';
import { EXPIRATION_STATUS, BARANGAYS } from '../../shared/constants/app.constants.js';

// ── Page-level state ──────────────────────────────────────────────────────────

let _batches      = [];
let _commodities  = [];   // for the dropdown
let _profile      = null;
let _filterComm   = 'all';
let _filterStatus = 'all';

// ── Entry point ───────────────────────────────────────────────────────────────

export async function renderBatchesPage(profile) {
  _profile      = profile;
  _filterComm   = 'all';
  _filterStatus = 'all';

  const content = document.getElementById('page-content');
  if (!content) return;

  content.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Batch Management</h1>
      <p class="page-header__subtitle">Track commodity deliveries and expiration dates</p>
    </div>
    <div class="loading-overlay"><div class="spinner spinner-lg"></div></div>
  `;

  const [batchRes, commRes] = await Promise.all([
    fetchBatches(),
    fetchActiveCommodities(),
  ]);

  if (batchRes.error) {
    content.innerHTML = `
      <div class="page-header">
        <h1 class="page-header__title">Batch Management</h1>
        <p class="page-header__subtitle">Track commodity deliveries and expiration dates</p>
      </div>
      ${_errorAlert(batchRes.error)}
    `;
    return;
  }

  _batches     = batchRes.batches;
  _commodities = commRes.commodities;

  _renderPage(content);
}

// ── Render helpers ────────────────────────────────────────────────────────────

function _renderPage(content) {
  const filtered = _applyFilters();

  content.innerHTML = `
    <!-- Header row -->
    <div style="display:flex; align-items:flex-start; justify-content:space-between;
                gap:var(--space-4); flex-wrap:wrap; margin-bottom:var(--space-6);">
      <div>
        <h1 class="page-header__title">Batch Management</h1>
        <p class="page-header__subtitle">
          ${_batches.length} batch${_batches.length !== 1 ? 'es' : ''} on record
        </p>
      </div>
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

    <!-- Filters -->
    <div style="display:flex; gap:var(--space-3); margin-bottom:var(--space-4); flex-wrap:wrap;">
      <select id="filter-commodity" class="form-input" style="max-width:260px;"
              aria-label="Filter by commodity">
        <option value="all">All Commodities</option>
        ${_commodities.map(c =>
          `<option value="${c.id}" ${_filterComm === c.id ? 'selected' : ''}>
            ${_escHtml(c.name)}
          </option>`
        ).join('')}
      </select>

      <select id="filter-status" class="form-input" style="max-width:180px;"
              aria-label="Filter by status">
        <option value="all">All Statuses</option>
        <option value="${EXPIRATION_STATUS.GOOD}"       ${_filterStatus === EXPIRATION_STATUS.GOOD       ? 'selected' : ''}>Good</option>
        <option value="${EXPIRATION_STATUS.MODERATE}"   ${_filterStatus === EXPIRATION_STATUS.MODERATE   ? 'selected' : ''}>Moderate</option>
        <option value="${EXPIRATION_STATUS.NEAR_EXPIRY}"${_filterStatus === EXPIRATION_STATUS.NEAR_EXPIRY? 'selected' : ''}>Near Expiry</option>
        <option value="${EXPIRATION_STATUS.EXPIRED}"    ${_filterStatus === EXPIRATION_STATUS.EXPIRED    ? 'selected' : ''}>Expired</option>
      </select>
    </div>

    ${_filterComm !== 'all' || _filterStatus !== 'all' ? `
      <p style="font-size:var(--font-size-sm); color:var(--color-text-muted);
                margin-bottom:var(--space-3);">
        Showing ${filtered.length} of ${_batches.length} batches
      </p>` : ''}

    <!-- Table region -->
    <div id="batch-table-region">
      ${filtered.length === 0 ? _renderEmpty() : _renderTable(filtered)}
    </div>
  `;

  _attachPageListeners();
}

function _renderTable(batches) {
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
                    ${_escHtml(b.batch_number)}
                  </code>
                </td>
                <td>
                  <span style="font-weight:var(--font-weight-medium);">
                    ${_escHtml(b.commodities?.name ?? '—')}
                  </span>
                  <br>
                  <span style="font-size:var(--font-size-xs); color:var(--color-text-muted);">
                    ${_escHtml(b.commodities?.commodity_code ?? '')}
                  </span>
                </td>
                <td>${b.quantity.toLocaleString()} ${_escHtml(b.commodities?.unit ?? '')}</td>
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
                  <span class="badge ${_statusBadgeClass(status)}">${status}</span>
                </td>
                <td style="text-align:right; white-space:nowrap;">
                  
                  ${b.quantity > 0 ? `<button class="btn btn-ghost btn-sm release-batch-btn"
                          data-id="${b.id}" type="button"
                          style="color: var(--color-primary);"
                          aria-label="Release batch ${_escHtml(b.batch_number)}">Release</button>` : ''}
                  <button class="btn btn-ghost btn-sm edit-batch-btn"
                          data-id="${b.id}" type="button"
                          aria-label="Edit batch ${_escHtml(b.batch_number)}">Edit</button>
                  <button class="btn btn-ghost btn-sm delete-batch-btn"
                          data-id="${b.id}" type="button"
                          style="color:var(--color-danger);"
                          aria-label="Delete batch ${_escHtml(b.batch_number)}">Delete</button>
                </td>
              </tr>
              <tr class="batch-desc-row" id="desc-${b.id}" style="display: none; background: var(--color-surface-alt);">
                <td colspan="7" style="padding: var(--space-3) var(--space-4); border-top: 1px solid var(--color-border-subtle); border-bottom: 1px solid var(--color-border-subtle);">
                  <div style="display: flex; gap: var(--space-2); align-items: flex-start;">
                    <span class="icon icon--sm" style="color: var(--color-text-muted); margin-top: 2px;">info</span>
                    <div style="font-size: var(--font-size-sm); color: var(--color-text-muted); line-height: 1.5; white-space: pre-wrap;">
                      ${b.notes ? _escHtml(b.notes) : '<em>No notes provided.</em>'}
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

function _renderEmpty() {
  const hasFilters = _filterComm !== 'all' || _filterStatus !== 'all';
  return `
    <div style="text-align:center; padding:var(--space-16) var(--space-8);
                color:var(--color-text-muted);">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="1.5"
           stroke-linecap="round" stroke-linejoin="round"
           style="margin:0 auto var(--space-4); display:block; opacity:0.4;">
        <rect x="1" y="3" width="15" height="13"></rect>
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
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

// ── Filter logic ──────────────────────────────────────────────────────────────

function _applyFilters() {
  return _batches.filter(b => {
    const matchComm   = _filterComm === 'all' || b.commodity_id === _filterComm;
    const matchStatus = _filterStatus === 'all'
      || getExpirationStatus(b.expiration_date) === _filterStatus;
    return matchComm && matchStatus;
  });
}

// ── Page listeners ────────────────────────────────────────────────────────────

function _attachPageListeners() {
  document.getElementById('add-batch-btn')
    ?.addEventListener('click', () => _openModal('add'));

  document.getElementById('filter-commodity')
    ?.addEventListener('change', e => { _filterComm = e.target.value; _refreshTable(); });

  document.getElementById('filter-status')
    ?.addEventListener('change', e => { _filterStatus = e.target.value; _refreshTable(); });

  document.getElementById('batch-table-region')
    ?.addEventListener('click', e => {
      const releaseBtn = e.target.closest('.release-batch-btn');
        const editBtn   = e.target.closest('.edit-batch-btn');
      const deleteBtn = e.target.closest('.delete-batch-btn');
      if (releaseBtn) {
          const batch = _batches.find(b => b.id === releaseBtn.dataset.id);
          if (batch) _openReleaseModal(batch);
          return;
        }
        if (editBtn) {
          const batch = _batches.find(b => b.id === editBtn.dataset.id);
          if (batch) _openModal('edit', batch);
          return;
        }
        if (deleteBtn) {
          const batch = _batches.find(b => b.id === deleteBtn.dataset.id);
          if (batch) _confirmDelete(batch);
          return;
        }

        const row = e.target.closest('.batch-row');
        if (row) {
          const descRow = document.getElementById('desc-' + row.dataset.batchId);
          if (descRow) {
            descRow.style.display = descRow.style.display === 'none' ? 'table-row' : 'none';
          }
        }
    });
}

function _refreshTable() {
  const region = document.getElementById('batch-table-region');
  if (!region) return;
  const filtered = _applyFilters();
  region.innerHTML = filtered.length === 0 ? _renderEmpty() : _renderTable(filtered);
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function _openModal(mode, batch = null) {
  _closeModal();
  const isEdit = mode === 'edit';
  const title  = isEdit ? 'Edit Batch' : 'Add Batch';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id        = 'batch-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', title);

  overlay.innerHTML = `
    <div class="modal" style="max-width:560px; width:100%;">
      <div class="modal-header">
        <h2 class="modal-title">${title}</h2>
        <button id="modal-close-btn" class="modal-close" type="button" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <form id="batch-form" novalidate>
        <div class="modal-body" style="display:flex; flex-direction:column; gap:var(--space-4);">

          <!-- Commodity -->
          <div class="form-group">
            <label for="field-commodity" class="form-label form-label--required">Commodity</label>
            <select id="field-commodity" name="commodity_id" class="form-input" required>
              <option value="">Select commodity</option>
              ${_commodities.map(c =>
                `<option value="${c.id}"
                  ${batch?.commodity_id === c.id ? 'selected' : ''}>
                  ${_escHtml(c.commodity_code)} — ${_escHtml(c.name)} (${_escHtml(c.unit)})
                </option>`
              ).join('')}
            </select>
            <span class="form-error" id="error-commodity" role="alert"></span>
          </div>

          <!-- Batch # + Quantity -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-3);">
            <div class="form-group">
              <label for="field-batch-number" class="form-label form-label--required">Batch Number</label>
              <input type="text" id="field-batch-number" name="batch_number"
                class="form-input" placeholder="e.g. DOH-2026-001"
                value="${_escHtml(batch?.batch_number ?? '')}"
                maxlength="50" required style="text-transform:uppercase;" />
              <span class="form-error" id="error-batch-number" role="alert"></span>
            </div>
            <div class="form-group">
              <label for="field-quantity" class="form-label form-label--required">Quantity</label>
              <input type="number" id="field-quantity" name="quantity"
                class="form-input" placeholder="e.g. 500"
                value="${batch?.quantity ?? ''}"
                min="1" step="1" required />
              <span class="form-error" id="error-quantity" role="alert"></span>
            </div>
          </div>

          <!-- Delivery + Expiry dates -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-3);">
            <div class="form-group">
              <label for="field-delivery-date" class="form-label form-label--required">Delivery Date</label>
              <input type="date" id="field-delivery-date" name="delivery_date"
                class="form-input"
                value="${batch?.delivery_date ?? ''}" required />
              <span class="form-error" id="error-delivery-date" role="alert"></span>
            </div>
            <div class="form-group">
              <label for="field-expiration-date" class="form-label form-label--required">Expiration Date</label>
              <input type="date" id="field-expiration-date" name="expiration_date"
                class="form-input"
                value="${batch?.expiration_date ?? ''}" required />
              <span class="form-error" id="error-expiration-date" role="alert"></span>
            </div>
          </div>

          <!-- Supplier -->
          <div class="form-group">
            <label for="field-supplier" class="form-label">
              Supplier
              <span style="color:var(--color-text-muted); font-weight:normal;">(optional)</span>
            </label>
            <input type="text" id="field-supplier" name="supplier"
              class="form-input" placeholder="e.g. Department of Health"
              value="${_escHtml(batch?.supplier ?? '')}" maxlength="200" />
          </div>

          <!-- Notes -->
          <div class="form-group">
            <label for="field-notes" class="form-label">
              Notes
              <span style="color:var(--color-text-muted); font-weight:normal;">(optional)</span>
            </label>
            <textarea id="field-notes" name="notes" class="form-input"
              placeholder="Any additional notes about this batch..."
              rows="2" maxlength="500"
              style="resize:vertical;">${_escHtml(batch?.notes ?? '')}</textarea>
          </div>

          <!-- Form-level error -->
          <div id="form-error-alert" class="alert alert-error" style="display:none;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span id="form-error-msg"></span>
          </div>

        </div>

        <div class="modal-footer">
          <button id="modal-cancel-btn" class="btn btn-ghost" type="button">Cancel</button>
          <button id="modal-submit-btn" class="btn btn-primary" type="submit">
            <span id="modal-submit-text">${isEdit ? 'Save Changes' : 'Add Batch'}</span>
            <span id="modal-submit-spinner" class="spinner" style="display:none;" aria-hidden="true"></span>
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('field-commodity')?.focus(), 50);

  overlay.addEventListener('click', e => { if (e.target === overlay) _closeModal(); });
  document.getElementById('modal-close-btn')?.addEventListener('click', _closeModal);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', _closeModal);

  document.getElementById('field-batch-number')?.addEventListener('input', e => {
    const pos = e.target.selectionStart;
    e.target.value = e.target.value.toUpperCase();
    e.target.setSelectionRange(pos, pos);
  });

  overlay._escHandler = e => { if (e.key === 'Escape') _closeModal(); };
  document.addEventListener('keydown', overlay._escHandler);

  document.getElementById('batch-form')
    ?.addEventListener('submit', e => _handleSubmit(e, mode, batch?.id ?? null));
}

function _closeModal() {
  const overlay = document.getElementById('batch-modal-overlay');
  if (!overlay) return;
  if (overlay._escHandler) document.removeEventListener('keydown', overlay._escHandler);
  overlay.remove();
}

// ── Form submit ───────────────────────────────────────────────────────────────

async function _handleSubmit(e, mode, batchId) {
  e.preventDefault();
  const formData = Object.fromEntries(new FormData(e.target));
  let valid = true;

  if (!formData.commodity_id) {
    _setFieldError('field-commodity', 'error-commodity', 'Commodity is required.');
    valid = false;
  }
  if (!formData.batch_number?.trim()) {
    _setFieldError('field-batch-number', 'error-batch-number', 'Batch number is required.');
    valid = false;
  }
  const qty = parseInt(formData.quantity, 10);
  if (!formData.quantity || isNaN(qty) || qty < 1) {
    _setFieldError('field-quantity', 'error-quantity', 'Enter a valid quantity (minimum 1).');
    valid = false;
  }
  if (!formData.delivery_date) {
    _setFieldError('field-delivery-date', 'error-delivery-date', 'Delivery date is required.');
    valid = false;
  }
  if (!formData.expiration_date) {
    _setFieldError('field-expiration-date', 'error-expiration-date', 'Expiration date is required.');
    valid = false;
  }
  if (formData.delivery_date && formData.expiration_date
      && formData.expiration_date <= formData.delivery_date) {
    _setFieldError('field-expiration-date', 'error-expiration-date',
      'Expiration date must be after delivery date.');
    valid = false;
  }

  if (!valid) return;
  _clearFieldErrors();
  _setModalLoading(true, mode);

  const result = mode === 'add'
    ? await createBatch(formData, _profile)
    : await updateBatch(batchId, formData, _profile);

  _setModalLoading(false, mode);

  if (result.error) { _showFormError(result.error); return; }

  // Update local state without re-fetching
  if (mode === 'add') {
    _batches.push(result.batch);
  } else {
    const idx = _batches.findIndex(b => b.id === result.batch.id);
    if (idx !== -1) _batches[idx] = result.batch;
  }
  // Keep sorted by expiration_date ascending
  _batches.sort((a, b) => a.expiration_date.localeCompare(b.expiration_date));

  _closeModal();
  _refreshTable();

  const subtitle = document.querySelector('.page-header__subtitle');
  if (subtitle) {
    subtitle.textContent =
      `${_batches.length} batch${_batches.length !== 1 ? 'es' : ''} on record`;
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function _confirmDelete(batch) {
  const name = batch.commodities?.name ?? 'unknown commodity';
  const confirmed = window.confirm(
    `Delete batch "${batch.batch_number}" for ${name}?\n\nThis action cannot be undone.`
  );
  if (!confirmed) return;

  const { error } = await deleteBatch(batch.id, batch.batch_number, name, _profile);
  if (error) { alert(error); return; }

  _batches = _batches.filter(b => b.id !== batch.id);
  _refreshTable();

  const subtitle = document.querySelector('.page-header__subtitle');
  if (subtitle) {
    subtitle.textContent =
      `${_batches.length} batch${_batches.length !== 1 ? 'es' : ''} on record`;
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function _statusBadgeClass(status) {
  const map = {
    [EXPIRATION_STATUS.GOOD]:        'badge-good',
    [EXPIRATION_STATUS.MODERATE]:    'badge-moderate',
    [EXPIRATION_STATUS.NEAR_EXPIRY]: 'badge-near-expiry',
    [EXPIRATION_STATUS.EXPIRED]:     'badge-expired',
  };
  return map[status] ?? '';
}

function _setFieldError(inputId, errorId, message) {
  document.getElementById(inputId)?.classList.add('form-input--error');
  const el = document.getElementById(errorId);
  if (el) el.textContent = message;
}

function _clearFieldErrors() {
  document.querySelectorAll('.form-input--error').forEach(el =>
    el.classList.remove('form-input--error')
  );
  ['error-commodity','error-batch-number','error-quantity',
   'error-delivery-date','error-expiration-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
  const alert = document.getElementById('form-error-alert');
  if (alert) alert.style.display = 'none';
}

function _showFormError(message) {
  const alert = document.getElementById('form-error-alert');
  const msg   = document.getElementById('form-error-msg');
  if (alert && msg) {
    msg.textContent     = message;
    alert.style.display = 'flex';
    alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function _setModalLoading(isLoading, mode) {
  const btn     = document.getElementById('modal-submit-btn');
  const text    = document.getElementById('modal-submit-text');
  const spinner = document.getElementById('modal-submit-spinner');
  const cancel  = document.getElementById('modal-cancel-btn');
  const close   = document.getElementById('modal-close-btn');
  if (!btn) return;
  btn.disabled     = isLoading;
  if (cancel) cancel.disabled = isLoading;
  if (close)  close.disabled  = isLoading;
  if (text)    text.textContent      = isLoading ? 'Saving...' : (mode === 'add' ? 'Add Batch' : 'Save Changes');
  if (spinner) spinner.style.display = isLoading ? 'inline-block' : 'none';
}

function _errorAlert(message) {
  return `
    <div class="alert alert-error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>${_escHtml(message)}</span>
    </div>
  `;
}


// ============================================================
// Release Logic
// ============================================================

function _openReleaseModal(batch) {
  const modalHtml = `
    <div class="modal-overlay" id="release-modal-overlay">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="release-modal-title">
        <div class="modal-header">
          <h2 class="modal-title" id="release-modal-title">Release Commodity</h2>
          <button class="modal-close" id="release-modal-close-btn" aria-label="Close dialog">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <p style="font-size: var(--font-size-sm); color: var(--color-text-muted); margin-bottom: var(--space-4);">
            Releasing from batch <strong>${_escHtml(batch.batch_number)}</strong> 
            (${_escHtml(batch.commodities?.name)}). Available stock: <strong>${batch.quantity}</strong>
          </p>

          <form id="release-form" novalidate>
            <!-- Error Alert -->
            <div id="release-error-alert" class="alert alert-error" style="display: none; margin-bottom: var(--space-4);">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span id="release-error-msg"></span>
            </div>

            <div class="form-group">
              <label for="release-quantity" class="form-label form-label--required">Quantity to Release</label>
              <input type="number" id="release-quantity" name="quantity" class="form-input" 
                     min="1" max="${batch.quantity}" required />
              <span class="form-error" id="error-release-quantity" role="alert"></span>
            </div>

            <div class="form-group">
              <label for="release-barangay" class="form-label form-label--required">Destination Barangay</label>
              <input list="barangay-options" id="release-barangay" name="barangay" class="form-input" 
                     placeholder="Select barangay" required autocomplete="off" />
              <datalist id="barangay-options">
                ${BARANGAYS ? BARANGAYS.map(b => `<option value="${b}"></option>`).join('') : ''}
              </datalist>
              <span class="form-error" id="error-release-barangay" role="alert"></span>
            </div>

            <div class="form-group">
              <label for="release-notes" class="form-label">Notes (optional)</label>
              <textarea id="release-notes" name="notes" class="form-input" rows="2" 
                        placeholder="Purpose of release..."></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="release-cancel-btn" type="button">Cancel</button>
          <button class="btn btn-primary" id="release-submit-btn" type="button" style="background: var(--color-success);">
            <svg id="release-spinner" class="spinner" viewBox="0 0 24 24" style="display: none; margin-right: 8px;">
              <circle class="path" cx="12" cy="12" r="10" fill="none" stroke-width="3"></circle>
            </svg>
            <span id="release-submit-text">Confirm Release</span>
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  const overlay = document.getElementById('release-modal-overlay');
  
  const close = () => {
    overlay.remove();
  };
  
  document.getElementById('release-modal-close-btn').addEventListener('click', close);
  document.getElementById('release-cancel-btn').addEventListener('click', close);
  
  document.getElementById('release-submit-btn').addEventListener('click', async () => {
    // Validate
    const qtyInput = document.getElementById('release-quantity');
    const brgyInput = document.getElementById('release-barangay');
    const notesInput = document.getElementById('release-notes');
    const qty = parseInt(qtyInput.value, 10);
    const brgy = brgyInput.value.trim();
    
    let valid = true;
    document.querySelectorAll('.form-input--error').forEach(el => el.classList.remove('form-input--error'));
    document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
    document.getElementById('release-error-alert').style.display = 'none';

    if (!qty || isNaN(qty) || qty < 1 || qty > batch.quantity) {
      qtyInput.classList.add('form-input--error');
      document.getElementById('error-release-quantity').textContent = 'Enter a valid quantity (1 to ' + batch.quantity + ').';
      valid = false;
    }
    if (!brgy) {
      brgyInput.classList.add('form-input--error');
      document.getElementById('error-release-barangay').textContent = 'Destination barangay is required.';
      valid = false;
    }
    
    if (!valid) return;
    
    // Loading state
    const btn = document.getElementById('release-submit-btn');
    const spinner = document.getElementById('release-spinner');
    const text = document.getElementById('release-submit-text');
    btn.disabled = true;
    spinner.style.display = 'inline-block';
    text.textContent = 'Releasing...';
    
    // Call service
    const result = await releaseBatch(
      batch.id, 
      batch.batch_number, 
      batch.commodities?.name, 
      qty, 
      batch.quantity, 
      brgy, 
      notesInput.value, 
      _profile
    );
    
    if (result.error) {
      document.getElementById('release-error-alert').style.display = 'flex';
      document.getElementById('release-error-msg').textContent = result.error;
      btn.disabled = false;
      spinner.style.display = 'none';
      text.textContent = 'Confirm Release';
      return;
    }
    
    // Update local state
    const idx = _batches.findIndex(b => b.id === result.batch.id);
    if (idx !== -1) _batches[idx] = result.batch;
    
    close();
    _refreshTable();
  });
}

function _escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

