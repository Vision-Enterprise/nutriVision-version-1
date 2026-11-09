/**
 * Defects Module — Log Event & Quarantine Resolution Modals
 * Lightweight SaaS architecture (no base64 database bloat).
 */

import { fetchActiveBatchesForSelector, logDefectIncident, resolveQuarantineIncident } from './defects.service.js';
import { showDefectPrintPreview } from './defects.pdf.js';
import { SystemDialog } from '../../shared/components/dialog.component.js';

const CLASSIFICATIONS = [
  'Damaged on Delivery / Broken Seal',
  'Packaging Defect / Torn',
  'Expired Prior to Distribution',
  'Quality Suspect / Spoilage',
  'Pest / Water Contamination',
  'Recall / Notice',
  'Other Quality Non-Compliance',
];

/**
 * Opens the Log Stock Event modal.
 */
export async function openLogIncidentModal(profile, onSuccess) {
  const { data: batches, error } = await fetchActiveBatchesForSelector();
  if (error) {
    await SystemDialog.alert('Error: ' + error, 'Load Failed');
    return;
  }

  _renderLogModal(batches, profile, onSuccess);
}

// ─── Log Stock Event Modal ────────────────────────────────────────────────────

function _renderLogModal(batches, profile, onSuccess) {
  document.getElementById('defect-modal-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'defect-modal-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 8000;
    background: rgba(0,0,0,0.55); backdrop-filter: blur(3px);
    display: flex; align-items: center; justify-content: center; padding: 24px;
  `;

  overlay.innerHTML = `
    <div style="
      background: var(--color-surface, #fff);
      border-radius: var(--radius-xl, 16px);
      width: 100%; max-width: 560px;
      max-height: 90vh; display: flex; flex-direction: column;
      box-shadow: 0 24px 64px rgba(0,0,0,0.3);
      overflow: hidden;
    ">
      <!-- Modal Header -->
      <div style="
        padding: var(--space-5) var(--space-6);
        border-bottom: 1px solid var(--color-border);
        display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4);
        flex-shrink: 0;
      ">
        <div style="display: flex; align-items: flex-start; gap: var(--space-4);">
          <div style="
            width: 44px; height: 44px; border-radius: var(--radius-full); flex-shrink: 0;
            background: #fef3c7; display: flex; align-items: center; justify-content: center;
          ">
            <span class="icon" style="color: #b45309; font-size: 22px;">inventory_2</span>
          </div>
          <div>
            <h2 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); margin: 0;">Log Stock Event</h2>
            <p style="font-size: var(--font-size-sm); color: var(--color-text-muted); margin-top: 2px; margin-bottom: 0;">
              Record quarantined stock under observation, supplier returns, or condemned inventory.
            </p>
          </div>
        </div>
        <button id="defect-modal-close" type="button" aria-label="Close" style="
          background: transparent; border: none; cursor: pointer; color: var(--color-text-muted);
          padding: 6px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Modal Body -->
      <div style="
        padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-5);
        flex: 1; overflow-y: auto; overscroll-behavior: contain;
      ">

        <!-- Batch Search -->
        <div class="form-group">
          <label class="form-label form-label--required" for="defect-batch-search">Search Active Batch</label>
          <div style="position: relative;">
            <span class="icon" style="
              position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
              font-size: 18px; color: var(--color-text-muted); pointer-events: none;
            ">search</span>
            <input
              type="text"
              id="defect-batch-search"
              class="form-input"
              placeholder="Type batch number or commodity name..."
              autocomplete="off"
              style="padding-left: 38px;"
            >
          </div>
          <div id="defect-batch-dropdown" style="
            display: none; position: relative; z-index: 10;
            border: 1px solid var(--color-border); border-top: none;
            border-radius: 0 0 var(--radius-md) var(--radius-md);
            background: var(--color-surface); max-height: 180px; overflow-y: auto;
            box-shadow: var(--shadow-md);
          "></div>
        </div>

        <!-- Target Batch Info Card -->
        <div id="defect-batch-info" style="display: none;
          background: var(--color-surface-alt, #f8faf9);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          grid-template-columns: 1fr 1fr 1fr; gap: var(--space-4);
        ">
          <div>
            <div style="font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); margin-bottom: 4px;">Target Batch</div>
            <div id="info-batch-number" style="font-weight: var(--font-weight-bold); font-family: monospace;">—</div>
          </div>
          <div>
            <div style="font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); margin-bottom: 4px;">Commodity</div>
            <div id="info-commodity" style="font-weight: var(--font-weight-semibold);">—</div>
          </div>
          <div>
            <div style="font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); margin-bottom: 4px;">Active Stock</div>
            <div id="info-quantity" style="font-weight: var(--font-weight-bold);">—</div>
          </div>
        </div>

        <!-- Action to Take -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label form-label--required" for="defect-action">Action to Take</label>
            <select id="defect-action" class="form-select">
              <option value="Quarantined" selected>Quarantined (Under Observation)</option>
              <option value="Returned">Returned (Return to Supplier)</option>
              <option value="Disposed">Disposed (Condemned / Discarded)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label form-label--required" for="defect-qty">Quantity Affected</label>
            <input type="number" id="defect-qty" class="form-input" min="1" placeholder="e.g. 5">
            <span class="form-hint" id="defect-qty-hint"></span>
          </div>
        </div>

        <!-- Defect Classification -->
        <div class="form-group">
          <label class="form-label form-label--required" for="defect-classification">Reason / Classification</label>
          <select id="defect-classification" class="form-select">
            <option value="">Select reason...</option>
            ${CLASSIFICATIONS.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>

        <!-- Remarks -->
        <div class="form-group">
          <label class="form-label form-label--required" for="defect-remarks">Remarks / Details</label>
          <textarea
            id="defect-remarks"
            class="form-textarea"
            rows="3"
            placeholder="Explain discovery, reason for hold or return, or reference memo number..."
          ></textarea>
        </div>

        <!-- Photo Evidence (Dynamically HIDDEN when action is Quarantined) -->
        <div class="form-group" id="defect-evidence-group" style="display: none;">
          <label class="form-label" for="defect-evidence">Photo Attachment <span style="color: var(--color-text-muted); font-weight: normal;">(Optional for Slip Printout)</span></label>
          <div style="
            border: 2px dashed var(--color-border);
            border-radius: var(--radius-lg);
            padding: var(--space-4);
            text-align: center;
            cursor: pointer;
            position: relative;
          " id="defect-evidence-dropzone">
            <input type="file" id="defect-evidence" accept="image/*" style="position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;">
            <span class="icon" style="font-size: 24px; color: var(--color-text-muted); display: block; margin-bottom: 4px;">add_photo_alternate</span>
            <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0;">Optional photo for immediate printable slip preview.</p>
          </div>
          <div id="defect-evidence-preview" style="display:none; margin-top: var(--space-3); position: relative;">
            <img id="defect-evidence-img" src="" alt="Evidence preview" style="
              width: 100%; max-height: 140px; object-fit: cover;
              border-radius: var(--radius-md); border: 1px solid var(--color-border);
            ">
            <button id="defect-evidence-remove" type="button" style="
              position: absolute; top: 6px; right: 6px;
              background: rgba(0,0,0,0.6); color: #fff; border: none;
              border-radius: var(--radius-full); width: 24px; height: 24px;
              cursor: pointer; display: flex; align-items: center; justify-content: center;
            "><span class="icon" style="font-size: 14px;">close</span></button>
          </div>
        </div>

        <div id="defect-modal-error" style="display:none; color: var(--color-danger); font-size: var(--font-size-sm); background: #fff5f5; border: 1px solid var(--color-danger); border-radius: var(--radius-md); padding: 10px 14px;"></div>

      </div>

      <!-- Modal Footer -->
      <div style="
        padding: var(--space-4) var(--space-6);
        border-top: 1px solid var(--color-border);
        display: flex; justify-content: flex-end; gap: var(--space-3);
        flex-shrink: 0;
        background: var(--color-surface, #fff);
      ">
        <button id="defect-modal-cancel" class="btn btn-ghost">Cancel</button>
        <button id="defect-modal-generate" class="btn btn-primary" style="display: flex; align-items: center; gap: var(--space-2);">
          <span class="icon" style="font-size: 18px;">save</span>
          Log &amp; Preview Slip
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  _bindLogModalEvents(overlay, batches, profile, onSuccess);
}

function _bindLogModalEvents(overlay, batches, profile, onSuccess) {
  let selectedBatch = null;
  let ephemeralImageData = null;

  const searchInput    = overlay.querySelector('#defect-batch-search');
  const dropdown       = overlay.querySelector('#defect-batch-dropdown');
  const batchInfo      = overlay.querySelector('#defect-batch-info');
  const errorEl        = overlay.querySelector('#defect-modal-error');
  const actionSelect   = overlay.querySelector('#defect-action');
  const qtyInput       = overlay.querySelector('#defect-qty');
  const evidenceGroup  = overlay.querySelector('#defect-evidence-group');
  const fileInput      = overlay.querySelector('#defect-evidence');
  const preview        = overlay.querySelector('#defect-evidence-preview');
  const previewImg     = overlay.querySelector('#defect-evidence-img');
  const removeBtn      = overlay.querySelector('#defect-evidence-remove');

  // Dynamic show/hide of photo upload based on action
  // User Rule: If Quarantined -> hide photo evidence!
  const updateDynamicFields = () => {
    const act = actionSelect.value;
    if (act === 'Quarantined') {
      evidenceGroup.style.display = 'none';
      ephemeralImageData = null;
    } else {
      evidenceGroup.style.display = 'block';
    }
  };
  actionSelect.addEventListener('change', updateDynamicFields);
  updateDynamicFields();

  // Image preview (for instant print preview only)
  fileInput?.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      ephemeralImageData = e.target.result;
      previewImg.src = e.target.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  });

  removeBtn?.addEventListener('click', () => {
    ephemeralImageData = null;
    fileInput.value = '';
    previewImg.src = '';
    preview.style.display = 'none';
  });

  // Batch search
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    selectedBatch = null;
    batchInfo.style.display = 'none';

    if (!q) { dropdown.style.display = 'none'; return; }

    const matches = batches.filter(b =>
      b.batch_number.toLowerCase().includes(q) ||
      b.commodities?.name?.toLowerCase().includes(q)
    ).slice(0, 10);

    if (!matches.length) {
      dropdown.innerHTML = `<div style="padding: 10px 14px; color: var(--color-text-muted); font-size: var(--font-size-sm);">No active batches found.</div>`;
    } else {
      dropdown.innerHTML = matches.map(b => `
        <div class="defect-batch-option" data-id="${b.id}" style="
          padding: 10px 14px; cursor: pointer; font-size: var(--font-size-sm);
          border-bottom: 1px solid var(--color-border);
        ">
          <strong>${b.batch_number}</strong>
          <span style="color: var(--color-text-muted);"> — ${b.commodities?.name || '?'}</span>
          <span style="float:right; color: var(--color-text-muted);">${b.quantity} ${b.commodities?.unit || ''}</span>
        </div>
      `).join('');
    }
    dropdown.style.display = 'block';

    dropdown.querySelectorAll('.defect-batch-option').forEach(opt => {
      opt.addEventListener('click', () => {
        selectedBatch = batches.find(b => b.id === opt.dataset.id);
        if (!selectedBatch) return;

        searchInput.value = selectedBatch.batch_number;
        dropdown.style.display = 'none';

        batchInfo.style.display = 'grid';
        overlay.querySelector('#info-batch-number').textContent = selectedBatch.batch_number;
        overlay.querySelector('#info-commodity').textContent    = selectedBatch.commodities?.name || '—';
        overlay.querySelector('#info-quantity').textContent     = `${selectedBatch.quantity} ${selectedBatch.commodities?.unit || ''}`;

        const qtyHint = overlay.querySelector('#defect-qty-hint');
        if (qtyHint) qtyHint.textContent = `Max available: ${selectedBatch.quantity}`;
        qtyInput.max = selectedBatch.quantity;
      });
    });
  });

  // Close dropdown on outside click
  document.addEventListener('click', e => {
    if (!overlay.querySelector('#defect-batch-search')?.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  const closeModal = () => {
    overlay.remove();
    document.removeEventListener('keydown', handleKeyDown);
  };
  const handleKeyDown = (e) => { if (e.key === 'Escape') closeModal(); };
  document.addEventListener('keydown', handleKeyDown);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  overlay.querySelector('#defect-modal-close')?.addEventListener('click', closeModal);
  overlay.querySelector('#defect-modal-cancel')?.addEventListener('click', closeModal);

  // Submit button
  overlay.querySelector('#defect-modal-generate').addEventListener('click', () => {
    const classification = overlay.querySelector('#defect-classification').value;
    const qty            = parseInt(qtyInput.value, 10);
    const actionTaken    = actionSelect.value;
    const remarks        = overlay.querySelector('#defect-remarks').value.trim();

    if (!selectedBatch) { _showError(errorEl, 'Please select an active batch first.'); return; }
    if (!qty || qty < 1) { _showError(errorEl, 'Quantity affected must be at least 1.'); return; }
    if (qty > selectedBatch.quantity) { _showError(errorEl, `Quantity exceeds batch stock (max: ${selectedBatch.quantity}).`); return; }
    if (!classification) { _showError(errorEl, 'Please select a reason / classification.'); return; }
    if (!remarks) { _showError(errorEl, 'Remarks / log details are required.'); return; }

    errorEl.style.display = 'none';

    const incidentData = {
      batchId: selectedBatch.id,
      classification,
      quantityAffected: qty,
      actionTaken,
      remarks,
      imageData: ephemeralImageData
    };

    // Show slip preview immediately with confirm action
    showDefectPrintPreview(incidentData, selectedBatch, profile, async () => {
      const { data, error } = await logDefectIncident(incidentData, profile);
      if (error) {
        await SystemDialog.alert('Error recording event: ' + error, 'Save Failed');
        return;
      }
      closeModal();
      if (typeof onSuccess === 'function') onSuccess(data, selectedBatch, incidentData);
    });
  });
}

function _showError(el, msg) {
  el.textContent   = msg;
  el.style.display = 'block';
}

// ─── Resolve Quarantine Modal ─────────────────────────────────────────────────

/**
 * Opens the Quarantine Resolution Modal.
 * Allows partial or full resolution with 3 choices:
 *  - Restore to Active Stock
 *  - Return to Supplier
 *  - Dispose / Condemn
 */
export function openResolveQuarantineModal(incident, profile, onSuccess) {
  document.getElementById('resolve-modal-overlay')?.remove();

  const remaining = incident.remaining_quarantined !== null
    ? incident.remaining_quarantined
    : incident.quantity_affected;

  const unit = incident.batches?.commodities?.unit || 'units';

  const overlay = document.createElement('div');
  overlay.id = 'resolve-modal-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 8000;
    background: rgba(0,0,0,0.55); backdrop-filter: blur(3px);
    display: flex; align-items: center; justify-content: center; padding: 24px;
  `;

  overlay.innerHTML = `
    <div style="
      background: var(--color-surface, #fff);
      border-radius: var(--radius-xl, 16px);
      width: 100%; max-width: 500px;
      max-height: 90vh; display: flex; flex-direction: column;
      box-shadow: 0 24px 64px rgba(0,0,0,0.3);
      overflow: hidden;
    ">
      <!-- Modal Header -->
      <div style="
        padding: var(--space-5) var(--space-6);
        border-bottom: 1px solid var(--color-border);
        display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);
        flex-shrink: 0;
      ">
        <div style="display: flex; align-items: center; gap: var(--space-3);">
          <span class="icon" style="color: var(--color-primary); font-size: 24px;">tune</span>
          <h2 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); margin:0;">Resolve Quarantine</h2>
        </div>
        <button id="btn-resolve-close" type="button" aria-label="Close" style="
          background: transparent; border: none; cursor: pointer; color: var(--color-text-muted);
          padding: 6px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Modal Body -->
      <div style="padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-5); flex: 1; overflow-y: auto;">
        
        <!-- Batch & Remaining Info Card -->
        <div style="
          background: var(--color-surface-alt, #f8faf9);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);
        ">
          <div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase;">Batch Number</div>
            <div style="font-weight: var(--font-weight-bold); font-family: monospace;">${incident.batches?.batch_number || '—'}</div>
          </div>
          <div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase;">Commodity</div>
            <div style="font-weight: var(--font-weight-semibold);">${incident.batches?.commodities?.name || '—'}</div>
          </div>
          <div style="grid-column: span 2; border-top: 1px dashed var(--color-border); padding-top: 8px; margin-top: 2px;">
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase;">Under Observation</div>
            <div style="font-weight: var(--font-weight-bold); color: #d97706; font-size: 16px;">
              ${remaining} ${unit}
            </div>
          </div>
        </div>

        <!-- Outcome Action -->
        <div class="form-group">
          <label class="form-label form-label--required" for="resolve-outcome">Resolution Decision</label>
          <select id="resolve-outcome" class="form-select">
            <option value="Restore">Restore to Active Stock (Cleared for use)</option>
            <option value="Return">Return to Supplier (Send back for replacement)</option>
            <option value="Dispose">Dispose (Confirmed spoiled or unusable)</option>
          </select>
        </div>

        <!-- Quantity to Resolve -->
        <div class="form-group">
          <label class="form-label form-label--required" for="resolve-qty">Quantity to Resolve</label>
          <input type="number" id="resolve-qty" class="form-input" min="1" max="${remaining}" value="${remaining}">
          <span class="form-hint" id="resolve-qty-hint" style="font-size: 11px; color: var(--color-text-muted);">Resolving all ${remaining} ${unit}.</span>
        </div>

        <!-- Notes -->
        <div class="form-group">
          <label class="form-label" for="resolve-notes">Resolution Notes / Reason</label>
          <textarea id="resolve-notes" class="form-textarea" rows="2" placeholder="e.g. Visual inspection passed, supplier approved return..."></textarea>
        </div>

        <div id="resolve-error" style="display:none; color: var(--color-danger); font-size: var(--font-size-sm); background: #fff5f5; border: 1px solid var(--color-danger); border-radius: var(--radius-md); padding: 10px 14px;"></div>
      </div>

      <!-- Modal Footer -->
      <div style="
        padding: var(--space-4) var(--space-6);
        border-top: 1px solid var(--color-border);
        display: flex; justify-content: flex-end; gap: var(--space-3);
        flex-shrink: 0;
        background: var(--color-surface, #fff);
      ">
        <button id="btn-resolve-cancel" class="btn btn-ghost">Cancel</button>
        <button id="btn-resolve-confirm" class="btn btn-primary" style="display: flex; align-items: center; gap: var(--space-2);">
          <span class="icon" style="font-size: 18px;">check</span>
          Confirm Decision
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const errorEl     = overlay.querySelector('#resolve-error');
  const qtyInput    = overlay.querySelector('#resolve-qty');
  const qtyHint     = overlay.querySelector('#resolve-qty-hint');
  const outcomeSel  = overlay.querySelector('#resolve-outcome');
  const notesInput  = overlay.querySelector('#resolve-notes');
  const confirmBtn  = overlay.querySelector('#btn-resolve-confirm');

  // Dynamic remaining hint
  qtyInput.addEventListener('input', () => {
    const val = parseInt(qtyInput.value, 10) || 0;
    if (val >= remaining) {
      qtyHint.textContent = `Resolving all ${remaining} ${unit}.`;
      qtyHint.style.color = 'var(--color-text-muted)';
    } else if (val > 0) {
      const left = remaining - val;
      qtyHint.textContent = `Resolving ${val} ${unit} (${left} ${unit} will remain under Quarantine).`;
      qtyHint.style.color = '#d97706';
    } else {
      qtyHint.textContent = `Enter a quantity between 1 and ${remaining}.`;
      qtyHint.style.color = 'var(--color-danger)';
    }
  });

  const closeResolveModal = () => {
    overlay.remove();
    document.removeEventListener('keydown', handleKeyDown);
  };
  const handleKeyDown = (e) => { if (e.key === 'Escape') closeResolveModal(); };
  document.addEventListener('keydown', handleKeyDown);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeResolveModal(); });
  overlay.querySelector('#btn-resolve-close')?.addEventListener('click', closeResolveModal);
  overlay.querySelector('#btn-resolve-cancel')?.addEventListener('click', closeResolveModal);

  confirmBtn.addEventListener('click', async () => {
    const qty     = parseInt(qtyInput.value, 10);
    const outcome = outcomeSel.value;
    const notes   = notesInput.value.trim();

    if (!qty || qty < 1) {
      _showError(errorEl, 'Please enter a valid quantity.');
      return;
    }
    if (qty > remaining) {
      _showError(errorEl, `Cannot resolve more than ${remaining} ${unit}.`);
      return;
    }

    errorEl.style.display = 'none';
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Saving...';

    const { error } = await resolveQuarantineIncident(incident.id, { outcome, quantity: qty, notes }, profile);
    if (error) {
      _showError(errorEl, 'Resolution failed: ' + error);
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '<span class="icon" style="font-size: 18px;">check</span> Confirm Decision';
      return;
    }

    closeResolveModal();
    if (typeof onSuccess === 'function') onSuccess();
  });
}
