/**
 * Milk Bank Modals
 * Modal dialogs matching the system's established modal pattern (defects.modal.js style).
 * Blue-accented overlays with proper scrollable body, fixed header + footer.
 */

import {
  SHELF_LOCATIONS,
  DISPENSE_INDICATIONS,
  getNextBatchNumber,
  createMilkBatch,
  updateMilkBatch,
  deleteMilkBatch,
  createMilkDonation,
  dispenseMilk,
  fetchMilkBatches,
  getBatchFreezerAndShelf,
  getFreezerShelfAllocations,
  getShelfLoad,
  formatFreezerShelf
} from './milk.service.js';
import { BARANGAYS } from '../../shared/constants/app.constants.js';
import { SystemDialog } from '../../shared/components/dialog.component.js';

// ── Shared constants ──────────────────────────────────────────────────────────
const ICE_BLUE_BG   = '#e0f2fe';
const ICE_BLUE_ICON = '#0369a1';
const ICE_BLUE_BTN  = '#0284c7';
const ICE_BLUE_BTN_HOVER = '#0369a1';

// ── Helper: build the X close button SVG ─────────────────────────────────────
function _closeBtn(id) {
  return `
    <button id="${id}" type="button" aria-label="Close"
      style="background:transparent;border:none;cursor:pointer;color:var(--color-text-muted);
             padding:6px;border-radius:var(--radius-md);display:flex;align-items:center;
             justify-content:center;transition:background 0.15s ease,color 0.15s ease;flex-shrink:0;"
      onmouseover="this.style.background='var(--color-surface-alt)';this.style.color='var(--color-text)'"
      onmouseout="this.style.background='transparent';this.style.color='var(--color-text-muted)'">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;
}

// ── Helper: build error box (hidden by default) ───────────────────────────────
function _errorBox(id) {
  return `
    <div id="${id}" style="display:none;color:var(--color-danger);font-size:var(--font-size-sm);
         background:#fff5f5;border:1px solid var(--color-danger);border-radius:var(--radius-md);
         padding:10px 14px;"></div>
  `;
}

// ── Helper: modal icon circle ─────────────────────────────────────────────────
function _iconCircle(iconName) {
  return `
    <div style="width:44px;height:44px;border-radius:var(--radius-full);flex-shrink:0;
                background:${ICE_BLUE_BG};display:flex;align-items:center;justify-content:center;">
      <span class="icon" style="color:${ICE_BLUE_ICON};font-size:22px;">${iconName}</span>
    </div>
  `;
}

// ── Create and mount the overlay ──────────────────────────────────────────────
function _mount(id, innerHtml) {
  _destroy(id);
  const overlay = document.createElement('div');
  overlay.id = id;
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:8000;
    background:rgba(0,0,0,0.55);backdrop-filter:blur(3px);
    display:flex;align-items:center;justify-content:center;padding:24px;
  `;
  overlay.innerHTML = innerHtml;
  document.body.appendChild(overlay);
  return overlay;
}

function _destroy(id) {
  document.getElementById(id)?.remove();
}

