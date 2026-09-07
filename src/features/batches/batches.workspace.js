/**
 * Batch Management - Full-Screen Bulk Registration Workspace
 *
 * MNAO Strict Validation Architecture:
 *   - Anti-hallucination <select> dropdown pre-populated with DB commodities
 *   - 100% Mandatory Expiration Dates and Packaging Units (strictly rejecting "UNT", "TBD", blank)
 *   - Real-time reactivity for deterministic FEFO SKU and Batch Code generation
 *   - Split Batch feature dividing quantities and prompting separate expiration dates
 *   - Hard-blocked submission button until every row passes validation
 */

import { supabase } from '../../core/supabase.js';
import { createBatch, fetchBatches } from './batches.service.js';
import { escapeHtml } from './batches.render.js';
import { ScannerComponent } from '../scanner/scanner.component.js';
import { SystemDialog } from '../../shared/components/dialog.component.js';
import { 
  generateCommoditySKU, 
  generateBatchCode, 
  generateDuplicateSignature,
  extractExpYYMM 
} from '../../shared/utils/code-generator.util.js';

let bulkRows = [];
let availableCommodities = [];

/**
 * Fuzzy matches raw OCR extracted commodity text against registered database commodities.
 * @param {string} text 
 * @param {Array} commodities 
 * @returns {Object|null} Matched commodity record or null
 */
function fuzzyMatchCommodity(text, commodities) {
  if (!text || !commodities || !commodities.length) return null;
  const clean = text.toLowerCase().trim();

  // 1. Exact match
  let found = commodities.find(c => c.name.toLowerCase() === clean);
  if (found) return found;

  // 2. Contains match
  found = commodities.find(c => clean.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(clean));
  if (found) return found;

  // 3. Word token overlap
  const words = clean.split(/[^a-z0-9]+/).filter(w => w.length >= 3);
  let bestMatch = null;
  let maxScore = 0;

  for (const c of commodities) {
    const cWords = c.name.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3);
    let score = 0;
    for (const w of words) {
      if (cWords.includes(w)) score++;
    }
    if (score > maxScore) {
      maxScore = score;
      bestMatch = c;
    }
  }

  return maxScore > 0 ? bestMatch : null;
}

/**
 * Opens full-screen bulk registration workspace.
 */
