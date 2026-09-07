/**
 * Commodity Management - Modals (Interactions)
 *
 * Dedicated handling for Commodity Add/Edit modal dialogs.
 * Features automated MNAO SKU generation instantly upon Product Name entry,
 * with smart unit and category inference from product title keywords.
 */

import { escapeHtml, getDynamicCategories, getDynamicUnits } from './commodities.render.js';
import { createCommodity, updateCommodity } from './commodities.service.js';
import { generateCommoditySKU } from '../../shared/utils/code-generator.util.js';

let _activeModalEscHandler = null;

const KNOWN_UNITS = [
  { regex: /\b(?:tablets?|tabs?)\b/i, unit: 'Tablet' },
  { regex: /\b(?:capsules?|caps?)\b/i, unit: 'Capsule' },
  { regex: /\b(?:sachets?)\b/i, unit: 'Sachet' },
  { regex: /\b(?:bottles?|bots?)\b/i, unit: 'Bottle' },
  { regex: /\b(?:boxes|box)\b/i, unit: 'Box' },
  { regex: /\b(?:packs?|pks?)\b/i, unit: 'Pack' },
  { regex: /\b(?:pieces?|pcs?)\b/i, unit: 'Piece' },
  { regex: /\b(?:kilograms?|kgs?)\b/i, unit: 'Kilogram' },
  { regex: /\b(?:grams?|gms?)\b/i, unit: 'Gram' },
  { regex: /\b(?:liters?|litres?)\b/i, unit: 'Liter' },
  { regex: /\b(?:milliliters?|mls?)\b/i, unit: 'Milliliter' },
  { regex: /\b(?:vials?)\b/i, unit: 'Vial' },
  { regex: /\b(?:ampoules?|amps?)\b/i, unit: 'Ampoule' },
  { regex: /\b(?:sacks?|bags?)\b/i, unit: 'Sack' },
  { regex: /\b(?:jars?)\b/i, unit: 'Jar' },
  { regex: /\b(?:tubes?)\b/i, unit: 'Tube' },
  { regex: /\b(?:tins?|cans?)\b/i, unit: 'Can' },
];

const KNOWN_CATEGORIES = [
  { regex: /\b(?:vitamin|retinol|ascorbic|cholecalciferol|tocopherol)\b/i, category: 'Vitamins' },
  { regex: /\b(?:iron|zinc|calcium|folic|ferrous|iodine|potassium|magnesium)\b/i, category: 'Minerals' },
  { regex: /\b(?:rutf|rusf|paste|eezeepaste|f-75|f-100|therapeutic|rehydration)\b/i, category: 'Therapeutics' },
  { regex: /\b(?:powder|supplement|porridge|champorado|micronutrient|mnp)\b/i, category: 'Supplements' },
  { regex: /\b(?:scale|height|tape|muac|strip|salter|board|caliper|equipment)\b/i, category: 'Equipment' },
];

/**
 * Extracts packaging unit from raw commodity product title if present.
 */
function extractUnitFromName(name) {
  if (!name) return null;
  for (const item of KNOWN_UNITS) {
    if (item.regex.test(name)) return item.unit;
  }
  return null;
}

/**
 * Extracts category from raw commodity product title if present.
 */
function extractCategoryFromName(name) {
  if (!name) return null;
  for (const item of KNOWN_CATEGORIES) {
    if (item.regex.test(name)) return item.category;
  }
  return null;
}

/**
 * Deterministically derives standard SKU from product name and optional unit.
 */
