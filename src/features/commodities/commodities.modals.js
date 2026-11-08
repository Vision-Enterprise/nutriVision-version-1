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
import { setupCreatableCombobox } from '../../shared/components/combobox.component.js';
import { SHELF_LIFE_MODES } from '../../shared/constants/app.constants.js';
import {
  SHELF_LIFE_PROFILES,
  resolveShelfLifePolicy,
  formatPolicyRanges,
  isNutribunName,
} from '../../shared/utils/shelf-life.utils.js';
import {
  compressCommodityImage,
  getCategoryArtwork,
} from './commodity-image.utils.js';

let _activeModalEscHandler = null;
let _activeComboboxes = [];

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
  { regex: /\b(?:e-?nutri[\s-]?buns?|nutri[\s-]?buns?|buns?|loaves|loaf)\b/i, unit: 'Piece' },
];

const KNOWN_CATEGORIES = [
  { regex: /\b(?:e-?nutri[\s-]?buns?|nutri[\s-]?buns?|breads?|buns?|pastry|pastries|bakery|pandecoco|pandesal)\b/i, category: 'Bakery / Perishables' },
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
  _activeComboboxes.forEach(cb => cb?.destroy?.());
  _activeComboboxes = [];
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
  let isManualPolicyOverride = isEdit;
  let currentImageUrl = commodity?.image_url ? String(commodity.image_url).trim() : null;
  let imageModified = false;

  const initialPolicy = isEdit
    ? resolveShelfLifePolicy(commodity)
    : SHELF_LIFE_PROFILES[SHELF_LIFE_MODES.STANDARD];
  const initialCustomGood  = initialPolicy.mode === SHELF_LIFE_MODES.CUSTOM ? initialPolicy.goodDays : 30;
  const initialCustomNear  = initialPolicy.mode === SHELF_LIFE_MODES.CUSTOM ? initialPolicy.nearExpiryDays : 10;
  const initialCustomShelf = initialPolicy.mode === SHELF_LIFE_MODES.CUSTOM && initialPolicy.defaultShelfLifeDays
    ? initialPolicy.defaultShelfLifeDays
    : '';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id        = 'commodity-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', title);

  const categories = getDynamicCategories(commodities);
  const units      = getDynamicUnits(commodities);

  overlay.innerHTML = `
    <div class="modal" style="max-width: 560px; width: 100%;">
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

          <!-- Commodity Image Uploader (#87) -->
          <div class="form-group">
            <label class="form-label" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-1);">
              <span>Commodity Image <span style="color: var(--color-text-muted); font-weight: normal;">(optional)</span></span>
              <span style="font-size: 11px; font-weight: 500; color: var(--color-text-muted);">Category illustration used by default</span>
            </label>
            <div class="commodity-photo-uploader" id="commodity-photo-dropzone">
              <div class="commodity-photo-uploader__preview" id="commodity-photo-preview"></div>
              <div style="display:flex; flex-direction:column; gap:6px; flex:1; min-width:0;">
                <div style="display:flex; align-items:center; flex-wrap:wrap; gap:8px;">
                  <button type="button" id="btn-upload-commodity-photo" class="btn btn-secondary btn-sm">
                    <span class="icon" style="font-size:15px;" aria-hidden="true">upload</span>
                    <span id="commodity-photo-btn-label">${currentImageUrl ? 'Change Photo' : 'Upload Photo'}</span>
                  </button>
                  <button type="button" id="btn-remove-commodity-photo" class="btn btn-ghost btn-sm"
                          style="display:${currentImageUrl ? 'inline-flex' : 'none'}; color:var(--color-danger);">
                    Remove Photo
                  </button>
                  <input type="file" id="field-commodity-photo" accept="image/jpeg,image/png,image/webp,image/gif" style="display:none;" />
                </div>
                <span style="font-size:11.5px; color:var(--color-text-muted); line-height:1.35;">
                  JPG, PNG, or WebP (or drag &amp; drop here). Automatically resized for fast card loading.
                </span>
                <span class="form-error" id="error-photo" role="alert"></span>
              </div>
            </div>
          </div>

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
              <input type="text" id="field-category" name="category" class="form-input" placeholder="Select or type category" value="${escapeHtml(commodity?.category ?? '')}" required autocomplete="off" />
              <span class="form-error" id="error-category" role="alert"></span>
            </div>
            <div class="form-group">
              <label for="field-unit" class="form-label form-label--required">Unit</label>
              <input type="text" id="field-unit" name="unit" class="form-input" placeholder="Select or type unit" value="${escapeHtml(commodity?.unit ?? '')}" required autocomplete="off" />
              <span class="form-error" id="error-unit" role="alert"></span>
            </div>
          </div>

          <!-- Shelf-Life & Expiration Status Policy (#98) -->
          <div class="form-group" style="background: var(--color-surface-alt); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-md); padding: var(--space-3);">
            <label for="field-shelf-policy" class="form-label" style="margin-bottom: var(--space-1); display:flex; align-items:center; justify-content:space-between;">
              <span>Shelf-Life &amp; Status Policy</span>
              <span style="font-size: 11px; font-weight: 500; color: var(--color-text-muted);">FEFO Traffic-Light Basis</span>
            </label>
            <select id="field-shelf-policy" name="shelf_policy_mode" class="form-input" style="cursor: pointer;">
              <option value="${SHELF_LIFE_MODES.STANDARD}" ${initialPolicy.mode === SHELF_LIFE_MODES.STANDARD ? 'selected' : ''}>
                Standard Shelf-Stable (Good &gt;180d, Mod 91–180d, Near ≤90d)
              </option>
              <option value="${SHELF_LIFE_MODES.WEEKLY_PERISHABLE}" ${initialPolicy.mode === SHELF_LIFE_MODES.WEEKLY_PERISHABLE ? 'selected' : ''}>
                Weekly Perishable / Nutribun (7-Day Dispatch)
              </option>
              <option value="${SHELF_LIFE_MODES.CHILLED_SHORT}" ${initialPolicy.mode === SHELF_LIFE_MODES.CHILLED_SHORT ? 'selected' : ''}>
                Chilled / Short-Term Perishable (14-Day RSL%)
              </option>
              <option value="${SHELF_LIFE_MODES.CUSTOM}" ${initialPolicy.mode === SHELF_LIFE_MODES.CUSTOM ? 'selected' : ''}>
                Custom Thresholds (Configure Days)
              </option>
            </select>

            <!-- Custom Threshold Inputs -->
            <div id="shelf-custom-fields" style="display: ${initialPolicy.mode === SHELF_LIFE_MODES.CUSTOM ? 'grid' : 'none'}; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-2); margin-top: var(--space-3);">
              <div>
                <label for="field-custom-good" class="form-label form-label--required" style="font-size: 11px; margin-bottom: 3px;">Good Above (d)</label>
                <input type="number" id="field-custom-good" class="form-input" min="2" max="3650" step="1" value="${initialCustomGood}" placeholder="e.g. 30" />
              </div>
              <div>
                <label for="field-custom-near" class="form-label form-label--required" style="font-size: 11px; margin-bottom: 3px;">Near Expiry ≤ (d)</label>
                <input type="number" id="field-custom-near" class="form-input" min="1" max="3649" step="1" value="${initialCustomNear}" placeholder="e.g. 10" />
              </div>
              <div>
                <label for="field-custom-shelf" class="form-label" style="font-size: 11px; margin-bottom: 3px;">Auto-Exp (+d)</label>
                <input type="number" id="field-custom-shelf" class="form-input" min="1" max="3650" step="1" value="${initialCustomShelf}" placeholder="Manual" title="Optional: auto-fills Expiration Date = Delivery Date + N days during intake" />
              </div>
            </div>
            <span class="form-error" id="error-shelf-custom" role="alert"></span>

            <!-- Live 4-Tier Traffic-Light Preview -->
            <div id="shelf-policy-preview" style="margin-top: var(--space-2); padding-top: var(--space-2); border-top: 1px dashed var(--color-border); font-size: 11.5px; color: var(--color-text-muted); line-height: 1.5;"></div>
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
  const policySelect  = document.getElementById('field-shelf-policy');
  const customWrap    = document.getElementById('shelf-custom-fields');
  const customGoodIn  = document.getElementById('field-custom-good');
  const customNearIn  = document.getElementById('field-custom-near');
  const customShelfIn = document.getElementById('field-custom-shelf');
  const policyPreview = document.getElementById('shelf-policy-preview');
  const photoPreview  = document.getElementById('commodity-photo-preview');
  const photoDropzone = document.getElementById('commodity-photo-dropzone');
  const photoFileIn   = document.getElementById('field-commodity-photo');
  const photoUploadBtn = document.getElementById('btn-upload-commodity-photo');
  const photoRemoveBtn = document.getElementById('btn-remove-commodity-photo');
  const photoBtnLabel  = document.getElementById('commodity-photo-btn-label');
  const photoErrEl     = document.getElementById('error-photo');

  function updatePhotoPreview() {
    if (!photoPreview) return;
    if (currentImageUrl) {
      photoPreview.style.background = '#ffffff';
      photoPreview.innerHTML = `<img src="${escapeHtml(currentImageUrl)}" alt="Commodity preview" />`;
      if (photoBtnLabel) photoBtnLabel.textContent = 'Change Photo';
      if (photoRemoveBtn) photoRemoveBtn.style.display = 'inline-flex';
    } else {
      const art = getCategoryArtwork({
        category: categoryInput?.value || commodity?.category || '',
        name: nameInput?.value || commodity?.name || '',
      });
      photoPreview.style.background = art.bgGradient;
      photoPreview.innerHTML = art.svgHtml;
      if (photoBtnLabel) photoBtnLabel.textContent = 'Upload Photo';
      if (photoRemoveBtn) photoRemoveBtn.style.display = 'none';
    }
  }

  async function handleSelectedPhotoFile(file) {
    if (!file) return;
    if (photoErrEl) photoErrEl.textContent = '';
    try {
      const compressedDataUrl = await compressCommodityImage(file);
      currentImageUrl = compressedDataUrl;
      imageModified = true;
      updatePhotoPreview();
    } catch (err) {
      if (photoErrEl) photoErrEl.textContent = err?.message || 'Could not process image.';
    } finally {
      if (photoFileIn) photoFileIn.value = '';
    }
  }

  updatePhotoPreview();

  photoUploadBtn?.addEventListener('click', () => photoFileIn?.click());
  photoFileIn?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (file) handleSelectedPhotoFile(file);
  });
  photoRemoveBtn?.addEventListener('click', () => {
    currentImageUrl = null;
    imageModified = true;
    if (photoErrEl) photoErrEl.textContent = '';
    updatePhotoPreview();
  });
  photoDropzone?.addEventListener('dragover', e => {
    e.preventDefault();
    photoDropzone.classList.add('is-dragover');
  });
  photoDropzone?.addEventListener('dragleave', () => {
    photoDropzone.classList.remove('is-dragover');
  });
  photoDropzone?.addEventListener('drop', e => {
    e.preventDefault();
    photoDropzone.classList.remove('is-dragover');
    const file = e.dataTransfer?.files?.[0];
    if (file) handleSelectedPhotoFile(file);
  });

  function getActivePolicyDraft() {
    const selMode = policySelect?.value || SHELF_LIFE_MODES.STANDARD;
    if (selMode === SHELF_LIFE_MODES.CUSTOM) {
      const good = parseInt(customGoodIn?.value, 10);
      const near = parseInt(customNearIn?.value, 10);
      const shelf = customShelfIn?.value?.trim() ? parseInt(customShelfIn.value, 10) : null;
      return {
        mode: SHELF_LIFE_MODES.CUSTOM,
        goodDays: !isNaN(good) && good > 0 ? good : 30,
        nearExpiryDays: !isNaN(near) && near > 0 ? near : 10,
        defaultShelfLifeDays: shelf && !isNaN(shelf) && shelf > 0 ? shelf : null,
      };
    }
    return SHELF_LIFE_PROFILES[selMode] || SHELF_LIFE_PROFILES[SHELF_LIFE_MODES.STANDARD];
  }

  function updatePolicyPreview() {
    const selMode = policySelect?.value || SHELF_LIFE_MODES.STANDARD;
    if (customWrap) {
      customWrap.style.display = selMode === SHELF_LIFE_MODES.CUSTOM ? 'grid' : 'none';
    }
    if (!policyPreview) return;
    const draft = getActivePolicyDraft();
    const ranges = formatPolicyRanges(draft);
    policyPreview.innerHTML = `
      <div style="display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin-bottom:4px;">
        <span style="display:inline-flex; align-items:center; gap:4px;"><span class="badge badge-good" style="font-size:10px; padding:1px 6px; margin:0;">Good</span> ${escapeHtml(ranges.goodRange)}</span>
        <span style="display:inline-flex; align-items:center; gap:4px;"><span class="badge badge-moderate" style="font-size:10px; padding:1px 6px; margin:0;">Moderate</span> ${escapeHtml(ranges.moderateRange)}</span>
        <span style="display:inline-flex; align-items:center; gap:4px;"><span class="badge badge-near-expiry" style="font-size:10px; padding:1px 6px; margin:0;">Near Expiry</span> ${escapeHtml(ranges.nearRange)}</span>
        <span style="display:inline-flex; align-items:center; gap:4px;"><span class="badge badge-expired" style="font-size:10px; padding:1px 6px; margin:0;">Expired</span> ${escapeHtml(ranges.expiredRange)}</span>
      </div>
      <div style="font-size:11px; color:var(--color-text-secondary);">${escapeHtml(ranges.autoExpText)}</div>
    `;
  }

  updatePolicyPreview();

  policySelect?.addEventListener('change', () => {
    isManualPolicyOverride = true;
    const errCustom = document.getElementById('error-shelf-custom');
    if (errCustom) errCustom.textContent = '';
    updatePolicyPreview();
  });
  [customGoodIn, customNearIn, customShelfIn].forEach(inp => {
    inp?.addEventListener('input', () => {
      const errCustom = document.getElementById('error-shelf-custom');
      if (errCustom) errCustom.textContent = '';
      updatePolicyPreview();
    });
  });

  // Focus Name input first so staff can start typing immediately
  setTimeout(() => nameInput?.focus(), 50);

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });

  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', closeModal);

  // Setup Clean Creatable Comboboxes
  const categoryCombo = setupCreatableCombobox({
    inputEl: categoryInput,
    options: categories,
    itemTypeLabel: 'category',
    onSelect: () => handleNameUpdate()
  });

  const unitCombo = setupCreatableCombobox({
    inputEl: unitInput,
    options: units,
    itemTypeLabel: 'unit',
    onSelect: () => handleNameUpdate()
  });

  _activeComboboxes = [categoryCombo, unitCombo].filter(Boolean);

  // Instantly generate Code, and auto-infer Unit & Category when Product Name is placed
  function handleNameUpdate(force = false) {
    const rawName = nameInput?.value?.trim() || '';
    if (!rawName) {
      if (codeInput && !isManualCodeOverride) codeInput.value = '';
      updatePhotoPreview();
      return;
    }

    // 1. Auto-infer Unit from Name if Unit is empty
    if (unitInput && !unitInput.value.trim()) {
      const detectedUnit = extractUnitFromName(rawName);
      if (detectedUnit) {
        unitInput.value = detectedUnit;
        unitCombo?.addOption(detectedUnit);
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
        categoryCombo?.addOption(detectedCategory);
        categoryInput.classList.remove('form-input--error');
        const errCat = document.getElementById('error-category');
        if (errCat) errCat.textContent = '';
      }
    }

    // 2b. Auto-select 7-Day Weekly Perishable policy when typing Nutribun in Add mode
    if (!isManualPolicyOverride && policySelect) {
      if (isNutribunName(rawName)) {
        policySelect.value = SHELF_LIFE_MODES.WEEKLY_PERISHABLE;
        updatePolicyPreview();
      } else if (policySelect.value === SHELF_LIFE_MODES.WEEKLY_PERISHABLE) {
        policySelect.value = SHELF_LIFE_MODES.STANDARD;
        updatePolicyPreview();
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

    updatePhotoPreview();
  }

  // Reactive listeners
  nameInput?.addEventListener('input', () => handleNameUpdate());
  nameInput?.addEventListener('change', () => handleNameUpdate());
  categoryInput?.addEventListener('input', () => updatePhotoPreview());
  categoryInput?.addEventListener('change', () => updatePhotoPreview());

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

    const selPolicyMode = policySelect?.value || SHELF_LIFE_MODES.STANDARD;
    if (selPolicyMode === SHELF_LIFE_MODES.CUSTOM) {
      const goodVal = parseInt(customGoodIn?.value, 10);
      const nearVal = parseInt(customNearIn?.value, 10);
      const shelfRaw = customShelfIn?.value?.trim() || '';
      const shelfVal = shelfRaw ? parseInt(shelfRaw, 10) : null;

      if (isNaN(nearVal) || nearVal < 1) {
        setFieldError('field-custom-near', 'error-shelf-custom', 'Near Expiry threshold must be at least 1 day.');
        valid = false;
      } else if (isNaN(goodVal) || goodVal <= nearVal) {
        setFieldError('field-custom-good', 'error-shelf-custom', 'Good threshold must be greater than Near Expiry days.');
        valid = false;
      } else if (shelfRaw && (isNaN(shelfVal) || shelfVal < 1)) {
        setFieldError('field-custom-shelf', 'error-shelf-custom', 'Auto-Expiry days must be a positive number or left blank.');
        valid = false;
      } else {
        formData.shelf_life_config = {
          mode: SHELF_LIFE_MODES.CUSTOM,
          goodDays: goodVal,
          nearExpiryDays: nearVal,
          defaultShelfLifeDays: shelfVal,
        };
      }
    } else {
      const preset = SHELF_LIFE_PROFILES[selPolicyMode] || SHELF_LIFE_PROFILES[SHELF_LIFE_MODES.STANDARD];
      formData.shelf_life_config = {
        mode: preset.mode,
        goodDays: preset.goodDays,
        nearExpiryDays: preset.nearExpiryDays,
        defaultShelfLifeDays: preset.defaultShelfLifeDays,
      };
    }

    if (!valid) return;

    if (mode === 'add') {
      formData.image_url = currentImageUrl || null;
    } else if (imageModified) {
      formData.image_url = currentImageUrl || null;
    }

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
  ['error-code', 'error-name', 'error-category', 'error-unit', 'error-shelf-custom'].forEach(id => {
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
