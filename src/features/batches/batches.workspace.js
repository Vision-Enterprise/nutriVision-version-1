/**
 * Batch Management - Full-Screen Bulk Registration Workspace
 *
 * Handles:
 *   - Auto-increment batch numbering based on DB prefix conventions
 *   - Live interactive grid with Excel-style FX Bar
 *   - Integrated collapsible OCR ScannerComponent
 *   - Batch insertion loop with error handling
 */

import { supabase } from '../../core/supabase.js';
import { createBatch, fetchBatches } from './batches.service.js';
import { escapeHtml } from './batches.render.js';
import { ScannerComponent } from '../scanner/scanner.component.js';
import { SystemDialog } from '../../shared/components/dialog.component.js';

let bulkRows = [];
let baseIncrements = {};

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
  return "UNK";
}

async function fetchBaseIncrements() {
  baseIncrements = {};
  const year = new Date().getFullYear();
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

export async function openFullScreenWorkspace({ commodities, profile, onSaveComplete }) {
  bulkRows = [];
  await fetchBaseIncrements();

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
           </div>
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
      ${commodities.map(c => `<option value="${escapeHtml(c.name)}"></option>`).join('')}
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
          commodityName: r.commodityId ? commodities.find(c => c.id === r.commodityId)?.name : (r.productName || ''),
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
    const inp = e.target.closest('input:not([disabled])');
    if (!inp) return;
    fxTarget = inp;
    fxBar.value = inp.value;
    fxBar.removeAttribute('readonly');
  });
  fxBar?.addEventListener('input', () => { if (fxTarget) fxTarget.value = fxBar.value; });
  fxBar?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      if (fxTarget) {
        fxTarget.dispatchEvent(new Event('input', {bubbles: true}));
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
      id: Date.now(),
      commodityName: '',
      qty: '',
      deliveryDate: new Date().toISOString().split('T')[0],
      expDate: '',
      supplier: '',
      notes: ''
    });
    renderBulkTable();
  });

  document.getElementById('workspace-save-btn')?.addEventListener('click', async () => {
    await handleWorkspaceSave({ commodities, profile, overlay, onSaveComplete });
  });
}

function renderBulkTable() {
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

    let expStyle = '';
    if (row.expDate) {
      const exp = new Date(row.expDate);
      const now = new Date();
      const diffDays = (exp - now) / (1000 * 60 * 60 * 24);
      if (diffDays >= 0 && diffDays < 180) {
        expStyle = 'background: rgba(239, 68, 68, 0.1); color: #ef4444; font-weight: 600;';
      }
    }

    return `
      <tr class="bulk-row" data-index="${index}">
         <td>
            <input list="commodity-list-ws" class="headless-input ws-input-commodity" placeholder="Type commodity..." value="${escapeHtml(row.commodityName)}" />
         </td>
         <td>
            <input type="text" class="headless-input" value="${batchCode}" disabled />
         </td>
         <td>
            <input type="number" class="headless-input ws-input-qty" value="${escapeHtml(row.qty)}" min="1" placeholder="0" />
         </td>
         <td>
            <input type="date" class="headless-input ws-input-del" value="${escapeHtml(row.deliveryDate)}" />
         </td>
         <td>
            <input type="date" class="headless-input ws-input-exp" value="${escapeHtml(row.expDate)}" style="${expStyle}" />
         </td>
         <td>
            <input type="text" class="headless-input ws-input-sup" value="${escapeHtml(row.supplier)}" placeholder="Supplier..." />
         </td>
         <td style="text-align:center;">
            <button class="bulk-delete-btn" style="background:none; border:none; color:var(--text-muted); cursor:pointer; padding:8px;">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
         </td>
      </tr>
    `;
  }).join('');

  document.getElementById('summary-commodities').textContent = uniqueComms.size;
  document.getElementById('summary-units').textContent = totalQty;

  document.querySelectorAll('.ws-input-commodity').forEach(input => {
    input.addEventListener('change', () => { syncBulkState(); renderBulkTable(); });
    input.addEventListener('blur', () => { syncBulkState(); renderBulkTable(); });
  });
  
  document.querySelectorAll('.ws-input-qty').forEach(input => {
    input.addEventListener('input', () => { syncBulkState(); renderBulkTable(); });
  });

  document.querySelectorAll('.ws-input-exp').forEach(input => {
    input.addEventListener('change', () => { syncBulkState(); renderBulkTable(); });
  });

  document.querySelectorAll('.bulk-delete-btn').forEach((btn, i) => {
    btn.addEventListener('click', () => {
      syncBulkState();
      bulkRows.splice(i, 1);
      renderBulkTable();
    });
  });
}

function syncBulkState() {
  const rows = document.querySelectorAll('.bulk-row');
  rows.forEach((tr, i) => {
    bulkRows[i].commodityName = tr.querySelector('.ws-input-commodity').value;
    bulkRows[i].qty = tr.querySelector('.ws-input-qty').value;
    bulkRows[i].deliveryDate = tr.querySelector('.ws-input-del').value;
    bulkRows[i].expDate = tr.querySelector('.ws-input-exp').value;
    bulkRows[i].supplier = tr.querySelector('.ws-input-sup').value;
  });
}

async function handleWorkspaceSave({ commodities, profile, overlay, onSaveComplete }) {
  syncBulkState();
   
  if (bulkRows.length === 0) return SystemDialog.alert('No rows to save.');

  let isValid = true;
  bulkRows.forEach(r => {
    if (!r.commodityName || !r.qty || !r.deliveryDate || !r.expDate) {
      isValid = false;
    }
  });
   
  let invalidComm = bulkRows.find(r => !commodities.find(c => c.name.toLowerCase() === r.commodityName.toLowerCase()));
  if (invalidComm) return SystemDialog.alert('Invalid commodity name: "' + invalidComm.commodityName + '". Please select a valid commodity.');
  if (!isValid) return SystemDialog.alert('Please fill in all required fields (Commodity, Qty, Delivery, Expiration).');

  const btn = document.getElementById('workspace-save-btn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  let successCount = 0;
  let errors = [];

  for (let i = 0; i < bulkRows.length; i++) {
    const row = bulkRows[i];
    const batchCode = generateBatchCode(row.commodityName, i);
      
    const formData = {
      commodity_id: commodities.find(c => c.name.toLowerCase() === row.commodityName.toLowerCase())?.id,
      batch_number: batchCode,
      quantity: row.qty,
      delivery_date: row.deliveryDate,
      expiration_date: row.expDate,
      supplier: row.supplier,
      notes: ''
    };
      
    const res = await createBatch(formData, profile);
    if (res.error) errors.push(res.error);
    else successCount++;
  }

  if (errors.length > 0) SystemDialog.alert(`Saved ${successCount} batches, but encountered errors: \n` + errors.join('\n'));
   
  overlay.remove();
  if (typeof onSaveComplete === 'function') onSaveComplete();
}