function deriveSKU(name, unit) {
  if (!name || !name.trim()) return '';
  const cleanName = name.trim();

  // 1. If explicit or detected unit exists
  const effectiveUnit = (unit || extractUnitFromName(cleanName) || '').trim();
  const upperUnit = effectiveUnit.toUpperCase();
  if (effectiveUnit && !['UNT', 'TBD', 'N/A', 'NA', 'NONE', '-'].includes(upperUnit)) {
    try {
      return generateCommoditySKU(cleanName, effectiveUnit);
    } catch {}
  }

  // 2. Direct fallback derivation using acronym rules
  const STOP_WORDS = new Set(['WITH', 'AND', 'FOR', 'THE', 'OF', 'IN', 'TO', 'A', 'AN']);
  const sanitizedName = cleanName.replace(/[-_()[\],.;:!?'"\\/]/g, ' ');
  const rawWords = sanitizedName.trim().split(/\s+/).filter(Boolean);
  const words = rawWords.filter(w => !STOP_WORDS.has(w.toUpperCase()));

  let acronym = '';
  if (words.length > 1) {
    acronym = words.slice(0, 4).map(w => w.replace(/[^a-zA-Z0-9]/g, '')[0] || '').join('').toUpperCase();
  } else if (words.length === 1) {
    const word = words[0].toUpperCase();
    const consonants = word.replace(/[^BCDFGHJKLMNPQRSTVWXYZ]/g, '');
    acronym = consonants.length >= 3 ? consonants.slice(0, 3) : word.replace(/[^A-Z0-9]/g, '').slice(0, 3);
  } else {
    acronym = (rawWords[0] || 'COMM').toUpperCase().slice(0, 3);
  }

  return acronym ? `${acronym}-ITEM` : '';
}

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
  let isManualCodeOverride = isEdit && Boolean(commodity?.commodity_code);

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
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-1);">
                <label for="field-code" class="form-label form-label--required" style="margin-bottom:0;">Code</label>
                <button type="button" id="btn-sync-code" style="background:none; border:none; padding:0; font-size:11px; font-weight:600; color:var(--color-primary); cursor:pointer; display:inline-flex; align-items:center; gap:3px;" title="Click to auto-generate from Name">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                  <span id="code-badge-text">${isManualCodeOverride ? 'Custom' : 'Auto'}</span>
                </button>
              </div>
              <input
                type="text"
                id="field-code"
                name="commodity_code"
                class="form-input"
                placeholder="e.g. IRON-TAB"
                value="${escapeHtml(commodity?.commodity_code ?? '')}"
                maxlength="20"
                style="text-transform: uppercase; font-family: monospace; font-weight: 600;"
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
                placeholder="e.g. Iron with Folic Acid Tablet"
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

  const nameInput     = document.getElementById('field-name');
  const unitInput     = document.getElementById('field-unit');
  const categoryInput = document.getElementById('field-category');
  const codeInput     = document.getElementById('field-code');
  const badgeText     = document.getElementById('code-badge-text');
  const syncBtn       = document.getElementById('btn-sync-code');

  // Focus Name input first so staff can start typing immediately
  setTimeout(() => nameInput?.focus(), 50);

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });

  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', closeModal);

  // Instantly generate Code, and auto-infer Unit & Category when Product Name is placed
  function handleNameUpdate(force = false) {
    const rawName = nameInput?.value?.trim() || '';
    if (!rawName) {
      if (codeInput && !isManualCodeOverride) codeInput.value = '';
      return;
    }

    // 1. Auto-infer Unit from Name if Unit is empty
    if (unitInput && !unitInput.value.trim()) {
      const detectedUnit = extractUnitFromName(rawName);
      if (detectedUnit) {
        unitInput.value = detectedUnit;
        unitInput.classList.remove('form-input--error');
        const errUnit = document.getElementById('error-unit');
        if (errUnit) errUnit.textContent = '';
      }
    }

    // 2. Auto-infer Category from Name if Category is empty
    if (categoryInput && !categoryInput.value.trim()) {
      const detectedCategory = extractCategoryFromName(rawName);
      if (detectedCategory) {
        categoryInput.value = detectedCategory;
        categoryInput.classList.remove('form-input--error');
        const errCat = document.getElementById('error-category');
        if (errCat) errCat.textContent = '';
      }
    }

    // 3. Immediately generate Code once Product Name is placed
    if (!isManualCodeOverride || force) {
      const sku = deriveSKU(rawName, unitInput?.value);
      if (sku && codeInput) {
        codeInput.value = sku;
        codeInput.classList.remove('form-input--error');
        const errCode = document.getElementById('error-code');
        if (errCode) errCode.textContent = '';
        if (badgeText) badgeText.textContent = 'Auto';
      }
    }
  }

  // Reactive listeners
  nameInput?.addEventListener('input', () => handleNameUpdate());
  nameInput?.addEventListener('change', () => handleNameUpdate());

  unitInput?.addEventListener('input', () => {
    if (!isManualCodeOverride) {
      const rawName = nameInput?.value?.trim() || '';
      const sku = deriveSKU(rawName, unitInput.value);
      if (sku && codeInput) codeInput.value = sku;
    }
  });
  unitInput?.addEventListener('change', () => {
    if (!isManualCodeOverride) {
      const rawName = nameInput?.value?.trim() || '';
      const sku = deriveSKU(rawName, unitInput.value);
      if (sku && codeInput) codeInput.value = sku;
    }
  });

  // Manual code override handling
  codeInput?.addEventListener('input', e => {
    isManualCodeOverride = true;
    if (badgeText) badgeText.textContent = 'Custom';
    const pos = e.target.selectionStart;
    e.target.value = e.target.value.toUpperCase();
    e.target.setSelectionRange(pos, pos);
  });

  // Force re-sync to Auto
  syncBtn?.addEventListener('click', () => {
    isManualCodeOverride = false;
    handleNameUpdate(true);
  });

  _activeModalEscHandler = e => { if (e.key === 'Escape') closeModal(); };
  document.addEventListener('keydown', _activeModalEscHandler);

  document.getElementById('commodity-form')?.addEventListener('submit', async e => {
    e.preventDefault();

    const form     = e.target;
    const formData = Object.fromEntries(new FormData(form));

    // Final inference passes before submission
    if (!formData.unit?.trim() && formData.name) {
      const detectedUnit = extractUnitFromName(formData.name);
      if (detectedUnit) {
        formData.unit = detectedUnit;
        if (unitInput) unitInput.value = detectedUnit;
      }
    }

    if (!formData.category?.trim() && formData.name) {
      const detectedCat = extractCategoryFromName(formData.name);
      if (detectedCat) {
        formData.category = detectedCat;
        if (categoryInput) categoryInput.value = detectedCat;
      }
    }

    if (!formData.commodity_code?.trim() && formData.name) {
      formData.commodity_code = deriveSKU(formData.name, formData.unit);
      if (codeInput) codeInput.value = formData.commodity_code;
    }

    let valid = true;
    if (!formData.name?.trim()) {
      setFieldError('field-name', 'error-name', 'Name is required.');
      valid = false;
    }
    if (!formData.commodity_code?.trim()) {
      setFieldError('field-code', 'error-code', 'Code is required.');
      valid = false;
    }
    if (!formData.unit?.trim()) {
      setFieldError('field-unit', 'error-unit', 'Unit is required.');
      valid = false;
    }
    if (!formData.category?.trim()) {
      setFieldError('field-category', 'error-category', 'Category is required.');
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
