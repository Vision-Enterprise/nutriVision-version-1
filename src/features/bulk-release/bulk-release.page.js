/**
 * Bulk Release - Page Controller
 *
 * Manages all state and interactions for the Bulk Release full-screen workspace.
 * Mounts over #page-content (no sidebar change needed) and calls back
 * onClose() when the user exits, so the batches page can refresh itself.
 *
 * Separation of concerns:
 *   State   -> this file
 *   HTML    -> bulk-release.render.js
 *   DB      -> bulk-release.service.js
 */

import {
  fetchActiveBatchesForRelease,
  executeBulkRelease,
} from './bulk-release.service.js';
import {
  renderBulkReleaseShell,
  renderBatchSelectorTable,
  renderCartItem,
  renderSuccessSummary,
} from './bulk-release.render.js';
import { BARANGAYS } from '../../shared/constants/app.constants.js';
import { SystemDialog } from '../../shared/components/dialog.component.js';

// ── Module State ──────────────────────────────────────────────────────────────
let _batches    = [];        // all active batches from DB
let _filtered   = [];        // currently displayed (after filter/sort)
let _cart       = new Map(); // batchId -> { batch, qty }
let _sortMode   = 'fefo';
let _filterComm = 'all';
let _profile    = null;
let _onClose    = null;      // callback: () => void

// ── Entry Point ───────────────────────────────────────────────────────────────

/**
 * Open the Bulk Release workspace over the current page content.
 *
 * @param {{ profile: Object, onClose: Function }} options
 */
export async function openBulkReleaseWorkspace({ profile, onClose }) {
  _profile  = profile;
  _onClose  = onClose;
  _batches  = [];
  _filtered = [];
  _cart     = new Map();

  const content = document.getElementById('page-content');
  if (!content) return;

  // Mount workspace shell
  content.innerHTML = renderBulkReleaseShell();

  // Populate barangay dropdown
  _populateBarangays();

  // Attach top-bar listeners
  document.getElementById('bulk-release-back-btn')?.addEventListener('click', _handleBack);

  // Load batches
  const { batches, error } = await fetchActiveBatchesForRelease();
  if (error) {
    document.getElementById('bulk-batch-table-region').innerHTML = `
      <div class="alert alert-error" style="margin:var(--space-4);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>${error}</span>
      </div>`;
    return;
  }

  _batches = batches;
  _populateCommodityFilter();
  _applyFilterAndSort();
  _renderTable();
  _attachTableListeners();
  _attachCartListeners();
  _attachFilterListeners();
  _attachConfirmListener();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _populateBarangays() {
  const sel = document.getElementById('bulk-barangay');
  if (!sel) return;
  BARANGAYS.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b;
    opt.textContent = b;
    sel.appendChild(opt);
  });
}

function _populateCommodityFilter() {
  const sel = document.getElementById('bulk-filter-commodity');
  if (!sel) return;
  const names = [...new Set(_batches.map(b => b.commodities?.name).filter(Boolean))].sort();
  names.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });
}

function _applyFilterAndSort() {
  let list = _batches.slice();

  if (_filterComm !== 'all') {
    list = list.filter(b => b.commodities?.name === _filterComm);
  }

  switch (_sortMode) {
    case 'name':     list.sort((a, b) => (a.commodities?.name ?? '').localeCompare(b.commodities?.name ?? '')); break;
    case 'qty-desc': list.sort((a, b) => b.quantity - a.quantity); break;
    case 'qty-asc':  list.sort((a, b) => a.quantity - b.quantity); break;
    default:         list.sort((a, b) => a.expiration_date.localeCompare(b.expiration_date)); break;
  }

  _filtered = list;
}

function _renderTable() {
  const region = document.getElementById('bulk-batch-table-region');
  if (!region) return;
  const selectedIds = new Set(_cart.keys());
  region.innerHTML = renderBatchSelectorTable(_filtered, selectedIds);
}

