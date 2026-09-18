/**
 * Defects Module — Log Incident Modal
 * Searchable batch selector → batch info card → form → print preview.
 */

import { fetchActiveBatchesForSelector } from './defects.service.js';
import { showDefectPrintPreview, getDefectPdfFileName } from './defects.pdf.js';
import { logDefectIncident } from './defects.service.js';

const CLASSIFICATIONS = [
  'Damaged Packaging / Torn',
  'Contamination / Spoilage',
  'Pest Infestation',
  'DOH Recall / Safety Hold',
  'Expired Stock',
  'Physical Damage',
  'Other',
];

/**
 * Opens the Log Incident modal.
 * @param {Object}   profile    - logged-in user
 * @param {Function} onSuccess  - called after incident is confirmed & saved
 */
export async function openLogIncidentModal(profile, onSuccess) {
  // Fetch active batches first
  const { data: batches, error } = await fetchActiveBatchesForSelector();
  if (error) {
    alert('Error: ' + error);
    return;
  }

  _renderModal(batches, profile, onSuccess);
}

// ─── Modal Render ─────────────────────────────────────────────────────────────

function _renderModal(batches, profile, onSuccess) {
  // Remove any existing modal
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
      max-height: 90vh; overflow-y: auto;
      box-shadow: 0 24px 64px rgba(0,0,0,0.3);
    ">
      <!-- Modal Header -->
      <div style="
        padding: var(--space-6);
        border-bottom: 1px solid var(--color-border);
        display: flex; align-items: flex-start; gap: var(--space-4);
      ">
        <div style="
          width: 44px; height: 44px; border-radius: var(--radius-full); flex-shrink: 0;
          background: #fde8e8; display: flex; align-items: center; justify-content: center;
        ">
          <span class="icon" style="color: #c62828; font-size: 22px;">report</span>
        </div>
        <div>
          <h2 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold);">Report Defective Stock</h2>
          <p style="font-size: var(--font-size-sm); color: var(--color-text-muted); margin-top: 2px;">
            Log damaged or recalled commodities to remove them from active inventory.
          </p>
        </div>
      </div>

      <!-- Modal Body -->
      <div style="padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-5);">

        <!-- Batch Search -->
        <div class="form-group">
          <label class="form-label form-label--required" for="defect-batch-search">Search Batch</label>
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
          <!-- Dropdown list -->
          <div id="defect-batch-dropdown" style="
            display: none; position: relative; z-index: 10;
            border: 1px solid var(--color-border); border-top: none;
            border-radius: 0 0 var(--radius-md) var(--radius-md);
            background: var(--color-surface); max-height: 180px; overflow-y: auto;
            box-shadow: var(--shadow-md);
          ">
            <!-- Options injected by JS -->
          </div>
        </div>

        <!-- Target Batch Info Card (hidden until batch selected) -->
        <div id="defect-batch-info" style="display: none;
          background: var(--color-surface-alt, #f8faf9);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          display: none; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-4);
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
            <div style="font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); margin-bottom: 4px;">Currently Active</div>
            <div id="info-quantity" style="font-weight: var(--font-weight-bold);">—</div>
          </div>
        </div>

        <!-- Defect Classification -->
        <div class="form-group">
          <label class="form-label form-label--required" for="defect-classification">Defect Classification</label>
          <select id="defect-classification" class="form-select">
            <option value="">Select reason...</option>
            ${CLASSIFICATIONS.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>

        <!-- Quantity + Action -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label form-label--required" for="defect-qty">Quantity Affected</label>
            <input type="number" id="defect-qty" class="form-input" min="1" placeholder="e.g. 5">
            <span class="form-hint" id="defect-qty-hint"></span>
          </div>
          <div class="form-group">
            <label class="form-label form-label--required" for="defect-action">Action to Take</label>
            <select id="defect-action" class="form-select">
              <option value="Dispose">Dispose (Partial/Full)</option>
              <option value="Quarantine">Quarantine (Partial/Full)</option>
              <option value="Dispose Entire Batch">Dispose Entire Batch</option>
              <option value="Quarantine Entire Batch">Quarantine Entire Batch</option>
            </select>
          </div>
        </div>

        <!-- Remarks -->
        <div class="form-group">
          <label class="form-label" for="defect-remarks">Remarks / Incident Details</label>
          <textarea
            id="defect-remarks"
            class="form-textarea"
            rows="3"
            placeholder="Explain how the damage was discovered or attach DOH memo reference number..."
          ></textarea>
        </div>

        <!-- Photo Evidence -->
        <div class="form-group">
          <label class="form-label" for="defect-evidence">Photographic Evidence <span style="color: var(--color-text-muted); font-weight: normal;">(Optional)</span></label>
          <div style="
            border: 2px dashed var(--color-border);
            border-radius: var(--radius-lg);
            padding: var(--space-4);
            text-align: center;
            cursor: pointer;
            transition: border-color var(--transition-md3), background var(--transition-md3);
            position: relative;
          " id="defect-evidence-dropzone">
            <input type="file" id="defect-evidence" accept="image/*" style="position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;">
            <span class="icon" style="font-size: 28px; color: var(--color-text-muted); display: block; margin-bottom: 4px;">add_photo_alternate</span>
            <p style="font-size: var(--font-size-sm); color: var(--color-text-muted); margin: 0;">Click or drag &amp; drop to upload image</p>
            <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 4px 0 0;">JPG, PNG, WEBP — Image will be embedded in the PDF report.</p>
          </div>
          <!-- Preview -->
          <div id="defect-evidence-preview" style="display:none; margin-top: var(--space-3); position: relative;">
            <img id="defect-evidence-img" src="" alt="Evidence preview" style="
              width: 100%; max-height: 180px; object-fit: cover;
              border-radius: var(--radius-md); border: 1px solid var(--color-border);
            ">
            <button id="defect-evidence-remove" type="button" style="
              position: absolute; top: 6px; right: 6px;
              background: rgba(0,0,0,0.6); color: #fff; border: none;
              border-radius: var(--radius-full); width: 26px; height: 26px;
              cursor: pointer; display: flex; align-items: center; justify-content: center;
            "><span class="icon" style="font-size: 16px;">close</span></button>
            <p id="defect-evidence-name" style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 6px;"></p>
          </div>
        </div>

        <div id="defect-modal-error" style="display:none; color: var(--color-danger); font-size: var(--font-size-sm); background: #fff5f5; border: 1px solid var(--color-danger); border-radius: var(--radius-md); padding: 10px 14px;"></div>

      </div>

      <!-- Modal Footer -->
      <div style="
        padding: var(--space-4) var(--space-6);
        border-top: 1px solid var(--color-border);
        display: flex; justify-content: flex-end; gap: var(--space-3);
      ">
        <button id="defect-modal-cancel" class="btn btn-ghost">Cancel</button>
        <button id="defect-modal-generate" class="btn btn-primary" style="display: flex; align-items: center; gap: var(--space-2);">
          <span class="icon" style="font-size: 18px;">picture_as_pdf</span>
          Generate PDF
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  _bindModalEvents(overlay, batches, profile, onSuccess);
}

// ─── Modal Events ─────────────────────────────────────────────────────────────

function _bindModalEvents(overlay, batches, profile, onSuccess) {
  let selectedBatch = null;
  let imageData     = null; // base64 data URL of evidence photo

  const searchInput  = overlay.querySelector('#defect-batch-search');
  const dropdown     = overlay.querySelector('#defect-batch-dropdown');
  const batchInfo    = overlay.querySelector('#defect-batch-info');
  const errorEl      = overlay.querySelector('#defect-modal-error');
  const fileInput    = overlay.querySelector('#defect-evidence');
  const preview      = overlay.querySelector('#defect-evidence-preview');
  const previewImg   = overlay.querySelector('#defect-evidence-img');
  const previewName  = overlay.querySelector('#defect-evidence-name');
  const removeBtn    = overlay.querySelector('#defect-evidence-remove');
  const dropzone     = overlay.querySelector('#defect-evidence-dropzone');
  const actionSelect = overlay.querySelector('#defect-action');
  const qtyInput     = overlay.querySelector('#defect-qty');

  // ── Action selection / Qty auto-fill ───────────────────────────────────────
  actionSelect.addEventListener('change', () => {
    if (!selectedBatch) return;
    const isEntireBatch = actionSelect.value.includes('Entire Batch');
    if (isEntireBatch) {
      qtyInput.value = selectedBatch.quantity;
      qtyInput.readOnly = true;
      qtyInput.style.background = 'var(--color-surface-alt)';
    } else {
      qtyInput.readOnly = false;
      qtyInput.style.background = '';
    }
  });

  // ── Image upload / preview ─────────────────────────────────────────────────
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    _readFileAsBase64(file, (dataUrl) => {
      imageData = dataUrl;
      previewImg.src  = dataUrl;
      previewName.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      preview.style.display  = 'block';
      dropzone.style.display = 'none';
    });
  });

  // Drag-and-drop visual feedback
  dropzone.addEventListener('dragover',  e => { e.preventDefault(); dropzone.style.borderColor = 'var(--color-primary)'; dropzone.style.background = '#f4fbf5'; });
  dropzone.addEventListener('dragleave', () => { dropzone.style.borderColor = 'var(--color-border)'; dropzone.style.background = ''; });
  dropzone.addEventListener('drop',      e => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--color-border)'; dropzone.style.background = '';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      _readFileAsBase64(file, (dataUrl) => {
        imageData = dataUrl;
        previewImg.src  = dataUrl;
        previewName.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        preview.style.display  = 'block';
        dropzone.style.display = 'none';
      });
    }
  });

  // Remove evidence
  removeBtn.addEventListener('click', () => {
    imageData = null;
    fileInput.value   = '';
    previewImg.src    = '';
    preview.style.display  = 'none';
    dropzone.style.display = '';
  });

  // ── Batch search/filter ────────────────────────────────────────────────────
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    selectedBatch = null;
    _hideBatchInfo(batchInfo);

    if (!q) { dropdown.style.display = 'none'; return; }

    const matches = batches.filter(b =>
      b.batch_number.toLowerCase().includes(q) ||
      b.commodities?.name?.toLowerCase().includes(q)
    ).slice(0, 10);

    if (!matches.length) {
      dropdown.innerHTML = `<div style="padding: 10px 14px; color: var(--color-text-muted); font-size: var(--font-size-sm);">No batches found.</div>`;
    } else {
      dropdown.innerHTML = matches.map(b => `
        <div class="defect-batch-option" data-id="${b.id}" style="
          padding: 10px 14px; cursor: pointer; font-size: var(--font-size-sm);
          border-bottom: 1px solid var(--color-border);
          transition: background var(--transition-md3);
        " onmouseover="this.style.background='var(--color-surface-alt)'" onmouseout="this.style.background=''">
          <strong>${b.batch_number}</strong>
          <span style="color: var(--color-text-muted);"> — ${b.commodities?.name || '?'}</span>
          <span style="float:right; color: var(--color-text-muted);">${b.quantity} ${b.commodities?.unit || ''}</span>
        </div>
      `).join('');
    }
    dropdown.style.display = 'block';

    // Click handler on options
    dropdown.querySelectorAll('.defect-batch-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const bid = opt.dataset.id;
        selectedBatch = batches.find(b => b.id === bid);
        if (!selectedBatch) return;

        searchInput.value = selectedBatch.batch_number;
        dropdown.style.display = 'none';
        _showBatchInfo(batchInfo, selectedBatch, overlay);
      });
    });
  });

  // Close dropdown on outside click
  document.addEventListener('click', e => {
    if (!overlay.querySelector('#defect-batch-search')?.contains(e.target) &&
        !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  // ── Cancel ─────────────────────────────────────────────────────────────────
  overlay.querySelector('#defect-modal-cancel').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  // ── Generate PDF ───────────────────────────────────────────────────────────
  overlay.querySelector('#defect-modal-generate').addEventListener('click', () => {
    const classification = overlay.querySelector('#defect-classification').value;
    const qty            = parseInt(overlay.querySelector('#defect-qty').value, 10);
    const action         = overlay.querySelector('#defect-action').value;
    const remarks        = overlay.querySelector('#defect-remarks').value.trim();

    // Validate
    if (!selectedBatch) { _showError(errorEl, 'Please select a batch first.'); return; }
    if (!classification) { _showError(errorEl, 'Please select a defect classification.'); return; }
    if (!qty || qty < 1) { _showError(errorEl, 'Quantity affected must be at least 1.'); return; }
    if (qty > selectedBatch.quantity) { _showError(errorEl, `Quantity exceeds batch stock (max: ${selectedBatch.quantity}).`); return; }

    errorEl.style.display = 'none';

    const incidentData = { batchId: selectedBatch.id, classification, quantityAffected: qty, actionTaken: action, remarks, imageData };

    // Open print preview — DB write happens only on confirm
    showDefectPrintPreview(incidentData, selectedBatch, profile, async () => {
      const { data, error } = await logDefectIncident(incidentData, profile);
      if (error) {
        alert('Error saving incident: ' + error);
        return;
      }
      // Close modal and refresh page
      document.body.removeChild(overlay);
      if (typeof onSuccess === 'function') onSuccess(data, selectedBatch, incidentData);
    });
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _showBatchInfo(infoEl, batch, overlay) {
  infoEl.style.display = 'grid';
  overlay.querySelector('#info-batch-number').textContent = batch.batch_number;
  overlay.querySelector('#info-commodity').textContent    = batch.commodities?.name || '—';
  overlay.querySelector('#info-quantity').textContent     = `${batch.quantity} ${batch.commodities?.unit || ''}`;

  // Update qty hint max
  const qtyHint = overlay.querySelector('#defect-qty-hint');
  if (qtyHint) qtyHint.textContent = `Max available: ${batch.quantity}`;
  const qtyInput = overlay.querySelector('#defect-qty');
  if (qtyInput) qtyInput.max = batch.quantity;
}

function _hideBatchInfo(infoEl) {
  infoEl.style.display = 'none';
}

function _showError(el, msg) {
  el.textContent    = msg;
  el.style.display  = 'block';
}

/**
 * Reads a File object and returns a base64 data URL via callback.
 */
function _readFileAsBase64(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => callback(e.target.result);
  reader.onerror = () => console.error('[DefectModal] FileReader error');
  reader.readAsDataURL(file);
}

// ─── Restore Modal ─────────────────────────────────────────────────────────────

import { restoreFromQuarantine } from './defects.service.js';

export function openRestoreModal(incident, profile, onSuccess) {
  // Fallback for legacy records
  const remaining = incident.remaining_quarantined !== null 
    ? incident.remaining_quarantined 
    : incident.quantity_affected;

  // Remove any existing modal
  document.getElementById('restore-modal-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'restore-modal-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 8000;
    background: rgba(0,0,0,0.55); backdrop-filter: blur(3px);
    display: flex; align-items: center; justify-content: center; padding: 24px;
  `;

  overlay.innerHTML = `
    <div style="
      background: var(--color-surface, #fff);
      border-radius: var(--radius-xl, 16px);
      width: 100%; max-width: 480px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.3);
    ">
      <div style="
        padding: var(--space-5) var(--space-6);
        border-bottom: 1px solid var(--color-border);
        display: flex; align-items: center; gap: var(--space-3);
      ">
        <span class="icon" style="color: var(--color-primary); font-size: 24px;">settings_backup_restore</span>
        <h2 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); margin:0;">Restore from Quarantine</h2>
      </div>

      <div style="padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-5);">
        
        <div style="
          background: var(--color-surface-alt, #f8faf9);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);
        ">
          <div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase;">Batch Number</div>
            <div style="font-weight: var(--font-weight-bold); font-family: monospace;">${incident.batches?.batch_number}</div>
          </div>
          <div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase;">Commodity</div>
            <div style="font-weight: var(--font-weight-semibold);">${incident.batches?.commodities?.name}</div>
          </div>
          <div style="grid-column: span 2;">
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase;">Remaining Quarantined</div>
            <div style="font-weight: var(--font-weight-bold); color: var(--color-exp-near); font-size: 16px;">
              ${remaining} ${incident.batches?.commodities?.unit || ''}
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label form-label--required" for="restore-qty">Quantity to Restore</label>
          <input type="number" id="restore-qty" class="form-input" min="1" max="${remaining}" placeholder="e.g. 5">
        </div>

        <div class="form-group">
          <label class="form-label" for="restore-notes">Restoration Notes (Optional)</label>
          <textarea id="restore-notes" class="form-textarea" rows="2" placeholder="Reason for restoration..."></textarea>
        </div>

        <div id="restore-error" style="display:none; color: var(--color-danger); font-size: var(--font-size-sm); background: #fff5f5; border: 1px solid var(--color-danger); border-radius: var(--radius-md); padding: 10px 14px;"></div>
      </div>

      <div style="
        padding: var(--space-4) var(--space-6);
        border-top: 1px solid var(--color-border);
        display: flex; justify-content: flex-end; gap: var(--space-3);
      ">
        <button id="btn-restore-cancel" class="btn btn-ghost">Cancel</button>
        <button id="btn-restore-confirm" class="btn btn-primary" style="display: flex; align-items: center; gap: var(--space-2);">
          <span class="icon" style="font-size: 18px;">check</span>
          Confirm Restore
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const errorEl = overlay.querySelector('#restore-error');
  const qtyInput = overlay.querySelector('#restore-qty');

  overlay.querySelector('#btn-restore-cancel').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  overlay.querySelector('#btn-restore-confirm').addEventListener('click', async () => {
    const qty = parseInt(qtyInput.value, 10);
    const notes = overlay.querySelector('#restore-notes').value.trim();

    if (!qty || qty < 1) {
      errorEl.textContent = 'Please enter a valid quantity.';
      errorEl.style.display = 'block';
      return;
    }
    if (qty > remaining) {
      errorEl.textContent = `Cannot restore more than ${remaining}.`;
      errorEl.style.display = 'block';
      return;
    }

    const btn = overlay.querySelector('#btn-restore-confirm');
    btn.disabled = true;
    btn.textContent = 'Restoring...';
    errorEl.style.display = 'none';

    const { error } = await restoreFromQuarantine(incident.id, incident.batches.id, qty, profile, notes);
    
    if (error) {
      errorEl.textContent = 'Error: ' + error;
      errorEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = '<span class="icon" style="font-size: 18px;">check</span> Confirm Restore';
      return;
    }

    document.body.removeChild(overlay);
    if (typeof onSuccess === 'function') onSuccess();
  });
}
