/**
 * Commodity Management Page
 *
 * Features:
 *   - Table listing all active commodities
 *   - Search by name or code
 *   - Filter by category
 *   - Add modal (create new commodity)
 *   - Edit modal (update existing commodity)
 *   - Soft-delete with confirmation dialog
 */

import {
  fetchCommodities,
  createCommodity,
  updateCommodity,
  deleteCommodity,
} from './commodities.service.js';
import { formatDate } from '../../shared/utils/date.utils.js';
import {
  COMMODITY_CATEGORIES,
  COMMODITY_UNITS,
} from '../../shared/constants/app.constants.js';

// ── Page-level state ─────────────────────────────────────────────────────────
// Kept at module scope so event handlers can reference and mutate it
// without needing to pass it through every function call.

let _commodities = [];   // master list from Supabase
let _profile     = null;
let _search      = '';
let _category    = 'all';

// ── Entry point ───────────────────────────────────────────────────────────────

export async function renderCommoditiesPage(profile) {
  _profile  = profile;
  _search   = '';
  _category = 'all';

  const content = document.getElementById('page-content');
  if (!content) return;

  // Loading state
  content.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Commodity Management</h1>
      <p class="page-header__subtitle">Manage registered nutrition commodity types</p>
    </div>
    <div class="loading-overlay">
      <div class="spinner spinner-lg"></div>
    </div>
  `;

  const { commodities, error } = await fetchCommodities();

  if (error) {
    content.innerHTML = `
      <div class="page-header">
        <h1 class="page-header__title">Commodity Management</h1>
        <p class="page-header__subtitle">Manage registered nutrition commodity types</p>
      </div>
      ${_errorAlert(error)}
    `;
    return;
  }

  _commodities = commodities;
  _renderPage(content);
}

// ── Render helpers ────────────────────────────────────────────────────────────

function _renderPage(content) {
  const filtered  = _applyFilters();

  content.innerHTML = `
    <!-- Page header row -->
    <div style="display: flex; align-items: flex-start; justify-content: space-between;
                gap: var(--space-4); flex-wrap: wrap; margin-bottom: var(--space-6);">
      <div>
        <h1 class="page-header__title">Commodity Management</h1>
        <p class="page-header__subtitle">
          ${_commodities.length} commodity type${_commodities.length !== 1 ? 's' : ''} registered
        </p>
      </div>
      <button id="add-commodity-btn" class="btn btn-primary" type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Add Commodity
      </button>
    </div>

    <!-- Filters -->
    <div style="display: flex; gap: var(--space-3); margin-bottom: var(--space-4); flex-wrap: wrap;">
      <div style="position: relative; flex: 1; min-width: 200px; max-width: 320px;">
        <svg style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
                    color: var(--color-text-muted); pointer-events: none;"
             width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          id="commodity-search"
          type="search"
          class="form-input"
          placeholder="Search by name or code..."
          value="${_escHtml(_search)}"
          style="padding-left: 36px;"
          aria-label="Search commodities"
        />
      </div>
      <select id="commodity-category-filter" class="form-input" style="max-width: 200px;"
              aria-label="Filter by category">
        <option value="all">All Categories</option>
        ${COMMODITY_CATEGORIES.map(cat =>
          `<option value="${cat}" ${_category === cat ? 'selected' : ''}>${cat}</option>`
        ).join('')}
      </select>
    </div>

    <!-- Commodity count after filter -->
    ${_search || _category !== 'all' ? `
      <p style="font-size: var(--font-size-sm); color: var(--color-text-muted);
                margin-bottom: var(--space-3);">
        Showing ${filtered.length} of ${_commodities.length} commodities
      </p>
    ` : ''}

    <!-- Table or empty state -->
    <div id="commodity-table-region">
      ${filtered.length === 0 ? _renderEmpty() : _renderTable(filtered)}
    </div>
  `;

  _attachPageListeners(content);
}

function _renderTable(commodities) {
  return `
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Category</th>
            <th>Unit</th>
            <th>Date Added</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${commodities.map(c => `
            <tr data-commodity-id="${c.id}">
              <td>
                <code style="font-size: var(--font-size-xs);
                             background: var(--color-surface-alt);
                             color: var(--color-primary);
                             padding: 2px 8px;
                             border-radius: var(--radius-sm);
                             font-weight: var(--font-weight-medium);
                             letter-spacing: 0.05em;">
                  ${_escHtml(c.commodity_code)}
                </code>
              </td>
              <td style="font-weight: var(--font-weight-medium);">${_escHtml(c.name)}</td>
              <td>${_escHtml(c.category)}</td>
              <td>${_escHtml(c.unit)}</td>
              <td style="color: var(--color-text-muted); font-size: var(--font-size-sm);">
                ${formatDate(c.created_at)}
              </td>
              <td style="text-align: right; white-space: nowrap;">
                <button
                  class="btn btn-ghost btn-sm edit-commodity-btn"
                  data-id="${c.id}"
                  aria-label="Edit ${_escHtml(c.name)}"
                  type="button"
                >Edit</button>
                <button
                  class="btn btn-ghost btn-sm delete-commodity-btn"
                  data-id="${c.id}"
                  style="color: var(--color-danger);"
                  aria-label="Delete ${_escHtml(c.name)}"
                  type="button"
                >Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function _renderEmpty() {
  const hasFilters = _search || _category !== 'all';
  return `
    <div style="text-align: center; padding: var(--space-16) var(--space-8);
                color: var(--color-text-muted);">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="1.5"
           stroke-linecap="round" stroke-linejoin="round"
           style="margin: 0 auto var(--space-4); display: block; opacity: 0.4;">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8
                 a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      </svg>
      <p style="font-size: var(--font-size-base); font-weight: var(--font-weight-medium);
                margin-bottom: var(--space-1);">
        ${hasFilters ? 'No matching commodities' : 'No commodities yet'}
      </p>
      <p style="font-size: var(--font-size-sm);">
        ${hasFilters
          ? 'Try adjusting your search or filter.'
          : 'Click "Add Commodity" to register the first one.'}
      </p>
    </div>
  `;
}

// ── Filter logic ──────────────────────────────────────────────────────────────

function _applyFilters() {
  const q = _search.toLowerCase();
  return _commodities.filter(c => {
    const matchSearch = !q
      || c.name.toLowerCase().includes(q)
      || c.commodity_code.toLowerCase().includes(q);
    const matchCategory = _category === 'all' || c.category === _category;
    return matchSearch && matchCategory;
  });
}

// ── Page-level event listeners ────────────────────────────────────────────────

function _attachPageListeners(content) {
  // Add Commodity button
  document.getElementById('add-commodity-btn')
    ?.addEventListener('click', () => _openModal('add'));

  // Live search
  document.getElementById('commodity-search')
    ?.addEventListener('input', e => {
      _search = e.target.value;
      _refreshTable();
    });

  // Category filter
  document.getElementById('commodity-category-filter')
    ?.addEventListener('change', e => {
      _category = e.target.value;
      _refreshTable();
    });

  // Edit / Delete buttons (event delegation on table region)
  document.getElementById('commodity-table-region')
    ?.addEventListener('click', e => {
      const editBtn   = e.target.closest('.edit-commodity-btn');
      const deleteBtn = e.target.closest('.delete-commodity-btn');

      if (editBtn) {
        const commodity = _commodities.find(c => c.id === editBtn.dataset.id);
        if (commodity) _openModal('edit', commodity);
      }

      if (deleteBtn) {
        const commodity = _commodities.find(c => c.id === deleteBtn.dataset.id);
        if (commodity) _confirmDelete(commodity);
      }
    });
}

// Re-render just the table region without touching the rest of the page
function _refreshTable() {
  const region = document.getElementById('commodity-table-region');
  if (!region) return;
  const filtered = _applyFilters();

  // Update count line
  const countEl = document.querySelector('[data-count-label]');
  if (countEl) countEl.textContent = `Showing ${filtered.length} of ${_commodities.length} commodities`;

  region.innerHTML = filtered.length === 0 ? _renderEmpty() : _renderTable(filtered);
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function _openModal(mode, commodity = null) {
  _closeModal();   // remove any existing modal first

  const isEdit  = mode === 'edit';
  const title   = isEdit ? 'Edit Commodity' : 'Add Commodity';

  const overlay = document.createElement('div');
  overlay.className  = 'modal-overlay';
  overlay.id         = 'commodity-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', title);

  overlay.innerHTML = `
    <div class="modal" style="max-width: 520px; width: 100%;">
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

      <form id="commodity-form" novalidate>
        <div class="modal-body" style="display: flex; flex-direction: column; gap: var(--space-4);">

          <!-- Row: Code + Name -->
          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: var(--space-3);">
            <div class="form-group">
              <label for="field-code" class="form-label form-label--required">Code</label>
              <input
                type="text"
                id="field-code"
                name="commodity_code"
                class="form-input"
                placeholder="e.g. VA-CAP"
                value="${_escHtml(commodity?.commodity_code ?? '')}"
                maxlength="20"
                style="text-transform: uppercase;"
                required
              />
              <span class="form-error" id="error-code" role="alert"></span>
            </div>
            <div class="form-group">
              <label for="field-name" class="form-label form-label--required">Name</label>
              <input
                type="text"
                id="field-name"
                name="name"
                class="form-input"
                placeholder="e.g. Vitamin A Capsule"
                value="${_escHtml(commodity?.name ?? '')}"
                maxlength="100"
                required
              />
              <span class="form-error" id="error-name" role="alert"></span>
            </div>
          </div>

          <!-- Row: Category + Unit -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
            <div class="form-group">
              <label for="field-category" class="form-label form-label--required">Category</label>
              <select id="field-category" name="category" class="form-input" required>
                <option value="">Select category</option>
                ${COMMODITY_CATEGORIES.map(cat =>
                  `<option value="${cat}" ${commodity?.category === cat ? 'selected' : ''}>${cat}</option>`
                ).join('')}
              </select>
              <span class="form-error" id="error-category" role="alert"></span>
            </div>
            <div class="form-group">
              <label for="field-unit" class="form-label form-label--required">Unit</label>
              <select id="field-unit" name="unit" class="form-input" required>
                <option value="">Select unit</option>
                ${COMMODITY_UNITS.map(u =>
                  `<option value="${u}" ${commodity?.unit === u ? 'selected' : ''}>${u}</option>`
                ).join('')}
              </select>
              <span class="form-error" id="error-unit" role="alert"></span>
            </div>
          </div>

          <!-- Description -->
          <div class="form-group">
            <label for="field-description" class="form-label">Description <span style="color: var(--color-text-muted); font-weight: normal;">(optional)</span></label>
            <textarea
              id="field-description"
              name="description"
              class="form-input"
              placeholder="Brief description of this commodity..."
              rows="3"
              maxlength="500"
              style="resize: vertical;"
            >${_escHtml(commodity?.description ?? '')}</textarea>
          </div>

          <!-- Form-level error -->
          <div id="form-error-alert" class="alert alert-error" style="display: none;">
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
            <span id="modal-submit-text">${isEdit ? 'Save Changes' : 'Add Commodity'}</span>
            <span id="modal-submit-spinner" class="spinner" style="display: none;" aria-hidden="true"></span>
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  // Focus first focusable element
  setTimeout(() => document.getElementById('field-code')?.focus(), 50);

  // Close on overlay backdrop click
  overlay.addEventListener('click', e => {
    if (e.target === overlay) _closeModal();
  });

  // Close button
  document.getElementById('modal-close-btn')
    ?.addEventListener('click', _closeModal);
  document.getElementById('modal-cancel-btn')
    ?.addEventListener('click', _closeModal);

  // Auto-uppercase code field
  document.getElementById('field-code')
    ?.addEventListener('input', e => {
      const pos = e.target.selectionStart;
      e.target.value = e.target.value.toUpperCase();
      e.target.setSelectionRange(pos, pos);
    });

  // Escape key closes modal
  overlay._escHandler = e => { if (e.key === 'Escape') _closeModal(); };
  document.addEventListener('keydown', overlay._escHandler);

  // Form submission
  document.getElementById('commodity-form')
    ?.addEventListener('submit', e => _handleSubmit(e, mode, commodity?.id ?? null));
}

function _closeModal() {
  const overlay = document.getElementById('commodity-modal-overlay');
  if (!overlay) return;
  if (overlay._escHandler) document.removeEventListener('keydown', overlay._escHandler);
  overlay.remove();
}

// ── Form submit ───────────────────────────────────────────────────────────────

async function _handleSubmit(e, mode, commodityId) {
  e.preventDefault();

  const form     = e.target;
  const formData = Object.fromEntries(new FormData(form));

  // Client-side validation
  let valid = true;

  if (!formData.commodity_code?.trim()) {
    _setFieldError('field-code', 'error-code', 'Code is required.');
    valid = false;
  }
  if (!formData.name?.trim()) {
    _setFieldError('field-name', 'error-name', 'Name is required.');
    valid = false;
  }
  if (!formData.category) {
    _setFieldError('field-category', 'error-category', 'Category is required.');
    valid = false;
  }
  if (!formData.unit) {
    _setFieldError('field-unit', 'error-unit', 'Unit is required.');
    valid = false;
  }

  if (!valid) return;

  _clearFieldErrors();
  _setModalLoading(true, mode);

  let result;
  if (mode === 'add') {
    result = await createCommodity(formData, _profile);
  } else {
    result = await updateCommodity(commodityId, formData, _profile);
  }

  _setModalLoading(false, mode);

  if (result.error) {
    _showFormError(result.error);
    return;
  }

  // Update local state
  if (mode === 'add') {
    _commodities.unshift(result.commodity);
    _commodities.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    const idx = _commodities.findIndex(c => c.id === result.commodity.id);
    if (idx !== -1) _commodities[idx] = result.commodity;
    _commodities.sort((a, b) => a.name.localeCompare(b.name));
  }

  _closeModal();
  _refreshTable();

  // Update subtitle count
  const subtitle = document.querySelector('.page-header__subtitle');
  if (subtitle) {
    subtitle.textContent =
      `${_commodities.length} commodity type${_commodities.length !== 1 ? 's' : ''} registered`;
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function _confirmDelete(commodity) {
  const confirmed = window.confirm(
    `Delete "${commodity.name}" (${commodity.commodity_code})?\n\nThis action cannot be undone.`
  );
  if (!confirmed) return;

  const { error } = await deleteCommodity(
    commodity.id,
    commodity.name,
    commodity.commodity_code,
    _profile
  );

  if (error) {
    alert(error);
    return;
  }

  _commodities = _commodities.filter(c => c.id !== commodity.id);
  _refreshTable();

  const subtitle = document.querySelector('.page-header__subtitle');
  if (subtitle) {
    subtitle.textContent =
      `${_commodities.length} commodity type${_commodities.length !== 1 ? 's' : ''} registered`;
  }
}

// ── Utility helpers ───────────────────────────────────────────────────────────

function _setFieldError(inputId, errorId, message) {
  document.getElementById(inputId)?.classList.add('form-input--error');
  const el = document.getElementById(errorId);
  if (el) el.textContent = message;
}

function _clearFieldErrors() {
  document.querySelectorAll('.form-input--error').forEach(el =>
    el.classList.remove('form-input--error')
  );
  ['error-code', 'error-name', 'error-category', 'error-unit'].forEach(id => {
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
    msg.textContent    = message;
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

  if (text)    text.textContent      = isLoading ? 'Saving...' : (mode === 'add' ? 'Add Commodity' : 'Save Changes');
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

/** Escape HTML to prevent XSS in interpolated strings. */
function _escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