function _updateCartDisplay() {
  const cartEl    = document.getElementById('bulk-cart-items');
  const emptyEl   = document.getElementById('bulk-cart-empty');
  const countEl   = document.getElementById('bulk-cart-count');
  const confirmEl = document.getElementById('bulk-confirm-btn');
  if (!cartEl) return;

  const count = _cart.size;

  // Badge
  if (countEl) {
    countEl.style.display = count > 0 ? 'inline-flex' : 'none';
    countEl.textContent   = `${count} Selected`;
  }

  // Confirm button
  if (confirmEl) confirmEl.disabled = count === 0;

  // Empty state
  if (emptyEl) emptyEl.style.display = count === 0 ? 'flex' : 'none';

  // Remove existing cart item elements (not the empty placeholder)
  cartEl.querySelectorAll('.bulk-cart-item').forEach(el => el.remove());

  // Re-render cart items
  _cart.forEach(({ batch, qty }) => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderCartItem(batch, qty);
    const item = wrapper.firstElementChild;
    cartEl.insertBefore(item, emptyEl);

    // Qty input listener
    item.querySelector('.bulk-cart-qty')?.addEventListener('input', e => {
      const val = parseInt(e.target.value, 10);
      const max = parseInt(e.target.dataset.max, 10);
      const clamped = Math.max(1, Math.min(isNaN(val) ? 1 : val, max));
      if (val !== clamped) e.target.value = clamped;
      const entry = _cart.get(e.target.dataset.batchId);
      if (entry) entry.qty = clamped;
    });

    // Remove button listener
    item.querySelector('.bulk-cart-remove')?.addEventListener('click', e => {
      const batchId = e.currentTarget.dataset.batchId;
      _cart.delete(batchId);
      // Uncheck checkbox in table
      const chk = document.getElementById(`chk-${batchId}`);
      if (chk) chk.checked = false;
      const row = document.querySelector(`.bulk-batch-row[data-batch-id="${batchId}"]`);
      if (row) row.classList.remove('bulk-batch-row--selected');
      _updateCartDisplay();
    });
  });
}

// ── Event Listeners ───────────────────────────────────────────────────────────