export async function openFullScreenWorkspace({ commodities, profile, onSaveComplete }) {
  bulkRows = [];
  availableCommodities = commodities || [];

  const overlay = document.createElement('div');
  overlay.className = 'workspace-overlay';
  overlay.id = 'batch-workspace-overlay';

  overlay.innerHTML = `
    <style>
      .cell-invalid {
        border: 1.5px solid #ef4444 !important;
        background: #fef2f2 !important;
        border-radius: 4px;
      }
      .ws-select-commodity {
        cursor: pointer;
      }
      .ws-select-commodity option {
        background: #ffffff;
        color: var(--text-main);
      }
      .action-icon-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 6px;
        border-radius: 4px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s ease, color 0.15s ease;
      }
      .action-icon-btn:hover {
        background: rgba(0, 0, 0, 0.05);
      }
      .split-btn:hover {
        color: var(--color-primary) !important;
      }
      .delete-btn:hover {
        color: #ef4444 !important;
      }
    </style>

    <div class="workspace-header">
      <div style="display:flex; align-items:center; gap:16px;">
         <h2 class="workspace-header-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            Bulk Batch Registration
         </h2>
         <span class="workspace-header-subtitle">NutriVision MNAO Intake (FEFO Strict)</span>
      </div>
      <div class="workspace-actions">
         <button id="workspace-cancel-btn" style="background:transparent; border:none; font-weight:600; color:var(--text-muted); cursor:pointer; padding:10px 16px;">Cancel / Exit</button>
         <button id="workspace-save-btn" class="btn-elevated" disabled title="Fill in all mandatory units and expiration dates to enable.">Register All Batches</button>
      </div>
    </div>

    <div class="workspace-body">
      <!-- Left Panel: Scanner (Collapsible) -->
      <div class="workspace-panel-left" id="workspace-panel-left">
         <div class="scanner-pane-header">
           <span style="font-size:13px; font-weight:600; color:var(--text-main);">Scanner Module</span>
           <button class="scanner-hamburger-btn" id="scanner-collapse-btn" title="Collapse scanner pane" aria-label="Toggle scanner pane">
             <span></span><span></span><span></span>
           </button>
         </div>
         <div id="bulk-scanner-container" style="flex:1; display:flex; flex-direction:column; overflow:hidden;"></div>
         <button id="scanner-pane-toggle-tab" title="Expand scanner pane" aria-label="Expand scanner pane">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
           SCANNER
         </button>
      </div>

      <!-- Right Panel: Data Grid -->
      <div class="workspace-panel-right">
         <div class="fx-bar-wrapper">
           <span class="fx-bar-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>
           <input class="fx-bar-input" id="fx-bar-input" placeholder="Click a cell to edit its value here..." readonly />
         </div>
         <div class="headless-grid-container" style="border-radius:0 0 8px 8px;">
           <div class="headless-grid-scroll" style="overflow-x:auto; flex:1;">
           <table class="headless-grid">
              <thead>
                 <tr>
                    <th style="min-width:200px;">Commodity</th>
                    <th style="min-width:110px;">Unit</th>
                    <th style="min-width:150px;">Batch Code</th>
                    <th style="min-width:85px;">Qty</th>
                    <th style="min-width:130px;">Del. Date</th>
                    <th style="min-width:135px;">Exp. Date</th>
                    <th style="min-width:150px;">Supplier</th>
                    <th style="min-width:76px; text-align:center;">Actions</th>
                 </tr>
              </thead>
              <tbody id="bulk-table-body">
                 <!-- Dynamic Rows -->
              </tbody>
           </table>
           </div>
           <div style="padding:16px; display:flex; justify-content:space-between; align-items:center;">
              <button id="bulk-add-row-btn" style="background:none; border:none; color:var(--color-primary); font-weight:600; cursor:pointer; display:flex; align-items:center; gap:8px;">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                 Add New Row Manually
              </button>
              <div id="validation-status-pill" style="font-size:12px; font-weight:600; color:var(--text-muted);">
                 All rows must have valid Unit and Expiration Date
              </div>
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
  `;

  document.body.appendChild(overlay);

  // Mount ScannerComponent
  new ScannerComponent({
    container: document.getElementById('bulk-scanner-container'),
    onComplete: (parsedRows) => {
      const today = new Date().toISOString().split('T')[0];
      parsedRows.forEach(r => {
        let matched = null;
        if (r.commodityId) {
          matched = availableCommodities.find(c => c.id === r.commodityId);
        }
        if (!matched && r.productName) {
          matched = fuzzyMatchCommodity(r.productName, availableCommodities);
        }

        const commName = matched ? matched.name : (r.productName || '');
        const commId = matched ? matched.id : '';
        
        let unit = matched?.unit || r.unit || '';
        const upperUnit = unit.trim().toUpperCase();
        if (['UNT', 'TBD', 'N/A', 'NA', 'NONE', '-'].includes(upperUnit)) {
          unit = '';
        }

        bulkRows.push({
          id: Date.now() + Math.random(),
          commodityId: commId,
          commodityName: commName,
          unit: unit,
          qty: r.qty || '',
          deliveryDate: r.deliveryDate || today,
          expDate: r.expDate || '',
          supplier: r.supplier || '',
          notes: ''
        });
      });
      renderBulkTable();
    }
  });

  renderBulkTable();

  // Pane collapse toggle
  const leftPanel = document.getElementById('workspace-panel-left');
  document.getElementById('scanner-collapse-btn')?.addEventListener('click', () => {
    leftPanel.classList.toggle('is-collapsed');
  });
  document.getElementById('scanner-pane-toggle-tab')?.addEventListener('click', () => {
    leftPanel.classList.remove('is-collapsed');
  });

  // FX Bar editing
  const fxBar = document.getElementById('fx-bar-input');
  let fxTarget = null;
  document.getElementById('bulk-table-body')?.addEventListener('focusin', (e) => {
    const inp = e.target.closest('input:not([disabled]), select');
    if (!inp) return;
    fxTarget = inp;
    fxBar.value = inp.value;
    fxBar.removeAttribute('readonly');
  });
  fxBar?.addEventListener('input', () => { 
    if (fxTarget) {
      fxTarget.value = fxBar.value;
      fxTarget.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  fxBar?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      if (fxTarget) {
        fxTarget.dispatchEvent(new Event('change', { bubbles: true }));
        fxTarget.blur();
        fxTarget = null;
      }
      fxBar.setAttribute('readonly', true);
      fxBar.value = '';
    }
  });

  document.getElementById('workspace-cancel-btn')?.addEventListener('click', () => overlay.remove());

  document.getElementById('bulk-add-row-btn')?.addEventListener('click', () => {
    syncBulkState();
    bulkRows.push({
      id: Date.now() + Math.random(),
      commodityId: '',
      commodityName: '',
      unit: '',
      qty: '',
      deliveryDate: new Date().toISOString().split('T')[0],
      expDate: '',
      supplier: '',
      notes: ''
    });
    renderBulkTable();
  });

  document.getElementById('workspace-save-btn')?.addEventListener('click', async () => {
    await handleWorkspaceSave({ profile, overlay, onSaveComplete });
  });
}

