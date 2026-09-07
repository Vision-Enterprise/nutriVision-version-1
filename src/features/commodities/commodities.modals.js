/**
 * Commodity Management - Modals (Interactions)
 *
 * Dedicated handling for Commodity Add/Edit modal dialogs.
 */

import { escapeHtml, getDynamicCategories, getDynamicUnits } from './commodities.render.js';
import { createCommodity, updateCommodity } from './commodities.service.js';

let _activeModalEscHandler = null;

export function closeModal() {
  const overlay = document.getElementById('commodity-modal-overlay');
  if (!overlay) return;
  if (_activeModalEscHandler) {
    document.removeEventListener('keydown', _activeModalEscHandler);
    _activeModalEscHandler = null;
  }
  overlay.remove();
}

/**
 * Open the Add or Edit Commodity Modal.
 *
 * @param {Object} options
 * @param {'add'|'edit'} options.mode
 * @param {Object|null} options.commodity
 * @param {Array} options.commodities
 * @param {Object} options.profile
 * @param {Function} options.onSuccess Callback returning saved commodity: (savedItem, mode) => void
 */
export function openCommodityModal({ mode = 'add', commodity = null, commodities = [], profile, onSuccess }) {
  closeModal();

  const isEdit = mode === 'edit';
  const title  = isEdit ? 'Edit Commodity' : 'Add Commodity';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id        = 'commodity-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', title);

  const categories = getDynamicCategories(commodities);
  const units      = getDynamicUnits(commodities);

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
                value="${escapeHtml(commodity?.commodity_code ?? '')}"
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
                value="${escapeHtml(commodity?.name ?? '')}"
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
              <input list="category-options" id="field-category" name="category" class="form-input" placeholder="Select or type category" value="${escapeHtml(commodity?.category ?? '')}" required autocomplete="off" />
                <datalist id="category-options">
                  ${categories.map(cat => `<option value="${cat}"></option>`).join('')}
                </datalist>
              <span class="form-error" id="error-category" role="alert"></span>
            </div>
            <div class="form-group">
              <label for="field-unit" class="form-label form-label--required">Unit</label>
              <input list="unit-options" id="field-unit" name="unit" class="form-input" placeholder="Select or type unit" value="${escapeHtml(commodity?.unit ?? '')}" required autocomplete="off" />
                <datalist id="unit-options">
                  ${units.map(u => `<option value="${u}"></option>`).join('')}
                </datalist>
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
            >${escapeHtml(commodity?.description ?? '')}</textarea>
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

  setTimeout(() => document.getElementById('field-code')?.focus(), 50);

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });

  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', closeModal);

  document.getElementById('field-code')?.addEventListener('input', e => {
    const pos = e.target.selectionStart;
    e.target.value = e.target.value.toUpperCase();
    e.target.setSelectionRange(pos, pos);
  });

  _activeModalEscHandler = e => { if (e.key === 'Escape') closeModal(); };
  document.addEventListener('keydown', _activeModalEscHandler);

  document.getElementById('commodity-form')?.addEventListener('submit', async e => {
    e.preventDefault();

    const form     = e.target;
    const formData = Object.fromEntries(new FormData(form));

    let valid = true;
    if (!formData.commodity_code?.trim()) {
      setFieldError('field-code', 'error-code', 'Code is required.');
      valid = false;
    }
    if (!formData.name?.trim()) {
      setFieldError('field-name', 'error-name', 'Name is required.');
      valid = false;
    }
    if (!formData.category) {
      setFieldError('field-category', 'error-category', 'Category is required.');
      valid = false;
    }
    if (!formData.unit) {
      setFieldError('field-unit', 'error-unit', 'Unit is required.');
      valid = false;
    }

    if (!valid) return;

    clearFieldErrors();
    setModalLoading(true, mode);

    let result;
    if (mode === 'add') {
      result = await createCommodity(formData, profile);
    } else {
      result = await updateCommodity(commodity?.id, formData, profile);
    }

    setModalLoading(false, mode);

    if (result.error) {
      showFormError(result.error);
      return;
    }

    closeModal();
    if (typeof onSuccess === 'function') {
      onSuccess(result.commodity, mode);
    }
  });
}

function setFieldError(inputId, errorId, message) {
  document.getElementById(inputId)?.classList.add('form-input--error');
  const el = document.getElementById(errorId);
  if (el) el.textContent = message;
}

function clearFieldErrors() {
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

function showFormError(message) {
  const alert = document.getElementById('form-error-alert');
  const msg   = document.getElementById('form-error-msg');
  if (alert && msg) {
    msg.textContent    = message;
    alert.style.display = 'flex';
    alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function setModalLoading(isLoading, mode) {
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