function _attachTableListeners() {
  const region = document.getElementById('bulk-batch-table-region');
  if (!region) return;

  region.addEventListener('change', e => {
    const chk = e.target.closest('.bulk-batch-check');
    if (!chk) return;
    const batchId = chk.dataset.batchId;
    const batch   = _batches.find(b => b.id === batchId);
    if (!batch) return;

    const row = document.querySelector(`.bulk-batch-row[data-batch-id="${batchId}"]`);

    if (chk.checked) {
      _cart.set(batchId, { batch, qty: 1 });
      if (row) row.classList.add('bulk-batch-row--selected');
    } else {
      _cart.delete(batchId);
      if (row) row.classList.remove('bulk-batch-row--selected');
    }

    _updateCartDisplay();
  });

  // Row click → toggle checkbox
  region.addEventListener('click', e => {
    if (e.target.closest('.bulk-batch-check')) return; // already handled by change
    const row = e.target.closest('.bulk-batch-row');
    if (!row || row.classList.contains('bulk-batch-row--disabled')) return;
    const chk = row.querySelector('.bulk-batch-check');
    if (chk && !chk.disabled) {
      chk.checked = !chk.checked;
      chk.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
}

function _attachCartListeners() {
  // Listeners for dynamically-added items are attached per-item in _updateCartDisplay
}

function _attachFilterListeners() {
  document.getElementById('bulk-filter-commodity')?.addEventListener('change', e => {
    _filterComm = e.target.value;
    _applyFilterAndSort();
    _renderTable();
    _attachTableListeners();
  });

  document.getElementById('bulk-filter-sort')?.addEventListener('change', e => {
    _sortMode = e.target.value;
    _applyFilterAndSort();
    _renderTable();
    _attachTableListeners();
  });
}

function _attachConfirmListener() {
  document.getElementById('bulk-confirm-btn')?.addEventListener('click', _handleConfirm);
}

async function _handleConfirm() {
  // Clear previous errors
  document.getElementById('bulk-release-error-alert').style.display = 'none';
  document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
  document.querySelectorAll('.form-input--error').forEach(el => el.classList.remove('form-input--error'));

  // Validate cart
  if (_cart.size === 0) {
    _showError('Please select at least one batch to release.');
    return;
  }

  // Validate destination
  const barangay   = document.getElementById('bulk-barangay')?.value?.trim();
  const recipient  = document.getElementById('bulk-recipient')?.value?.trim();
  const releaseDate = document.getElementById('bulk-release-date')?.value;
  const notes      = document.getElementById('bulk-notes')?.value?.trim();
  let valid = true;

  if (!barangay) {
    _setFieldError('bulk-barangay', 'err-barangay', 'Destination barangay is required.');
    valid = false;
  }
  if (!recipient) {
    _setFieldError('bulk-recipient', 'err-recipient', 'Recipient name is required.');
    valid = false;
  }
  if (!releaseDate) {
    _setFieldError('bulk-release-date', 'err-release-date', 'Release date is required.');
    valid = false;
  }

  // Validate individual qty inputs
  for (const [batchId, entry] of _cart.entries()) {
    const input = document.getElementById(`cart-qty-${batchId}`);
    if (!input) continue;
    const val = parseInt(input.value, 10);
    if (isNaN(val) || val < 1) {
      input.classList.add('form-input--error');
      valid = false;
    } else if (val > entry.batch.quantity) {
      input.classList.add('form-input--error');
      valid = false;
    } else {
      entry.qty = val;
    }
  }

  if (!valid) {
    _showError('Please fix the highlighted fields before confirming.');
    return;
  }

  // Confirm dialog
  const confirmed = await SystemDialog.confirm(
    `You are about to release stock from ${_cart.size} batch${_cart.size !== 1 ? 'es' : ''} to ${barangay}. This cannot be undone. Proceed?`
  );
  if (!confirmed) return;

  // Set loading state
  _setLoading(true);

  const releaseItems = [..._cart.values()].map(({ batch, qty }) => ({
    batchId:       batch.id,
    batchNumber:   batch.batch_number,
    commodityName: batch.commodities?.name ?? '',
    commodityUnit: batch.commodities?.unit ?? '',
    qty,
    currentQty:    batch.quantity,
  }));

  const destination = { barangay, recipientName: recipient, notes, releaseDate };

  const { results, errors, error } = await executeBulkRelease(releaseItems, destination, _profile);
  _setLoading(false);

  if (error && results.length === 0) {
    _showError(error);
    return;
  }

  // Show success summary
  const content = document.getElementById('page-content');
  if (content) {
    content.innerHTML = renderSuccessSummary(results, errors, barangay);
    document.getElementById('bulk-release-back-after-success')?.addEventListener('click', _handleBack);
  }

  // Notify parent (batches page) to refresh
  if (typeof _onClose === 'function') _onClose(results);
}

function _handleBack() {
  if (typeof _onClose === 'function') _onClose([]);
}

// ── UI Helpers ────────────────────────────────────────────────────────────────

function _setLoading(isLoading) {
  const btn     = document.getElementById('bulk-confirm-btn');
  const spinner = document.getElementById('bulk-confirm-spinner');
  const icon    = document.getElementById('bulk-confirm-icon');
  const text    = document.getElementById('bulk-confirm-text');
  if (!btn) return;
  btn.disabled = isLoading;
  if (spinner) spinner.style.display = isLoading ? 'inline-block' : 'none';
  if (icon)    icon.style.display    = isLoading ? 'none'         : 'inline-block';
  if (text)    text.textContent      = isLoading ? 'Releasing…'   : 'Confirm & Release Stock';
}

function _showError(message) {
  const alert = document.getElementById('bulk-release-error-alert');
  const msg   = document.getElementById('bulk-release-error-msg');
  if (alert && msg) {
    msg.textContent = message;
    alert.style.display = 'flex';
    alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function _setFieldError(inputId, errorId, message) {
  document.getElementById(inputId)?.classList.add('form-input--error');
  const el = document.getElementById(errorId);
  if (el) el.textContent = message;
}