/**
 * Computes deterministic Batch Code or returns incomplete state.
 */
function computeRowCode(commodityName, unit, expDate) {
  try {
    if (!commodityName || !unit || !expDate) {
      return { code: '[ INCOMPLETE ]', isComplete: false };
    }
    const sku = generateCommoditySKU(commodityName, unit);
    const code = generateBatchCode(sku, expDate);
    return { sku, code, isComplete: true };
  } catch (err) {
    return { code: '[ INCOMPLETE ]', isComplete: false, error: err.message };
  }
}

/**
 * Updates a row's Batch Code visual cell in real time without causing DOM focus loss.
 */
function updateRowLiveCode(tr, row) {
  const batchInput = tr.querySelector('.ws-input-batch');
  if (!batchInput) return;

  const result = computeRowCode(row.commodityName, row.unit, row.expDate);
  if (result.isComplete) {
    batchInput.value = result.code;
    batchInput.style.color = 'var(--text-main)';
    batchInput.style.fontWeight = '600';
    batchInput.style.fontFamily = 'monospace';
    row.sku = result.sku;
    row.batchCode = result.code;
  } else {
    batchInput.value = '[ INCOMPLETE ]';
    batchInput.style.color = '#dc2626';
    batchInput.style.fontWeight = '700';
    batchInput.style.fontFamily = 'monospace';
    row.sku = '';
    row.batchCode = '';
  }
}

/**
 * Renders the table rows and attaches granular real-time event listeners.
 */