// ── Modal shell template ──────────────────────────────────────────────────────
function _shell(width, headerHtml, bodyHtml, footerHtml) {
  return `
    <div style="background:var(--color-surface,#fff);border-radius:var(--radius-xl,16px);
                width:100%;max-width:${width};max-height:90vh;
                display:flex;flex-direction:column;
                box-shadow:0 24px 64px rgba(0,0,0,0.3);overflow:hidden;">

      <!-- Header (fixed) -->
      <div style="padding:var(--space-5) var(--space-6);
                  border-bottom:1px solid var(--color-border);
                  display:flex;align-items:flex-start;justify-content:space-between;
                  gap:var(--space-4);flex-shrink:0;">
        ${headerHtml}
      </div>

      <!-- Body (scrollable) -->
      <div style="padding:var(--space-6);display:flex;flex-direction:column;
                  gap:var(--space-5);flex:1;overflow-y:auto;overscroll-behavior:contain;">
        ${bodyHtml}
      </div>

      <!-- Footer (fixed) -->
      <div style="padding:var(--space-4) var(--space-6);border-top:1px solid var(--color-border);
                  display:flex;justify-content:flex-end;gap:var(--space-3);
                  flex-shrink:0;background:var(--color-surface,#fff);">
        ${footerHtml}
      </div>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL 1: New Pasteurized Batch (BM-XXX)
// ════════════════════════════════════════════════════════════════════════════
export async function openNewBatchModal({ onSave }) {
  const nextBatch  = await getNextBatchNumber();
  const today      = new Date().toISOString().split('T')[0];
  const sixMonths  = new Date();
  sixMonths.setMonth(sixMonths.getMonth() + 6);
  const expiryStr  = sixMonths.toISOString().split('T')[0];

  const shelfOptions = SHELF_LOCATIONS.map(s =>
    `<option value="${s}">${s}</option>`
  ).join('');

  const header = `
    <div style="display:flex;align-items:flex-start;gap:var(--space-4);">
      ${_iconCircle('science')}
      <div>
        <h2 style="font-size:var(--font-size-lg);font-weight:var(--font-weight-semibold);margin:0;">
          New Pasteurized Batch
        </h2>
        <p style="font-size:var(--font-size-sm);color:var(--color-text-muted);margin:2px 0 0;">
          Register a BM-XXX batch and assign it to a freezer shelf.
        </p>
      </div>
    </div>
    ${_closeBtn('batch-close-btn')}
  `;

  const body = `
    ${_errorBox('batch-error-box')}

    <div class="form-row">
      <div class="form-group">
        <label class="form-label form-label--required" for="input-batch-no">Batch Number</label>
        <input id="input-batch-no" type="text" class="form-input"
               value="${nextBatch}" placeholder="e.g. BM-096" required
               style="font-family:monospace;font-weight:700;letter-spacing:0.05em;color:${ICE_BLUE_ICON};">
        <span class="form-hint">Auto-suggested from BM-XXX notebook sequence</span>
      </div>
      <div class="form-group">
        <label class="form-label form-label--required" for="input-date-past">Date Pasteurized</label>
        <input id="input-date-past" type="date" class="form-input" value="${today}" required>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label form-label--required" for="input-total-bags">Quantity (Bags)</label>
        <input id="input-total-bags" type="number" class="form-input" min="1"
               placeholder="e.g. 12" required>
        <span class="form-hint">Number of sealed frozen pouches</span>
      </div>
      <div class="form-group">
        <label class="form-label form-label--required" for="input-shelf">Freezer Shelf</label>
        <select id="input-shelf" class="form-select" required>
          ${shelfOptions}
        </select>
        <span class="form-hint">Physical rack inside upright freezer</span>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label form-label--required" for="input-expiry-date">
        Expiration Date
      </label>
      <input id="input-expiry-date" type="date" class="form-input" value="${expiryStr}" required>
      <span class="form-hint">Default is 6 months from pasteurization date</span>
    </div>

    <div class="form-group">
      <label class="form-label" for="input-batch-remarks">Remarks / Donor Pool Notes</label>
      <input id="input-batch-remarks" type="text" class="form-input"
             placeholder="e.g. Pooled from donors 25-185 and 25-237">
    </div>
  `;

  const footer = `
    <button id="batch-cancel-btn" class="btn btn-ghost">Cancel</button>
    <button id="batch-submit-btn" class="btn btn-primary"
            style="background:${ICE_BLUE_BTN};border-color:${ICE_BLUE_BTN};"
            onmouseover="this.style.background='${ICE_BLUE_BTN_HOVER}';this.style.borderColor='${ICE_BLUE_BTN_HOVER}'"
            onmouseout="this.style.background='${ICE_BLUE_BTN}';this.style.borderColor='${ICE_BLUE_BTN}'">
      <span class="icon" style="font-size:18px;">save</span>
      Save Batch
    </button>
  `;

  const overlay = _mount('milk-modal-overlay', _shell('540px', header, body, footer));

  // Close triggers
  overlay.querySelector('#batch-close-btn')?.addEventListener('click', () => _destroy('milk-modal-overlay'));
  overlay.querySelector('#batch-cancel-btn')?.addEventListener('click', () => _destroy('milk-modal-overlay'));
  overlay.addEventListener('click', e => { if (e.target === overlay) _destroy('milk-modal-overlay'); });

  // Submit
  overlay.querySelector('#batch-submit-btn').addEventListener('click', async () => {
    const errorBox  = overlay.querySelector('#batch-error-box');
    const submitBtn = overlay.querySelector('#batch-submit-btn');
    errorBox.style.display = 'none';

    const batchNo   = overlay.querySelector('#input-batch-no').value.trim();
    const datePast  = overlay.querySelector('#input-date-past').value;
    const totalBags = overlay.querySelector('#input-total-bags').value;
    const shelf     = overlay.querySelector('#input-shelf').value;
    const expiry    = overlay.querySelector('#input-expiry-date').value;
    const remarks   = overlay.querySelector('#input-batch-remarks').value;

    if (!batchNo || !datePast || !totalBags || !expiry) {
      errorBox.textContent = 'Please fill in all required fields.';
      errorBox.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    const { error } = await createMilkBatch({
      batch_number: batchNo,
      date_pasteurized: datePast,
      expiry_date: expiry,
      total_bags: totalBags,
      freezer_shelf: shelf,
      remarks
    });

    if (error) {
      errorBox.textContent = error;
      errorBox.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="icon" style="font-size:18px;">save</span> Save Batch';
    } else {
      _destroy('milk-modal-overlay');
      if (onSave) onSave();
    }
  });
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL 2: Log Donation Intake (Form MH.MNAO.FM.002.00)
// ════════════════════════════════════════════════════════════════════════════
export function openNewDonationModal({ onSave }) {
  const today = new Date().toISOString().split('T')[0];

  const header = `
    <div style="display:flex;align-items:flex-start;gap:var(--space-4);">
      ${_iconCircle('receipt_long')}
      <div>
        <h2 style="font-size:var(--font-size-lg);font-weight:var(--font-weight-semibold);margin:0;">
          Log Milk Received
        </h2>
        <p style="font-size:var(--font-size-sm);color:var(--color-text-muted);margin:2px 0 0;">
          Official MNAO Form MH.MNAO.FM.002.00
        </p>
      </div>
    </div>
    ${_closeBtn('intake-close-btn')}
  `;

  const body = `
    ${_errorBox('intake-error-box')}

    <div class="form-row">
      <div class="form-group">
        <label class="form-label form-label--required" for="input-donor-code">Donor Code / Bag Range</label>
        <input id="input-donor-code" type="text" class="form-input"
               placeholder="e.g. 25-185-236" required
               style="font-family:monospace;font-weight:700;">
        <span class="form-hint">As written in paper log (e.g. 25-33-59)</span>
      </div>
      <div class="form-group">
        <label class="form-label form-label--required" for="input-intake-bags">Bags Received</label>
        <input id="input-intake-bags" type="number" class="form-input" min="1"
               placeholder="e.g. 24" required>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="input-intake-volume">Total Volume (mL)
          <span style="font-weight:400;color:var(--color-text-muted);">(Optional)</span>
        </label>
        <input id="input-intake-volume" type="number" class="form-input" placeholder="e.g. 2400">
      </div>
      <div class="form-group">
        <label class="form-label" for="input-expression-notes">Milk Expression Log</label>
        <input id="input-expression-notes" type="text" class="form-input" value="@see donor log">
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="input-transport-date">Transport Date</label>
        <input id="input-transport-date" type="text" class="form-input"
               placeholder="e.g. 10/03-11/22/24">
      </div>
      <div class="form-group">
        <label class="form-label" for="input-transport-time">Transport Time</label>
        <input id="input-transport-time" type="text" class="form-input" value="12:00 PM">
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label form-label--required" for="input-arrival-date">Arrival Date</label>
        <input id="input-arrival-date" type="date" class="form-input" value="${today}" required>
      </div>
      <div class="form-group">
        <label class="form-label" for="input-arrival-time">Arrival Time</label>
        <input id="input-arrival-time" type="text" class="form-input" value="12:30 PM">
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="input-cond-donor">Condition @ Donor</label>
        <select id="input-cond-donor" class="form-select">
          <option value="ok" selected>OK (Frozen / Cold)</option>
          <option value="compromised">Compromised / Thawed</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="input-cond-arrival">Condition @ Arrival</label>
        <select id="input-cond-arrival" class="form-select">
          <option value="ok" selected>OK (Frozen / Cold)</option>
          <option value="compromised">Compromised / Thawed</option>
        </select>
      </div>
    </div>
  `;

  const footer = `
    <button id="intake-cancel-btn" class="btn btn-ghost">Cancel</button>
    <button id="intake-submit-btn" class="btn btn-primary"
            style="background:${ICE_BLUE_BTN};border-color:${ICE_BLUE_BTN};"
            onmouseover="this.style.background='${ICE_BLUE_BTN_HOVER}';this.style.borderColor='${ICE_BLUE_BTN_HOVER}'"
            onmouseout="this.style.background='${ICE_BLUE_BTN}';this.style.borderColor='${ICE_BLUE_BTN}'">
      <span class="icon" style="font-size:18px;">check_circle</span>
      Record Intake
    </button>
  `;

  const overlay = _mount('milk-modal-overlay', _shell('540px', header, body, footer));

  overlay.querySelector('#intake-close-btn')?.addEventListener('click', () => _destroy('milk-modal-overlay'));
  overlay.querySelector('#intake-cancel-btn')?.addEventListener('click', () => _destroy('milk-modal-overlay'));
  overlay.addEventListener('click', e => { if (e.target === overlay) _destroy('milk-modal-overlay'); });

  overlay.querySelector('#intake-submit-btn').addEventListener('click', async () => {
    const errorBox  = overlay.querySelector('#intake-error-box');
    const submitBtn = overlay.querySelector('#intake-submit-btn');
    errorBox.style.display = 'none';

    const donorCode = overlay.querySelector('#input-donor-code').value.trim();
    const bags      = overlay.querySelector('#input-intake-bags').value;
    const arrival   = overlay.querySelector('#input-arrival-date').value;

    if (!donorCode || !bags || !arrival) {
      errorBox.textContent = 'Please fill in all required fields.';
      errorBox.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    const { error } = await createMilkDonation({
      donor_code:              donorCode,
      bags_count:              bags,
      volume_ml:               overlay.querySelector('#input-intake-volume').value,
      expression_date_notes:   overlay.querySelector('#input-expression-notes').value,
      transport_date:          overlay.querySelector('#input-transport-date').value,
      transport_time:          overlay.querySelector('#input-transport-time').value,
      arrival_date:            arrival,
      arrival_time:            overlay.querySelector('#input-arrival-time').value,
      condition_at_collection: overlay.querySelector('#input-cond-donor').value,
      condition_at_arrival:    overlay.querySelector('#input-cond-arrival').value
    });

    if (error) {
      errorBox.textContent = error;
      errorBox.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="icon" style="font-size:18px;">check_circle</span> Record Intake';
    } else {
      _destroy('milk-modal-overlay');
      if (onSave) onSave();
    }
  });
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL 3: Dispense Milk to Infant / Beneficiary
// ════════════════════════════════════════════════════════════════════════════
export async function openDispenseModal({ preselectedBatchId = null, onSave }) {
  const { data: batches } = await fetchMilkBatches();
  const available = (batches || []).filter(b => b.remaining_bags > 0);

  if (available.length === 0) {
    // Use system-native alert style — could be improved later
    const noStockOverlay = _mount('milk-modal-overlay', _shell('400px',
      `<div style="display:flex;align-items:flex-start;gap:var(--space-4);">
        ${_iconCircle('inventory_2')}
        <div>
          <h2 style="font-size:var(--font-size-lg);font-weight:var(--font-weight-semibold);margin:0;">
            No Stock Available
          </h2>
          <p style="font-size:var(--font-size-sm);color:var(--color-text-muted);margin:2px 0 0;">
            All pasteurized batches are depleted.
          </p>
        </div>
      </div>
      ${_closeBtn('nostock-close-btn')}`,
      `<p style="font-size:var(--font-size-sm);color:var(--color-text-muted);">
        Log a new pasteurized batch (BM-XXX) before dispensing milk to beneficiaries.
      </p>`,
      `<button id="nostock-close-btn2" class="btn btn-ghost">Close</button>`
    ));
    noStockOverlay.querySelector('#nostock-close-btn')?.addEventListener('click', () => _destroy('milk-modal-overlay'));
    noStockOverlay.querySelector('#nostock-close-btn2')?.addEventListener('click', () => _destroy('milk-modal-overlay'));
    noStockOverlay.addEventListener('click', e => { if (e.target === noStockOverlay) _destroy('milk-modal-overlay'); });
    return;
  }

  const today = new Date().toISOString().split('T')[0];

  const batchOptions = available.map(b =>
    `<option value="${b.id}" data-max="${b.remaining_bags}"
       ${b.id === preselectedBatchId ? 'selected' : ''}>
       ${b.batch_number} — ${b.freezer_shelf} · ${b.remaining_bags} bags available
     </option>`
  ).join('');

  const brgyOptions = (BARANGAYS || []).map(brgy =>
    `<option value="${brgy}">${brgy}</option>`
  ).join('');

  const indicationOptions = DISPENSE_INDICATIONS.map(ind =>
    `<option value="${ind}">${ind}</option>`
  ).join('');

  const header = `
    <div style="display:flex;align-items:flex-start;gap:var(--space-4);">
      ${_iconCircle('volunteer_activism')}
      <div>
        <h2 style="font-size:var(--font-size-lg);font-weight:var(--font-weight-semibold);margin:0;">
          Dispense Pasteurized Milk
        </h2>
        <p style="font-size:var(--font-size-sm);color:var(--color-text-muted);margin:2px 0 0;">
          Issue frozen milk pouches to an infant recipient.
        </p>
      </div>
    </div>
    ${_closeBtn('dispense-close-btn')}
  `;

  const body = `
    ${_errorBox('dispense-error-box')}

    <div class="form-group">
      <label class="form-label form-label--required" for="select-dispense-batch">
        Select Pasteurized Batch
      </label>
      <select id="select-dispense-batch" class="form-select" required>
        ${batchOptions}
      </select>
    </div>

    <!-- Selected batch info strip -->
    <div id="dispense-batch-info"
         style="background:var(--color-surface-alt);border:1px solid var(--color-border);
                border-radius:var(--radius-lg);padding:var(--space-4);
                display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);">
      <div>
        <div style="font-size:var(--font-size-xs);text-transform:uppercase;letter-spacing:0.06em;
                    color:var(--color-text-muted);margin-bottom:4px;">Batch</div>
        <div id="dinfo-batch" style="font-weight:var(--font-weight-bold);font-family:monospace;
                                      color:${ICE_BLUE_ICON};">—</div>
      </div>
      <div>
        <div style="font-size:var(--font-size-xs);text-transform:uppercase;letter-spacing:0.06em;
                    color:var(--color-text-muted);margin-bottom:4px;">Available Bags</div>
        <div id="dinfo-avail" style="font-weight:var(--font-weight-bold);">—</div>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label form-label--required" for="input-recipient-name">
          Recipient Infant / Mother Name
        </label>
        <input id="input-recipient-name" type="text" class="form-input"
               placeholder="e.g. Baby Cruz / Maria Cruz" required>
      </div>
      <div class="form-group">
        <label class="form-label form-label--required" for="select-barangay">Barangay</label>
        <select id="select-barangay" class="form-select" required>
          ${brgyOptions}
        </select>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label form-label--required" for="input-dispense-qty">
          Quantity to Dispense (Bags)
        </label>
        <input id="input-dispense-qty" type="number" class="form-input" min="1"
               placeholder="e.g. 2" required>
        <span class="form-hint" id="dispense-max-hint"></span>
      </div>
      <div class="form-group">
        <label class="form-label form-label--required" for="select-indication">
          Clinical Indication
        </label>
        <select id="select-indication" class="form-select" required>
          ${indicationOptions}
        </select>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label form-label--required" for="input-dispense-date">Date Dispensed</label>
        <input id="input-dispense-date" type="date" class="form-input" value="${today}" required>
      </div>
      <div class="form-group">
        <label class="form-label" for="input-dispense-remarks">Notes / Referring Facility</label>
        <input id="input-dispense-remarks" type="text" class="form-input"
               placeholder="e.g. Bukidnon Provincial Hospital">
      </div>
    </div>
  `;

  const footer = `
    <button id="dispense-cancel-btn" class="btn btn-ghost">Cancel</button>
    <button id="dispense-submit-btn" class="btn btn-primary"
            style="background:${ICE_BLUE_BTN};border-color:${ICE_BLUE_BTN};"
            onmouseover="this.style.background='${ICE_BLUE_BTN_HOVER}';this.style.borderColor='${ICE_BLUE_BTN_HOVER}'"
            onmouseout="this.style.background='${ICE_BLUE_BTN}';this.style.borderColor='${ICE_BLUE_BTN}'">
      <span class="icon" style="font-size:18px;">outbox</span>
      Issue Milk
    </button>
  `;

  const overlay = _mount('milk-modal-overlay', _shell('560px', header, body, footer));

  // Batch selection → update info strip
  const batchSelect = overlay.querySelector('#select-dispense-batch');
  const qtyInput    = overlay.querySelector('#input-dispense-qty');
  const maxHint     = overlay.querySelector('#dispense-max-hint');

  const updateBatchInfo = () => {
    const opt = batchSelect.options[batchSelect.selectedIndex];
    if (!opt) return;
    const max  = opt.dataset.max;
    const text = opt.textContent.trim().split('—')[0].trim();
    overlay.querySelector('#dinfo-batch').textContent  = text;
    overlay.querySelector('#dinfo-avail').textContent  = `${max} bags`;
    qtyInput.max   = max;
    maxHint.textContent = `Max: ${max} bags available`;
  };
  batchSelect.addEventListener('change', updateBatchInfo);
  updateBatchInfo();

  // Close triggers
  overlay.querySelector('#dispense-close-btn')?.addEventListener('click',  () => _destroy('milk-modal-overlay'));
  overlay.querySelector('#dispense-cancel-btn')?.addEventListener('click', () => _destroy('milk-modal-overlay'));
  overlay.addEventListener('click', e => { if (e.target === overlay) _destroy('milk-modal-overlay'); });

  // Submit
  overlay.querySelector('#dispense-submit-btn').addEventListener('click', async () => {
    const errorBox  = overlay.querySelector('#dispense-error-box');
    const submitBtn = overlay.querySelector('#dispense-submit-btn');
    errorBox.style.display = 'none';

    const recipient = overlay.querySelector('#input-recipient-name').value.trim();
    const barangay  = overlay.querySelector('#select-barangay').value;
    const qty       = overlay.querySelector('#input-dispense-qty').value;
    const date      = overlay.querySelector('#input-dispense-date').value;

    if (!recipient || !barangay || !qty || !date) {
      errorBox.textContent = 'Please fill in all required fields.';
      errorBox.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing…';

    const { error } = await dispenseMilk({
      batch_id:       batchSelect.value,
      recipient_name: recipient,
      barangay,
      bags_dispensed: qty,
      indication:     overlay.querySelector('#select-indication').value,
      dispensed_date: date,
      remarks:        overlay.querySelector('#input-dispense-remarks').value
    });

    if (error) {
      errorBox.textContent = error;
      errorBox.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="icon" style="font-size:18px;">outbox</span> Issue Milk';
    } else {
      _destroy('milk-modal-overlay');
      if (onSave) onSave();
    }
  });
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL 4: Edit Pasteurized Batch
// ════════════════════════════════════════════════════════════════════════════
export function openEditBatchModal({ batch, shelves = [], freezers = [], batches = [], profile, onSave }) {
  if (!batch) return;

  const loc = getBatchFreezerAndShelf(batch, freezers);
  const shelfList = (shelves && shelves.length > 0) ? shelves : SHELF_LOCATIONS;
  const allocations = getFreezerShelfAllocations(loc.freezerName, batches, freezers, batch.id);

  const shelfOptions = shelfList.map(s => {
    const alloc = allocations.find(a => a.shelfName.toLowerCase() === s.toLowerCase());
    const used = alloc ? alloc.usedBags : 0;
    let badge = `${used}/20 bags`;
    if (used >= 20) badge = '20/20 Full';
    else if (used === 0) badge = '0/20 Empty';

    const isSelected = s.toLowerCase() === (loc.shelfName || '').toLowerCase();
    return `<option value="${s}" ${isSelected ? 'selected' : ''}>${s} (${badge})</option>`;
  }).join('');

  const header = `
    <div style="display:flex;align-items:flex-start;gap:var(--space-4);">
      ${_iconCircle('edit_document')}
      <div>
        <h2 style="font-size:var(--font-size-lg);font-weight:var(--font-weight-semibold);margin:0;">
          Edit Batch ${batch.batch_number}
        </h2>
        <p style="font-size:var(--font-size-sm);color:var(--color-text-muted);margin:2px 0 0;">
          Update batch quantities, dates, or shelf position.
        </p>
      </div>
    </div>
    ${_closeBtn('edit-batch-close-btn')}
  `;

  const body = `
    ${_errorBox('edit-batch-error-box')}

    <div class="form-row">
      <div class="form-group">
        <label class="form-label form-label--required" for="input-edit-batch-no">Batch Number</label>
        <input id="input-edit-batch-no" type="text" class="form-input"
               value="${batch.batch_number || ''}" required
               style="font-family:monospace;font-weight:700;letter-spacing:0.05em;color:${ICE_BLUE_ICON};">
      </div>
      <div class="form-group">
        <label class="form-label form-label--required" for="input-edit-date-past">Date Pasteurized</label>
        <input id="input-edit-date-past" type="date" class="form-input"
               value="${batch.date_pasteurized || ''}" required>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label form-label--required" for="input-edit-total-bags">Initial Bags</label>
        <input id="input-edit-total-bags" type="number" class="form-input" min="1"
               value="${batch.total_bags || 1}" required>
      </div>
      <div class="form-group">
        <label class="form-label form-label--required" for="input-edit-remaining-bags">Remaining Bags</label>
        <input id="input-edit-remaining-bags" type="number" class="form-input" min="0"
               value="${batch.remaining_bags !== undefined ? batch.remaining_bags : (batch.total_bags || 1)}" required>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label form-label--required" for="input-edit-shelf">Freezer Shelf</label>
        <select id="input-edit-shelf" class="form-select" required>
          ${shelfOptions}
        </select>
        <span class="form-hint">Shelf location inside cold-chain freezer</span>
      </div>
      <div class="form-group">
        <label class="form-label form-label--required" for="input-edit-expiry-date">Expiration Date</label>
        <input id="input-edit-expiry-date" type="date" class="form-input"
               value="${batch.expiry_date || ''}" required>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label" for="input-edit-batch-remarks">Remarks / Donor Pool Notes</label>
      <input id="input-edit-batch-remarks" type="text" class="form-input"
             value="${batch.remarks || ''}" placeholder="e.g. Pooled from donors 25-185">
    </div>
  `;

  const footer = `
    <button id="edit-batch-cancel-btn" class="btn btn-ghost">Cancel</button>
    <button id="edit-batch-submit-btn" class="btn btn-primary"
            style="background:${ICE_BLUE_BTN};border-color:${ICE_BLUE_BTN};"
            onmouseover="this.style.background='${ICE_BLUE_BTN_HOVER}';this.style.borderColor='${ICE_BLUE_BTN_HOVER}'"
            onmouseout="this.style.background='${ICE_BLUE_BTN}';this.style.borderColor='${ICE_BLUE_BTN}'">
      <span class="icon" style="font-size:18px;">save</span>
      Save Changes
    </button>
  `;

  const overlay = _mount('milk-modal-overlay', _shell('540px', header, body, footer));

  overlay.querySelector('#edit-batch-close-btn')?.addEventListener('click', () => _destroy('milk-modal-overlay'));
  overlay.querySelector('#edit-batch-cancel-btn')?.addEventListener('click', () => _destroy('milk-modal-overlay'));
  overlay.addEventListener('click', e => { if (e.target === overlay) _destroy('milk-modal-overlay'); });

  overlay.querySelector('#edit-batch-submit-btn').addEventListener('click', async () => {
    const errorBox  = overlay.querySelector('#edit-batch-error-box');
    const submitBtn = overlay.querySelector('#edit-batch-submit-btn');
    errorBox.style.display = 'none';

    const batchNo   = overlay.querySelector('#input-edit-batch-no').value.trim();
    const datePast  = overlay.querySelector('#input-edit-date-past').value;
    const totalBags = overlay.querySelector('#input-edit-total-bags').value;
    const remBags   = overlay.querySelector('#input-edit-remaining-bags').value;
    const shelf     = overlay.querySelector('#input-edit-shelf').value;
    const expiry    = overlay.querySelector('#input-edit-expiry-date').value;
    const remarks   = overlay.querySelector('#input-edit-batch-remarks').value;

    if (!batchNo || !datePast || !totalBags || !expiry) {
      errorBox.textContent = 'Please fill in all required fields.';
      errorBox.style.display = 'block';
      return;
    }

    if (parseInt(remBags, 10) > parseInt(totalBags, 10)) {
      errorBox.textContent = 'Remaining bags cannot exceed total bags.';
      errorBox.style.display = 'block';
      return;
    }

    const numRem = parseInt(remBags, 10) || 0;
    const targetLoad = getShelfLoad(loc.freezerName, shelf, batches, freezers, batch.id);

    if (targetLoad >= 20 || targetLoad + numRem > 20) {
      const msg = targetLoad >= 20
        ? `"${shelf}" in ${loc.freezerName} is already full (${targetLoad}/20 bags).\n\nMoving batch "${batchNo}" (${numRem} bags) here will automatically roll excess bags over to the next shelf.\n\nDo you want to proceed?`
        : `"${shelf}" in ${loc.freezerName} currently has ${targetLoad}/20 bags.\n\nAdding batch "${batchNo}" (${numRem} bags) will exceed the 20-bag shelf limit by ${targetLoad + numRem - 20} bag(s), rolling excess bags over to the next shelf.\n\nDo you want to proceed?`;
      
      const confirmed = await SystemDialog.confirm(msg, 'Shelf Capacity Notice', 'Proceed & Roll Over', false, { theme: 'blue', icon: 'kitchen' });
      if (!confirmed) {
        return;
      }
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    const combinedLocation = formatFreezerShelf(loc.freezerName, shelf);

    const { error } = await updateMilkBatch(batch.id, {
      batch_number: batchNo,
      date_pasteurized: datePast,
      expiry_date: expiry,
      total_bags: totalBags,
      remaining_bags: remBags,
      freezer_shelf: combinedLocation,
      remarks
    }, profile);

    if (error) {
      errorBox.textContent = error;
      errorBox.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="icon" style="font-size:18px;">save</span> Save Changes';
    } else {
      _destroy('milk-modal-overlay');
      if (onSave) onSave();
    }
  });
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL 5: Delete Pasteurized Batch (Confirmation with Audit Warning)
// ════════════════════════════════════════════════════════════════════════════
export function openDeleteBatchModal({ batch, profile, onDelete }) {
  if (!batch) return;

  const hasStock = (batch.remaining_bags || 0) > 0;

  const header = `
    <div style="display:flex;align-items:flex-start;gap:var(--space-4);">
      <div style="width:44px;height:44px;border-radius:var(--radius-full);flex-shrink:0;
                  background:#fee2e2;display:flex;align-items:center;justify-content:center;">
        <span class="icon" style="color:#dc2626;font-size:22px;">delete_forever</span>
      </div>
      <div>
        <h2 style="font-size:var(--font-size-lg);font-weight:var(--font-weight-semibold);margin:0;color:#991b1b;">
          Delete Batch ${batch.batch_number}
        </h2>
        <p style="font-size:var(--font-size-sm);color:var(--color-text-muted);margin:2px 0 0;">
          Confirm removal of this pasteurized batch from storage.
        </p>
      </div>
    </div>
    ${_closeBtn('del-batch-close-btn')}
  `;

  const body = `
    ${_errorBox('del-batch-error-box')}

    <div style="background:var(--color-surface-alt);border:1px solid var(--color-border);
                border-radius:var(--radius-lg);padding:14px 18px;display:flex;flex-direction:column;gap:8px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;">
        <span style="color:var(--color-text-muted);">Batch Number:</span>
        <strong style="font-family:monospace;color:${ICE_BLUE_ICON};">${batch.batch_number}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;">
        <span style="color:var(--color-text-muted);">Current Location:</span>
        <strong>${batch.freezer_shelf || 'Shelf 1'}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;">
        <span style="color:var(--color-text-muted);">Current In Stock:</span>
        <strong style="color:${hasStock ? '#b45309' : 'var(--color-text)'};">${batch.remaining_bags || 0} Bags</strong>
      </div>
    </div>

    ${hasStock ? `
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:var(--radius-md);
                  padding:12px 14px;display:flex;align-items:flex-start;gap:10px;color:#92400e;font-size:13px;">
        <span class="icon" style="color:#d97706;font-size:20px;flex-shrink:0;">warning</span>
        <div>
          <strong>Warning: Active Inventory</strong>
          <div style="margin-top:2px;">
            This batch currently has <strong>${batch.remaining_bags} sealed bags</strong> stored in the freezer. Deleting will permanently remove them from inventory counts.
          </div>
        </div>
      </div>
    ` : ''}

    <div style="font-size:12px;color:var(--color-text-muted);display:flex;align-items:center;gap:6px;">
      <span class="icon" style="font-size:15px;">history</span>
      <span>This deletion will be permanently logged in the system audit trail under <strong>${profile?.full_name || 'your account'}</strong>.</span>
    </div>
  `;

  const footer = `
    <button id="del-batch-cancel-btn" class="btn btn-ghost">Cancel</button>
    <button id="del-batch-submit-btn" class="btn btn-danger"
            style="background:#dc2626;border-color:#dc2626;color:#ffffff;display:flex;align-items:center;gap:6px;">
      <span class="icon" style="font-size:18px;">delete</span>
      Delete Batch
    </button>
  `;

  const overlay = _mount('milk-modal-overlay', _shell('480px', header, body, footer));

  overlay.querySelector('#del-batch-close-btn')?.addEventListener('click', () => _destroy('milk-modal-overlay'));
  overlay.querySelector('#del-batch-cancel-btn')?.addEventListener('click', () => _destroy('milk-modal-overlay'));
  overlay.addEventListener('click', e => { if (e.target === overlay) _destroy('milk-modal-overlay'); });

  overlay.querySelector('#del-batch-submit-btn').addEventListener('click', async () => {
    const errorBox  = overlay.querySelector('#del-batch-error-box');
    const submitBtn = overlay.querySelector('#del-batch-submit-btn');
    errorBox.style.display = 'none';

    submitBtn.disabled = true;
    submitBtn.textContent = 'Deleting…';

    const { error } = await deleteMilkBatch(batch.id, batch.batch_number, profile);

    if (error) {
      errorBox.textContent = error;
      errorBox.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="icon" style="font-size:18px;">delete</span> Delete Batch';
    } else {
      _destroy('milk-modal-overlay');
      if (onDelete) onDelete();
    }
  });
}

