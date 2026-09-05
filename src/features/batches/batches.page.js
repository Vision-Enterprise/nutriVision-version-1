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

import { supabase } from '../../core/supabase.js';
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
import { ScannerComponent } from '../scanner/scanner.component.js';

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
    ?.addEventListener('click', () => _openFullScreenWorkspace());

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
          if (batch) _openEditModal(batch);
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

function _openEditModal(batch) {
  _closeModal();
  const isEdit = true;
  const title = "Edit Batch";

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id        = 'batch-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', title);

  overlay.innerHTML = `
    <div class="modal" style="max-width:560px; width:100%;">
      <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center;">
        <h2 class="modal-title" style="margin: 0;">${title}</h2>
        <div style="display:flex; gap: 8px;">
          
          <button id="modal-close-btn" class="modal-close" type="button" aria-label="Close" style="position:relative; top:auto; right:auto;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <form id="batch-form" novalidate>
        
<style>
  .bulk-row input:focus {
     background: rgba(46,125,50,0.06) !important;
     border-radius: 4px;
     outline: 1px solid var(--color-primary) !important;
  }
  .bulk-row input::placeholder {
     color: var(--text-muted);
     font-style: italic;
  }
  .bulk-row:hover {
     outline: 1px solid rgba(46,125,50,0.3);
     outline-offset: -1px;
  }
</style>

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
  if (!isEdit) {
    const scanBtn = document.getElementById('ocr-scan-btn');
    if (scanBtn) {
      scanBtn.addEventListener('click', () => {
        const scanner = new ScannerComponent(async (parsedRows) => {
          if (!parsedRows || !parsedRows.length) return;
          
          let successCount = 0;
          for (const row of parsedRows) {
            if (!row.commodityId) continue;
            
            const batchData = {
              commodity_id: _commodities.find(c => c.name.toLowerCase() === row.commodityName.toLowerCase())?.id || null,
              quantity: parseInt(row.qty) || 0,
              expiration_date: row.expDate || '',
              notes: 'Auto-scanned via Table OCR'
            };
            
            try {
              await createBatch(batchData);
              successCount++;
            } catch (err) {
              console.error('Failed to create batch for', row, err);
            }
          }
          
          _closeModal();
          renderBatchesPage(_profile);
          if (successCount > 0) alert(`Successfully imported ${successCount} batches!`);
        });
        scanner.mount();
      });
    }
  }
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





// ============================================================
// Full-Screen Bulk Registration Workspace
// ============================================================
let bulkRows = [];
let baseIncrements = {}; // Cache of highest database increments per prefix

const COMMODITY_PREFIXES = {
  "Therapeutic Food": "TF",
  "Micronutrient Powder": "MNP",
  "Fortified Milk": "FMP",
  "Iron Folic Acid": "IFA",
  "Champorado Porridge": "FRP"
};

function getPrefix(name) {
  if (!name) return "UNK";
  for (const [key, prefix] of Object.entries(COMMODITY_PREFIXES)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return prefix;
  }
  // Fallback map exact known names or return UNK
  return "UNK";
}

async function _fetchBaseIncrements() {
   baseIncrements = {};
   const year = new Date().getFullYear();
   // Fetch all batch numbers from this year
   const { data } = await supabase
      .from('batches')
      .select('batch_number')
      .like('batch_number', `%-${year}-%`);
      
   if (data) {
      data.forEach(row => {
         const parts = row.batch_number.split('-');
         if (parts.length >= 3) {
            const prefix = parts[0];
            const inc = parseInt(parts[2], 10);
            if (!isNaN(inc)) {
               baseIncrements[prefix] = Math.max(baseIncrements[prefix] || 0, inc);
            }
         }
      });
   }
}

function generateBatchCode(commodityName, rowIndex) {
   if (!commodityName) return "Auto-assigned";
   const prefix = getPrefix(commodityName);
   const year = new Date().getFullYear();
   
   // Count how many valid rows with the exact same prefix exist BEFORE this row
   let localOffset = 1;
   for (let i = 0; i < rowIndex; i++) {
      if (getPrefix(bulkRows[i].commodityName) === prefix) {
         localOffset++;
      }
   }
   
   const base = baseIncrements[prefix] || 0;
   const finalInc = base + localOffset;
   return `${prefix}-${year}-${String(finalInc).padStart(4, '0')}`;
}

async function _openFullScreenWorkspace() {
  _closeModal();
  bulkRows = []; // reset state
  await _fetchBaseIncrements();

  const overlay = document.createElement('div');
  overlay.className = 'workspace-overlay';
  overlay.id = 'batch-workspace-overlay';

  overlay.innerHTML = `
    <div class="workspace-header">
      <div style="display:flex; align-items:center; gap:16px;">
         <h2 class="workspace-header-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            Bulk Batch Registration
         </h2>
         <span class="workspace-header-subtitle">NutriVision MNAO Intake</span>
      </div>
      <div class="workspace-actions">
         <button id="workspace-cancel-btn" style="background:transparent; border:none; font-weight:600; color:var(--text-muted); cursor:pointer; padding:10px 16px;">Cancel / Exit</button>
         <button id="workspace-save-btn" class="btn-elevated">Register All Batches</button>
      </div>
    </div>

    <div class="workspace-body">
      <!-- Left Panel: Scanner (Collapsible) -->
      <div class="workspace-panel-left" id="workspace-panel-left">
         <!-- Hamburger header - always visible -->
         <div class="scanner-pane-header">
           <span style="font-size:13px; font-weight:600; color:var(--text-main);">Scanner Module</span>
           <button class="scanner-hamburger-btn" id="scanner-collapse-btn" title="Collapse scanner pane" aria-label="Toggle scanner pane">
             <span></span><span></span><span></span>
           </button>
         </div>
         <!-- Scanner mount point -->
         <div id="bulk-scanner-container" style="flex:1; display:flex; flex-direction:column; overflow:hidden;"></div>
         <!-- Re-open tab (visible only when collapsed) -->
         <button id="scanner-pane-toggle-tab" title="Expand scanner pane" aria-label="Expand scanner pane">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
           SCANNER
         </button>
      </div>

      <!-- Right Panel: Data Grid -->
      <div class="workspace-panel-right">
         <!-- FX Bar: Excel-like active cell editor -->
         <div class="fx-bar-wrapper">
           <span class="fx-bar-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>
           <input class="fx-bar-input" id="fx-bar-input" placeholder="Click a cell to edit its value here..." readonly />
         </div>
         <div class="headless-grid-container" style="border-radius:0 0 8px 8px;">
           <div class="headless-grid-scroll" style="overflow-x:auto; flex:1;">
           <table class="headless-grid">
              <thead>
                 <tr>
                    <th style="min-width:180px;">Commodity</th>
                    <th style="min-width:130px;">Batch Code</th>
                    <th style="min-width:80px;">Qty</th>
                    <th style="min-width:120px;">Del. Date</th>
                    <th style="min-width:120px;">Exp. Date</th>
                    <th style="min-width:160px;">Supplier</th>
                    <th style="min-width:48px; text-align:center;"></th>
                 </tr>
              </thead>
              <tbody id="bulk-table-body">
                 <!-- Dynamic Rows -->
              </tbody>
           </table>
           </div><!-- /headless-grid-scroll -->
           <div style="padding:16px;">
              <button id="bulk-add-row-btn" style="background:none; border:none; color:var(--color-primary); font-weight:600; cursor:pointer; display:flex; align-items:center; gap:8px;">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                 Add New Row Manually
              </button>
           </div>
         </div>
         <div class="workspace-footer">
            <div>
               <span id="summary-commodities" style="font-weight:600; color:var(--text-main);">0</span> Unique Commodities
            </div>
            <div>
               <span id="summary-units" style="font-weight:600; color:var(--text-main);">0</span> Total Units
            </div>
         </div>
      </div>
    </div>
    
    <datalist id="commodity-list-ws">
      ${_commodities.map(c => `<option value="${_escHtml(c.name)}"></option>`).join('')}
    </datalist>
  `;

  document.body.appendChild(overlay);

  // Mount ScannerComponent
  new ScannerComponent({
     container: document.getElementById('bulk-scanner-container'),
     onComplete: (parsedRows) => {
        const today = new Date().toISOString().split('T')[0];
        parsedRows.forEach(r => {
           bulkRows.push({
              id: Date.now() + Math.random(),
              commodityName: r.commodityId ? _commodities.find(c => c.id === r.commodityId)?.name : (r.productName || ''),
              qty: r.qty || '',
              deliveryDate: r.deliveryDate || today,
              expDate: r.expDate || '',
              supplier: '',
              notes: ''
           });
        });
        _renderBulkTable();
     }
  });

  _renderBulkTable();

  // Event Listeners
  // Hamburger toggle: collapse / expand left scanner pane
  const _leftPanel = document.getElementById('workspace-panel-left');
  document.getElementById('scanner-collapse-btn').addEventListener('click', () => {
    _leftPanel.classList.toggle('is-collapsed');
  });
  document.getElementById('scanner-pane-toggle-tab').addEventListener('click', () => {
    _leftPanel.classList.remove('is-collapsed');
  });

  // FX Bar: active-cell editing
  const _fxBar = document.getElementById('fx-bar-input');
  let _fxTarget = null;
  document.getElementById('bulk-table-body').addEventListener('focusin', (e) => {
    const inp = e.target.closest('input:not([disabled])');
    if (!inp) return;
    _fxTarget = inp;
    _fxBar.value = inp.value;
    _fxBar.removeAttribute('readonly');
  });
  _fxBar.addEventListener('input', () => { if (_fxTarget) _fxTarget.value = _fxBar.value; });
  _fxBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      if (_fxTarget) {
        _fxTarget.dispatchEvent(new Event('input', {bubbles: true}));
        _fxTarget.blur();
        _fxTarget = null;
      }
      _fxBar.setAttribute('readonly', true);
      _fxBar.value = '';
    }
  });

  document.getElementById('workspace-cancel-btn').addEventListener('click', () => overlay.remove());
  
  document.getElementById('bulk-add-row-btn').addEventListener('click', () => {
     _syncBulkState();
     bulkRows.push({
        id: Date.now(),
        commodityName: '',
        qty: '',
        deliveryDate: new Date().toISOString().split('T')[0],
        expDate: '',
        supplier: '',
        notes: ''
     });
     _renderBulkTable();
  });

  document.getElementById('workspace-save-btn').addEventListener('click', _handleWorkspaceSave);
}

function _renderBulkTable() {
  const tbody = document.getElementById('bulk-table-body');
  if (!tbody) return;

  if (bulkRows.length === 0) {
     tbody.innerHTML = `<tr><td colspan="7" style="padding:48px; text-align:center; color:var(--text-muted);">No data available. Extract from receipt or add manually.</td></tr>`;
     document.getElementById('summary-commodities').textContent = '0';
     document.getElementById('summary-units').textContent = '0';
     return;
  }

  let totalQty = 0;
  let uniqueComms = new Set();

  tbody.innerHTML = bulkRows.map((row, index) => {
     const batchCode = generateBatchCode(row.commodityName, index);
     
     if (row.commodityName) uniqueComms.add(row.commodityName.toLowerCase());
     if (row.qty) totalQty += parseInt(row.qty, 10) || 0;

     // Calculate expiration highlighting
     let expStyle = '';
     if (row.expDate) {
        const exp = new Date(row.expDate);
        const now = new Date();
        const diffDays = (exp - now) / (1000 * 60 * 60 * 24);
        if (diffDays >= 0 && diffDays < 180) { // < 6 months
           expStyle = 'background: rgba(239, 68, 68, 0.1); color: #ef4444; font-weight: 600;';
        }
     }

     return `
      <tr class="bulk-row" data-index="${index}">
         <td>
            <input list="commodity-list-ws" class="headless-input ws-input-commodity" placeholder="Type commodity..." value="${_escHtml(row.commodityName)}" />
         </td>
         <td>
            <input type="text" class="headless-input" value="${batchCode}" disabled />
         </td>
         <td>
            <input type="number" class="headless-input ws-input-qty" value="${_escHtml(row.qty)}" min="1" placeholder="0" />
         </td>
         <td>
            <input type="date" class="headless-input ws-input-del" value="${_escHtml(row.deliveryDate)}" />
         </td>
         <td>
            <input type="date" class="headless-input ws-input-exp" value="${_escHtml(row.expDate)}" style="${expStyle}" />
         </td>
         <td>
            <input type="text" class="headless-input ws-input-sup" value="${_escHtml(row.supplier)}" placeholder="Supplier..." />
         </td>
         <td style="text-align:center;">
            <button class="bulk-delete-btn" style="background:none; border:none; color:var(--text-muted); cursor:pointer; padding:8px;">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
         </td>
      </tr>
     `;
  }).join('');

  // Update Footer Summary
  document.getElementById('summary-commodities').textContent = uniqueComms.size;
  document.getElementById('summary-units').textContent = totalQty;

  // Attach event listeners for dynamic recalculation
  document.querySelectorAll('.ws-input-commodity').forEach(input => {
     input.addEventListener('change', () => { _syncBulkState(); _renderBulkTable(); });
     input.addEventListener('blur', () => { _syncBulkState(); _renderBulkTable(); });
  });
  
  document.querySelectorAll('.ws-input-qty').forEach(input => {
     input.addEventListener('input', () => { _syncBulkState(); _renderBulkTable(); });
  });

  document.querySelectorAll('.ws-input-exp').forEach(input => {
     input.addEventListener('change', () => { _syncBulkState(); _renderBulkTable(); });
  });

  // Attach delete events
  document.querySelectorAll('.bulk-delete-btn').forEach((btn, i) => {
     btn.addEventListener('click', () => {
        _syncBulkState();
        bulkRows.splice(i, 1);
        _renderBulkTable();
     });
  });
}

function _syncBulkState() {
   const rows = document.querySelectorAll('.bulk-row');
   rows.forEach((tr, i) => {
      bulkRows[i].commodityName = tr.querySelector('.ws-input-commodity').value;
      bulkRows[i].qty = tr.querySelector('.ws-input-qty').value;
      bulkRows[i].deliveryDate = tr.querySelector('.ws-input-del').value;
      bulkRows[i].expDate = tr.querySelector('.ws-input-exp').value;
      bulkRows[i].supplier = tr.querySelector('.ws-input-sup').value;
   });
}

async function _handleWorkspaceSave() {
   _syncBulkState();
   
   if (bulkRows.length === 0) return alert('No rows to save.');

   let isValid = true;
   bulkRows.forEach((r, i) => {
      if (!r.commodityName || !r.qty || !r.deliveryDate || !r.expDate) {
         isValid = false;
      }
   });
   
   let invalidComm = bulkRows.find(r => !_commodities.find(c => c.name.toLowerCase() === r.commodityName.toLowerCase()));
   if (invalidComm) return alert('Invalid commodity name: "' + invalidComm.commodityName + '". Please select a valid commodity.');
   if (!isValid) return alert('Please fill in all required fields (Commodity, Qty, Delivery, Expiration).');

   const btn = document.getElementById('workspace-save-btn');
   btn.disabled = true;
   btn.textContent = 'Saving...';

   let successCount = 0;
   let errors = [];

   for (let i = 0; i < bulkRows.length; i++) {
      const row = bulkRows[i];
      const batchCode = generateBatchCode(row.commodityName, i);
      
      const formData = {
         commodity_id: _commodities.find(c => c.name.toLowerCase() === row.commodityName.toLowerCase())?.id,
         batch_number: batchCode,
         quantity: row.qty,
         delivery_date: row.deliveryDate,
         expiration_date: row.expDate,
         supplier: row.supplier,
         notes: ''
      };
      
      const res = await createBatch(formData, _profile);
      if (res.error) errors.push(res.error);
      else successCount++;
   }

   if (errors.length > 0) alert(`Saved ${successCount} batches, but encountered errors: \n` + errors.join('\n'));
   
   document.getElementById('batch-workspace-overlay').remove();
   const reloadRes = await fetchBatches();
   if (!reloadRes.error) {
      _batches = reloadRes.batches;
      _refreshTable();
   } else {
      window.location.reload();
   }
}