function renderBulkTable() {
  const tbody = document.getElementById('bulk-table-body');
  if (!tbody) return;

  if (bulkRows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="padding:48px; text-align:center; color:var(--text-muted);">No data available. Extract from receipt scanner or add manually.</td></tr>`;
    document.getElementById('summary-commodities').textContent = '0';
    document.getElementById('summary-units').textContent = '0';
    validateTableRows();
    return;
  }

  tbody.innerHTML = bulkRows.map((row, index) => {
    const codeResult = computeRowCode(row.commodityName, row.unit, row.expDate);
    const displayBatchCode = codeResult.isComplete ? codeResult.code : '[ INCOMPLETE ]';
    const batchStyle = codeResult.isComplete 
      ? 'color:var(--text-main); font-weight:600; font-family:monospace;' 
      : 'color:#dc2626; font-weight:700; font-family:monospace;';

    return `
      <tr class="bulk-row" data-index="${index}">
         <td>
            <select class="headless-input ws-select-commodity">
               <option value="" disabled ${!row.commodityId ? 'selected' : ''}>-- Select Commodity --</option>
               ${availableCommodities.map(c => {
                 const isSelected = row.commodityId === c.id || (!row.commodityId && row.commodityName?.toLowerCase() === c.name.toLowerCase());
                 return `<option value="${c.id}" data-unit="${escapeHtml(c.unit || '')}" ${isSelected ? 'selected' : ''}>${escapeHtml(c.name)} (${escapeHtml(c.unit || 'No Unit')})</option>`;
               }).join('')}
            </select>
         </td>
         <td>
            <input type="text" class="headless-input ws-input-unit" placeholder="Unit (Req.)" value="${escapeHtml(row.unit || '')}" />
         </td>
         <td>
            <input type="text" class="headless-input ws-input-batch" value="${displayBatchCode}" disabled style="${batchStyle}" />
         </td>
         <td>
            <input type="number" class="headless-input ws-input-qty" value="${escapeHtml(row.qty)}" min="1" placeholder="0" />
         </td>
         <td>
            <input type="date" class="headless-input ws-input-del" value="${escapeHtml(row.deliveryDate)}" />
         </td>
         <td>
            <input type="date" class="headless-input ws-input-exp" value="${escapeHtml(row.expDate)}" />
         </td>
         <td>
            <input type="text" class="headless-input ws-input-sup" value="${escapeHtml(row.supplier)}" placeholder="Supplier/Donor..." />
         </td>
         <td style="text-align:center;">
            <div style="display:flex; align-items:center; justify-content:center; gap:4px;">
               <button class="action-icon-btn split-btn bulk-split-btn" title="Split batch for dual expiration dates" style="color:var(--text-muted);">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                     <path d="M16 3h5v5"/>
                     <path d="M8 3H3v5"/>
                     <path d="M12 21V12"/>
                     <path d="M21 3l-8.5 8.5"/>
                     <path d="M3 3l8.5 8.5"/>
                  </svg>
               </button>
               <button class="action-icon-btn delete-btn bulk-delete-btn" title="Remove line" style="color:var(--text-muted);">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                     <path d="M3 6h18"/>
                     <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
               </button>
            </div>
         </td>
      </tr>
    `;
  }).join('');

  updateFooters();
  bindRowEvents();
  validateTableRows();
}

/**
 * Binds row-level event listeners for real-time reactivity without full re-rendering.
 */
function bindRowEvents() {
  const rows = document.querySelectorAll('.bulk-row');
  rows.forEach((tr, index) => {
    const row = bulkRows[index];
    if (!row) return;

    const commSelect = tr.querySelector('.ws-select-commodity');
    const unitInput = tr.querySelector('.ws-input-unit');
    const expInput = tr.querySelector('.ws-input-exp');
    const qtyInput = tr.querySelector('.ws-input-qty');
    const delInput = tr.querySelector('.ws-input-del');
    const supInput = tr.querySelector('.ws-input-sup');
    const splitBtn = tr.querySelector('.bulk-split-btn');
    const deleteBtn = tr.querySelector('.bulk-delete-btn');

    // 1. Commodity Dropdown Change
    commSelect?.addEventListener('change', () => {
      const selectedId = commSelect.value;
      const matched = availableCommodities.find(c => c.id === selectedId);
      if (matched) {
        row.commodityId = matched.id;
        row.commodityName = matched.name;
        // Auto-assign unit if empty or changed
        row.unit = matched.unit || '';
        if (unitInput) unitInput.value = row.unit;
      }
      updateRowLiveCode(tr, row);
      updateFooters();
      validateTableRows();
    });

    // 2. Unit Field Input/Change
    unitInput?.addEventListener('input', () => {
      row.unit = unitInput.value;
      updateRowLiveCode(tr, row);
      validateTableRows();
    });

    // 3. Expiration Date Input/Change
    expInput?.addEventListener('input', () => {
      row.expDate = expInput.value;
      updateRowLiveCode(tr, row);
      validateTableRows();
    });
    expInput?.addEventListener('change', () => {
      row.expDate = expInput.value;
      updateRowLiveCode(tr, row);
      validateTableRows();
    });

    // 4. Quantity Input
    qtyInput?.addEventListener('input', () => {
      row.qty = qtyInput.value;
      updateFooters();
      validateTableRows();
    });

    // 5. Delivery Date & Supplier
    delInput?.addEventListener('input', () => { row.deliveryDate = delInput.value; validateTableRows(); });
    supInput?.addEventListener('input', () => { row.supplier = supInput.value; });

    // 6. Split Batch Action
    splitBtn?.addEventListener('click', () => {
      handleSplitRow(index);
    });

    // 7. Delete Row
    deleteBtn?.addEventListener('click', () => {
      syncBulkState();
      bulkRows.splice(index, 1);
      renderBulkTable();
    });
  });
}

/**
 * Handles the Split Batch feature.
 * Takes current row quantity Q, divides it by 2 (rounding up/down if odd),
 * duplicates row directly below it, and clears duplicate expiration date for separate entry.
 */
function handleSplitRow(index) {
  syncBulkState();
  const target = bulkRows[index];
  if (!target) return;

  const currentQty = parseInt(target.qty, 10);
  if (isNaN(currentQty) || currentQty <= 1) {
    SystemDialog.alert('Quantity must be at least 2 units to split into separate expiration batches.');
    return;
  }

  // Divides quantity: ceil for first row, remainder for second row (conserves exact sum)
  const q1 = Math.ceil(currentQty / 2);
  const q2 = currentQty - q1;

  target.qty = String(q1);

  const splitDuplicate = {
    ...target,
    id: Date.now() + Math.random(),
    qty: String(q2),
    expDate: '', // Demands mandatory second expiration date entry
    batchCode: ''
  };

  bulkRows.splice(index + 1, 0, splitDuplicate);
  renderBulkTable();
}

/**
 * Syncs DOM values into bulkRows array.
 */
function syncBulkState() {
  const rows = document.querySelectorAll('.bulk-row');
  rows.forEach((tr, i) => {
    if (!bulkRows[i]) return;
    const commSelect = tr.querySelector('.ws-select-commodity');
    const unitInput = tr.querySelector('.ws-input-unit');
    const qtyInput = tr.querySelector('.ws-input-qty');
    const delInput = tr.querySelector('.ws-input-del');
    const expInput = tr.querySelector('.ws-input-exp');
    const supInput = tr.querySelector('.ws-input-sup');

    if (commSelect && commSelect.value) {
      bulkRows[i].commodityId = commSelect.value;
      const matched = availableCommodities.find(c => c.id === commSelect.value);
      if (matched) bulkRows[i].commodityName = matched.name;
    }
    if (unitInput) bulkRows[i].unit = unitInput.value;
    if (qtyInput) bulkRows[i].qty = qtyInput.value;
    if (delInput) bulkRows[i].deliveryDate = delInput.value;
    if (expInput) bulkRows[i].expDate = expInput.value;
    if (supInput) bulkRows[i].supplier = supInput.value;
  });
}

/**
 * Updates summary counts in workspace footer.
 */
function updateFooters() {
  let totalQty = 0;
  let uniqueComms = new Set();

  bulkRows.forEach(r => {
    if (r.commodityId || r.commodityName) {
      uniqueComms.add((r.commodityId || r.commodityName).toLowerCase());
    }
    const q = parseInt(r.qty, 10);
    if (!isNaN(q) && q > 0) totalQty += q;
  });

  const commEl = document.getElementById('summary-commodities');
  const unitEl = document.getElementById('summary-units');
  if (commEl) commEl.textContent = uniqueComms.size;
  if (unitEl) unitEl.textContent = totalQty;
}

/**
 * Strict Visual Validation & Submission Block.
 * Iterates through all rows. If Expiration Date or Unit is blank or invalid,
 * applies red outline/background class. Hard-blocks the Register All Batches button.
 */
export function validateTableRows() {
  const rows = document.querySelectorAll('.bulk-row');
  const saveBtn = document.getElementById('workspace-save-btn');
  const statusPill = document.getElementById('validation-status-pill');

  let allValid = rows.length > 0;
  let invalidCount = 0;

  rows.forEach((tr, i) => {
    const row = bulkRows[i];
    if (!row) return;

    const commSelect = tr.querySelector('.ws-select-commodity');
    const unitInput = tr.querySelector('.ws-input-unit');
    const expInput = tr.querySelector('.ws-input-exp');
    const qtyInput = tr.querySelector('.ws-input-qty');

    let rowValid = true;

    // 1. Commodity Check
    if (!row.commodityId && !row.commodityName) {
      commSelect?.classList.add('cell-invalid');
      rowValid = false;
    } else {
      commSelect?.classList.remove('cell-invalid');
    }

    // 2. Strict Unit Check (reject null, empty, UNT, TBD)
    const cleanUnit = (row.unit || '').trim().toUpperCase();
    const isUnitValid = cleanUnit && !['UNT', 'TBD', 'N/A', 'NA', 'NONE', '-'].includes(cleanUnit);
    if (!isUnitValid) {
      unitInput?.classList.add('cell-invalid');
      rowValid = false;
    } else {
      unitInput?.classList.remove('cell-invalid');
    }

    // 3. Strict Expiration Date Check
    let isExpValid = false;
    if (row.expDate && row.expDate.trim() && !['TBD', 'N/A'].includes(row.expDate.trim().toUpperCase())) {
      try {
        extractExpYYMM(row.expDate);
        isExpValid = true;
      } catch {
        isExpValid = false;
      }
    }
    if (!isExpValid) {
      expInput?.classList.add('cell-invalid');
      rowValid = false;
    } else {
      expInput?.classList.remove('cell-invalid');
    }

    // 4. Quantity Check
    const qNum = parseInt(row.qty, 10);
    if (isNaN(qNum) || qNum <= 0) {
      qtyInput?.classList.add('cell-invalid');
      rowValid = false;
    } else {
      qtyInput?.classList.remove('cell-invalid');
    }

    if (!rowValid) {
      allValid = false;
      invalidCount++;
    }
  });

  if (rows.length === 0) allValid = false;

  if (saveBtn) {
    saveBtn.disabled = !allValid;
    if (!allValid) {
      saveBtn.style.opacity = '0.5';
      saveBtn.style.cursor = 'not-allowed';
      if (statusPill) {
        statusPill.textContent = rows.length === 0 
          ? 'No batch rows available.'
          : `${invalidCount} row(s) require attention (Unit and Expiration Date are mandatory).`;
        statusPill.style.color = '#ef4444';
      }
    } else {
      saveBtn.style.opacity = '1';
      saveBtn.style.cursor = 'pointer';
      if (statusPill) {
        statusPill.textContent = 'All rows meet MNAO strict validation standards.';
        statusPill.style.color = 'var(--color-primary)';
      }
    }
  }

  return allValid;
}

/**
 * Handles batch registration submission with duplicate signature detection.
 */
async function handleWorkspaceSave({ profile, overlay, onSaveComplete }) {
  syncBulkState();

  if (!validateTableRows()) {
    return SystemDialog.alert('Cannot register batches: One or more rows have missing or invalid Expiration Dates, Units, or Quantities.');
  }

  // Duplicate signature fingerprint detection
  const signatures = new Map();
  const duplicates = [];

  bulkRows.forEach((r, idx) => {
    try {
      const sku = generateCommoditySKU(r.commodityName, r.unit);
      const sig = generateDuplicateSignature(r.receiptNumber, r.supplier, r.deliveryDate, sku, r.qty);
      if (signatures.has(sig)) {
        duplicates.push({ row: idx + 1, prev: signatures.get(sig) + 1, sku });
      } else {
        signatures.set(sig, idx);
      }
    } catch {}
  });

  if (duplicates.length > 0) {
    const dupMsg = duplicates.map(d => `Row ${d.row} is identical to Row ${d.prev} (${d.sku})`).join('\n');
    const proceed = await SystemDialog.confirm(
      `Duplicate line signatures detected:\n${dupMsg}\n\nDo you want to proceed with registration anyway?`
    );
    if (!proceed) return;
  }

  const btn = document.getElementById('workspace-save-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Registering Batches...';
  }

  let successCount = 0;
  let errors = [];

  for (let i = 0; i < bulkRows.length; i++) {
    const row = bulkRows[i];
    try {
      const sku = generateCommoditySKU(row.commodityName, row.unit);
      const batchCode = generateBatchCode(sku, row.expDate);

      const formData = {
        commodity_id: row.commodityId,
        batch_number: batchCode,
        quantity: row.qty,
        delivery_date: row.deliveryDate,
        expiration_date: row.expDate,
        supplier: row.supplier,
        notes: row.notes || ''
      };

      const res = await createBatch(formData, profile);
      if (res.error) {
        errors.push(`Row ${i + 1} (${batchCode}): ${res.error}`);
      } else {
        successCount++;
      }
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }

  if (errors.length > 0) {
    SystemDialog.alert(`Registered ${successCount} batches, but encountered errors:\n` + errors.join('\n'));
  }

  overlay.remove();
  if (typeof onSaveComplete === 'function') onSaveComplete();
}
