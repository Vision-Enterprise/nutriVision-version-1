/**
 * Milk Bank UI Renderer
 * Generates the 2-section layout, spreadsheet-like data entry grids,
 * strictly matching Form MH.MNAO.FM.002.00 (Log of Milk Received),
 * Pasteurized Batches (BM-XXX), and the Option B Virtual Freezer Map.
 */

import { BARANGAYS } from '../../shared/constants/app.constants.js';
import { DISPENSE_INDICATIONS } from './milk.service.js';

/**
 * 2-Section Page Skeleton:
 * Section 1: Top Metrics Stat Cards
 * Section 2: Milk Bank Workspace (Spreadsheet tabs & tables)
 */
export function renderMilkPageSkeleton() {
  return `
    <div class="milk-page">
      <!-- ── SECTION 1: Top Metrics Stat Cards ───────────────────── -->
      <div class="milk-metrics" id="milk-metrics-container">
        <div class="stat-card milk-stat-card--blue" style="opacity:0.4;">
          <div class="stat-card__label">Loading...</div>
          <div class="stat-card__value">—</div>
        </div>
        <div class="stat-card milk-stat-card--blue" style="opacity:0.3;">
          <div class="stat-card__label">Loading...</div>
          <div class="stat-card__value">—</div>
        </div>
        <div class="stat-card milk-stat-card--blue" style="opacity:0.2;">
          <div class="stat-card__label">Loading...</div>
          <div class="stat-card__value">—</div>
        </div>
        <div class="stat-card milk-stat-card--blue" style="opacity:0.1;">
          <div class="stat-card__label">Loading...</div>
          <div class="stat-card__value">—</div>
        </div>
      </div>

      <!-- ── SECTION 2: Milk Bank Workspace (Spreadsheet & Logs) ── -->
      <div class="milk-workspace">
        <div class="milk-workspace-header">
          <div class="milk-tabs" role="tablist">
            <button class="milk-tab milk-tab--active" data-tab="intake" role="tab" aria-selected="true">
              <span class="icon icon--sm" aria-hidden="true">receipt_long</span>
              Log of Milk Received (FM.002.00)
              <span class="milk-tab__count" id="count-donations">0</span>
            </button>
            <button class="milk-tab" data-tab="batches" role="tab" aria-selected="false">
              <span class="icon icon--sm" aria-hidden="true">science</span>
              Pasteurized Batches (BM-XXX)
              <span class="milk-tab__count" id="count-batches">0</span>
            </button>
            <button class="milk-tab" data-tab="dispense" role="tab" aria-selected="false">
              <span class="icon icon--sm" aria-hidden="true">volunteer_activism</span>
              Dispensing Ledger
              <span class="milk-tab__count" id="count-dispatches">0</span>
            </button>
          </div>
        </div>

        <div class="milk-workspace-body" id="milk-tab-content">
          <div style="padding: 40px; text-align: center; color: var(--color-text-muted);">
            <span class="icon spin" style="font-size: 28px; color: var(--color-milk-primary);">progress_activity</span>
            <p style="margin-top: 10px;">Loading Milk Bank records...</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render the 4 metric cards using standard stat-card component
 */
export function renderMetrics(metrics) {
  return `
    <div class="stat-card milk-stat-card--blue">
      <div class="stat-card__label">Available Pasteurized</div>
      <div class="stat-card__value stat-card__value--primary" style="color:#0284c7;">
        ${metrics.availableBags}
        <span style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);color:var(--color-text-muted);">Bags</span>
      </div>
      <div class="stat-card__footer">Ready for infant dispensing</div>
    </div>

    <div class="stat-card milk-stat-card--blue">
      <div class="stat-card__label">Raw / Unpasteurized</div>
      <div class="stat-card__value">
        ${metrics.rawBags}
        <span style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);color:var(--color-text-muted);">Intakes</span>
      </div>
      <div class="stat-card__footer">Awaiting pasteurization into BM-XXX</div>
    </div>

    <div class="stat-card milk-stat-card--blue">
      <div class="stat-card__label">Expiring ≤ 30 Days</div>
      <div class="stat-card__value ${metrics.expiringSoonBags > 0 ? 'stat-card__value--warning' : ''}">
        ${metrics.expiringSoonBags}
        <span style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);color:var(--color-text-muted);">Bags</span>
      </div>
      <div class="stat-card__footer">FEFO priority — dispatch these first</div>
    </div>

    <div class="stat-card milk-stat-card--blue">
      <div class="stat-card__label">Dispensed This Month</div>
      <div class="stat-card__value" style="color:#059669;">
        ${metrics.dispensedThisMonth}
        <span style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);color:var(--color-text-muted);">Bags</span>
      </div>
      <div class="stat-card__footer">Delivered to beneficiaries</div>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════════════════
// Upper Cell Content & Editor Bar (Excel-Style Row & Cell Viewer, No FX)
// ════════════════════════════════════════════════════════════════════════════
export function renderCellBar(placeholder = 'Click any table cell to inspect or edit full content...') {
  return `
    <div class="milk-cell-bar" id="milk-cell-bar">
      <div class="milk-cell-badge" id="milk-cell-badge" title="Active Cell / Row Position">
        <span class="icon icon--sm" style="font-size:15px;" aria-hidden="true">edit_note</span>
        <span id="milk-cell-badge-text">Select Cell</span>
      </div>
      <input type="text"
             class="milk-cell-input"
             id="milk-cell-input"
             placeholder="${placeholder}"
             aria-label="Cell content inspector and editor"
             autocomplete="off"
             spellcheck="false" />
      <div class="milk-cell-status" id="milk-cell-status" style="display:none;"></div>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════════════════
// SHEET 1: Log of Milk Received (Form MH.MNAO.FM.002.00) Spreadsheet
// Strictly matches the official paper form headers and columns
// ════════════════════════════════════════════════════════════════════════════
export function renderDonationsSheet(donations = [], draftRows = []) {
  const pendingCount = draftRows.length;
  const today = new Date().toISOString().split('T')[0];

  const draftHtml = draftRows.map((draft, idx) => `
    <tr class="grid-row--draft" data-draft-idx="${idx}">
      <td style="color:#0284c7;font-weight:700;text-align:center;">+ Draft</td>
      <td>
        <input type="text" class="grid-cell-input grid-cell-input--mono js-donor-code"
               value="${escapeHtml(draft.donor_code || '')}" placeholder="e.g. 24-672-760" aria-label="Donor Name / Code" autofocus>
      </td>
      <td>
        <input type="date" class="grid-cell-input js-donor-exp-date"
               value="${draft.expression_date_notes || today}" aria-label="Milk Expression Date">
      </td>
      <td>
        <input type="time" class="grid-cell-input js-donor-exp-time"
               value="${draft.expression_time || '08:00'}" aria-label="Milk Expression Time">
      </td>
      <td>
        <input type="date" class="grid-cell-input js-donor-trans-date"
               value="${draft.transport_date || today}" aria-label="Transport Date">
      </td>
      <td>
        <input type="time" class="grid-cell-input js-donor-trans-time"
               value="${draft.transport_time || '12:00'}" aria-label="Transport Time">
      </td>
      <td style="text-align:center;">
        <select class="grid-cell-select js-donor-cond-col" aria-label="Condition @ Collection">
          <option value="ok" ${draft.condition_at_collection === 'ok' ? 'selected' : ''}>ok</option>
          <option value="compromised" ${draft.condition_at_collection === 'compromised' ? 'selected' : ''}>compromised</option>
        </select>
      </td>
      <td>
        <input type="date" class="grid-cell-input js-donor-arrival-date"
               value="${draft.arrival_date || today}" aria-label="Arrival Date">
      </td>
      <td>
        <input type="time" class="grid-cell-input js-donor-arrival-time"
               value="${draft.arrival_time || '12:30'}" aria-label="Arrival Time">
      </td>
      <td style="text-align:center;">
        <select class="grid-cell-select js-donor-cond-arr" aria-label="Condition @ Arrival">
          <option value="ok" ${draft.condition_at_arrival === 'ok' ? 'selected' : ''}>ok</option>
          <option value="compromised" ${draft.condition_at_arrival === 'compromised' ? 'selected' : ''}>compromised</option>
        </select>
      </td>
      <td>
        <input type="text" class="grid-cell-input js-donor-trans-cond"
               value="${escapeHtml(draft.transport_condition || '')}" placeholder="e.g. cooler box (opt)" aria-label="Conditions of Transport">
      </td>
      <td>
        <span class="text-muted text-xs">Self (on save)</span>
      </td>
      <td class="grid-actions-cell" style="text-align:center;">
        <button class="btn-grid-save js-save-single-donation" data-draft-idx="${idx}" title="Save row">
          <span class="icon" style="font-size:16px;">check</span> Save
        </button>
        <button class="btn-grid-discard js-discard-single-donation" data-draft-idx="${idx}" title="Discard">
          <span class="icon" style="font-size:16px;">close</span>
        </button>
      </td>
    </tr>
  `).join('');

  const savedHtml = donations.map((d, index) => `
    <tr>
      <td class="text-muted text-xs" style="text-align:center;">${index + 1}</td>
      <td>
        <span class="milk-donor-code">${escapeHtml(d.donor_code)}</span>
      </td>
      <td class="text-sm">${formatDate(d.expression_date_notes)}</td>
      <td class="text-muted text-xs">${formatTime(d.expression_time)}</td>
      <td class="text-sm">${formatDate(d.transport_date)}</td>
      <td class="text-muted text-xs">${formatTime(d.transport_time)}</td>
      <td style="text-align:center;">
        <span class="badge badge--success text-uppercase">${escapeHtml(d.condition_at_collection || 'ok')}</span>
      </td>
      <td class="text-sm">${formatDate(d.arrival_date)}</td>
      <td class="text-muted text-xs">${formatTime(d.arrival_time)}</td>
      <td style="text-align:center;">
        <span class="badge badge--success text-uppercase">${escapeHtml(d.condition_at_arrival || 'ok')}</span>
      </td>
      <td class="text-muted text-xs">${escapeHtml(d.transport_condition || '—')}</td>
      <td class="text-sm font-weight-medium">${escapeHtml(d.received_by_name || 'Staff')}</td>
      <td style="text-align:center;">
        <span class="badge ${d.status === 'pasteurized' ? 'badge--info' : 'badge--secondary'}">
          ${d.status === 'pasteurized' ? 'Pasteurized' : 'Stored Raw'}
        </span>
      </td>
    </tr>
  `).join('');

  return `
    <div class="milk-sheet-toolbar">
      <div class="milk-sheet-title">
        <span class="icon icon--sm" aria-hidden="true" style="color:var(--color-milk-primary);">receipt_long</span>
        LOG OF MILK RECEIVED
        <span class="milk-sheet-subtitle">Form MH.MNAO.FM.002.00</span>
      </div>
      <div class="milk-sheet-actions">
        <button id="btn-export-intake-pdf" class="btn btn-secondary btn-sm" type="button">
          <span class="icon icon--sm" aria-hidden="true">picture_as_pdf</span>
          Export Form (PDF)
        </button>
        <button id="btn-add-donation-row" class="btn btn-secondary btn-sm" type="button">
          <span class="icon icon--sm" aria-hidden="true">add</span>
          Add Entry Row
        </button>
        <button id="btn-save-all-donations" class="btn btn-primary btn-sm btn--ice" type="button"
                ${pendingCount === 0 ? 'disabled style="opacity:0.5;pointer-events:none;"' : ''}>
          <span class="icon icon--sm" aria-hidden="true">save</span>
          Save All Pending (${pendingCount})
        </button>
      </div>
    </div>

    ${renderCellBar('Click any cell in Log of Milk Received to inspect or edit full content...')}

    <div class="table-responsive">
      <table class="milk-sheet-table">
        <thead>
          <tr>
            <th rowspan="2" style="width:45px;text-align:center;">#</th>
            <th rowspan="2" style="min-width:140px;">Donor Name / Code *</th>
            <th colspan="2" style="text-align:center;border-bottom:1px solid var(--color-border);">Milk Expression</th>
            <th colspan="2" style="text-align:center;border-bottom:1px solid var(--color-border);">Transport</th>
            <th rowspan="2" style="min-width:110px;text-align:center;">Condition @ Donor</th>
            <th colspan="2" style="text-align:center;border-bottom:1px solid var(--color-border);">Arrival at Milk Bank</th>
            <th rowspan="2" style="min-width:110px;text-align:center;">Condition @ Arrival</th>
            <th rowspan="2" style="min-width:130px;">Conditions of Transport</th>
            <th rowspan="2" style="min-width:130px;">Receiving Personnel</th>
            <th rowspan="2" style="min-width:90px;text-align:center;">Status / Actions</th>
          </tr>
          <tr>
            <th style="min-width:120px;">Date</th>
            <th style="min-width:85px;">Time</th>
            <th style="min-width:125px;">Date</th>
            <th style="min-width:85px;">Time</th>
            <th style="min-width:120px;">Date</th>
            <th style="min-width:85px;">Time</th>
          </tr>
        </thead>
        <tbody>
          ${draftHtml}
          ${savedHtml}
          ${donations.length === 0 && draftRows.length === 0 ? `
            <tr>
              <td colspan="13" style="text-align:center;padding:36px;color:var(--color-text-muted);">
                No intake records yet. Click <strong>Add Entry Row</strong> above to begin logging.
              </td>
            </tr>
          ` : ''}
        </tbody>
      </table>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════════════════
// SHEET 2: Pasteurized Batches (BM-XXX) & Option B Virtual Freezer
// ════════════════════════════════════════════════════════════════════════════
export function renderBatchesSheet(batches = [], draftBatches = [], subView = 'table', shelves = [], fefoBatch = null, freezerOptions = {}) {
  const pendingCount = draftBatches.length;

  return `
    <div class="milk-sheet-toolbar">
      <div class="milk-sheet-title">
        <span class="icon icon--sm" aria-hidden="true" style="color:var(--color-milk-primary);">science</span>
        Pasteurized Batches (BM-XXX)
        <span class="milk-sheet-subtitle">Freezer Inventory &amp; FEFO Dispatch</span>
      </div>
      <div class="milk-sheet-actions">
        <!-- Option B View Switcher -->
        <div class="milk-view-switcher">
          <button class="milk-view-btn ${subView === 'table' ? 'milk-view-btn--active' : ''}"
                  id="btn-subview-table" type="button">
            <span class="icon icon--sm">table_rows</span>
            Table View
          </button>
          <button class="milk-view-btn ${subView === 'freezer' ? 'milk-view-btn--active' : ''}"
                  id="btn-subview-freezer" type="button">
            <span class="icon icon--sm">kitchen</span>
            Virtual Freezer
          </button>
        </div>

        ${subView === 'table' ? `
          <button id="btn-add-batch-row" class="btn btn-secondary btn-sm" type="button">
            <span class="icon icon--sm" aria-hidden="true">add</span>
            Add Batch Row
          </button>
          <button id="btn-save-all-batches" class="btn btn-primary btn-sm btn--ice" type="button"
                  ${pendingCount === 0 ? 'disabled style="opacity:0.5;pointer-events:none;"' : ''}>
            <span class="icon icon--sm" aria-hidden="true">save</span>
            Save All Pending (${pendingCount})
          </button>
        ` : ''}
      </div>
    </div>

    ${subView === 'freezer'
      ? renderFreezerMapView({
          batches,
          freezers: freezerOptions.freezers || [],
          activeFreezerId: freezerOptions.activeFreezerId,
          fefoBatch,
          selectedBatch: freezerOptions.selectedBatch,
          selectedShelf: freezerOptions.selectedShelf
        })
      : renderBatchesTable(batches, draftBatches, shelves, fefoBatch)
    }
  `;
}

function renderBatchesTable(batches = [], draftBatches = [], shelves = [], fefoBatch = null) {
  const shelfOptionsHtml = (selected) => shelves.map(s => `
    <option value="${s}" ${selected === s ? 'selected' : ''}>${s}</option>
  `).join('');

  // Exactly 9 columns: #, Batch No., Date Past., Expiry, Shelf, Initial, Remaining, Status, Actions
  const draftHtml = draftBatches.map((draft, idx) => `
    <tr class="grid-row--draft" data-draft-idx="${idx}">
      <td style="color:#0284c7;font-weight:700;text-align:center;">+ New</td>
      <td>
        <input type="text" class="grid-cell-input grid-cell-input--mono js-batch-no"
               value="${escapeHtml(draft.batch_number || '')}" placeholder="e.g. BM-096" aria-label="Batch Number" autofocus>
      </td>
      <td>
        <input type="date" class="grid-cell-input js-batch-date-past"
               value="${draft.date_pasteurized || new Date().toISOString().split('T')[0]}" aria-label="Date Pasteurized">
      </td>
      <td>
        <input type="date" class="grid-cell-input js-batch-expiry"
               value="${draft.expiry_date || ''}" aria-label="Expiry Date">
      </td>
      <td>
        <select class="grid-cell-select js-batch-shelf" aria-label="Freezer Shelf">
          ${shelfOptionsHtml(draft.freezer_shelf || shelves[0])}
        </select>
      </td>
      <td style="max-width:90px;text-align:center;">
        <input type="number" class="grid-cell-input js-batch-bags" min="1"
               value="${draft.total_bags || ''}" placeholder="Bags" aria-label="Initial Bags">
      </td>
      <td style="text-align:center;color:var(--color-text-muted);">—</td>
      <td style="text-align:center;">
        <span class="badge badge--info">Draft</span>
      </td>
      <td class="grid-actions-cell" style="text-align:center;">
        <button class="btn-grid-save js-save-single-batch" data-draft-idx="${idx}" title="Save batch">
          <span class="icon" style="font-size:16px;">check</span> Save
        </button>
        <button class="btn-grid-discard js-discard-single-batch" data-draft-idx="${idx}" title="Discard">
          <span class="icon" style="font-size:16px;">close</span>
        </button>
      </td>
    </tr>
  `).join('');

  const savedHtml = batches.map((b, index) => {
    const isFefo = fefoBatch && fefoBatch.id === b.id;
    const statusBadge = getBatchStatusBadge(b);
    const daysLeft = calculateDaysRemaining(b.expiry_date);
    const expiryClass = daysLeft <= 0 ? 'text-danger fw-bold' : (daysLeft <= 30 ? 'text-warning fw-bold' : '');

    return `
      <tr data-batch-id="${b.id}">
        <td class="text-muted text-xs" style="text-align:center;">${index + 1}</td>
        <td>
          <span class="milk-batch-code">${escapeHtml(b.batch_number)}</span>
          ${isFefo ? '<span class="fefo-priority-badge" style="margin-left:4px;"><span class="icon" style="font-size:13px;">timer</span> Dispatch First</span>' : ''}
        </td>
        <td>${formatDate(b.date_pasteurized)}</td>
        <td>
          <span class="badge ${expiryClass ? 'badge--warning' : 'badge--secondary'}">
            ${formatDate(b.expiry_date)}
            ${daysLeft !== null ? `(${daysLeft > 0 ? daysLeft + 'd left' : 'Expired'})` : ''}
          </span>
        </td>
        <td>
          <select class="milk-shelf-select js-update-shelf" data-batch-id="${b.id}" aria-label="Freezer Shelf">
            ${shelfOptionsHtml(b.freezer_shelf)}
          </select>
        </td>
        <td class="text-center">${b.total_bags}</td>
        <td class="text-center">
          <strong style="color:${b.remaining_bags > 0 ? '#0284c7' : 'var(--color-text-muted)'};font-size:14px;">
            ${b.remaining_bags}
          </strong>
        </td>
        <td class="text-center">${statusBadge}</td>
        <td class="grid-actions-cell" style="text-align:center;">
          ${b.remaining_bags > 0 ? `
            <button class="btn btn-secondary btn-sm js-quick-dispense-btn"
                    data-batch-id="${b.id}" data-batch-no="${b.batch_number}"
                    style="padding:4px 8px;font-size:12px;">
              <span class="icon icon--sm" style="font-size:15px;">volunteer_activism</span>
              Dispense
            </button>
          ` : '<span class="text-muted text-xs">Depleted</span>'}
        </td>
      </tr>
    `;
  }).join('');

  return `
    ${renderCellBar('Click any cell in Pasteurized Batches to inspect or edit full content...')}
    <div class="table-responsive">
      <table class="milk-sheet-table">
        <thead>
          <tr>
            <th style="width:45px;text-align:center;">#</th>
            <th style="min-width:140px;">Batch No.</th>
            <th style="min-width:125px;">Date Pasteurized</th>
            <th style="min-width:140px;">Expiration Date</th>
            <th style="min-width:130px;">Freezer Shelf</th>
            <th style="min-width:85px;text-align:center;">Initial</th>
            <th style="min-width:90px;text-align:center;">Remaining</th>
            <th style="min-width:110px;text-align:center;">Status</th>
            <th style="min-width:110px;text-align:center;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${draftHtml}
          ${savedHtml}
          ${batches.length === 0 && draftBatches.length === 0 ? `
            <tr>
              <td colspan="9" style="text-align:center;padding:36px;color:var(--color-text-muted);">
                No pasteurized batches recorded yet. Click <strong>Add Batch Row</strong> to log a BM batch.
              </td>
            </tr>
          ` : ''}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Digital Twin Freezer Map Visualization (Side-by-Side + Vertical Shelf Scroll)
 */
export function renderFreezerMapView(optionsOrBatches = {}, legacyShelves = [], legacyFefo = null) {
  let batches = [];
  let freezers = [];
  let activeFreezerId = null;
  let fefoBatch = null;
  let selectedBatch = null;
  let selectedShelf = null;

  if (Array.isArray(optionsOrBatches)) {
    batches = optionsOrBatches;
    fefoBatch = legacyFefo;
    freezers = [{ id: 'freezer-1', name: 'Upright Freezer A', shelves: legacyShelves.length > 0 ? legacyShelves : ['Shelf 1', 'Shelf 2', 'Shelf 3', 'Shelf 4'] }];
    activeFreezerId = 'freezer-1';
  } else if (optionsOrBatches && typeof optionsOrBatches === 'object') {
    batches = optionsOrBatches.batches || [];
    freezers = optionsOrBatches.freezers || [];
    activeFreezerId = optionsOrBatches.activeFreezerId || (freezers[0]?.id || 'freezer-1');
    fefoBatch = optionsOrBatches.fefoBatch || null;
    selectedBatch = optionsOrBatches.selectedBatch || null;
    selectedShelf = optionsOrBatches.selectedShelf || null;
  }

  if (freezers.length === 0) {
    freezers = [{ id: 'freezer-1', name: 'Upright Freezer A', shelves: ['Shelf 1', 'Shelf 2', 'Shelf 3', 'Shelf 4', 'Shelf 5', 'Shelf 6', 'Shelf 7'] }];
  }

  const activeFreezer = freezers.find(f => f.id === activeFreezerId) || freezers[0];
  const shelves = activeFreezer.shelves && activeFreezer.shelves.length > 0
    ? activeFreezer.shelves
    : ['Shelf 1', 'Shelf 2', 'Shelf 3', 'Shelf 4'];

  // Map batches to shelves
  const shelfMap = {};
  shelves.forEach(s => { shelfMap[s] = []; });

  (batches || []).forEach(b => {
    if ((b.remaining_bags || 0) > 0) {
      let bShelf = b.freezer_shelf || shelves[0] || 'Shelf 1';
      // If batch shelf has freezer prefix, e.g. "Upright Freezer A / Shelf 1"
      if (bShelf.includes(' / ')) {
        const [fName, sName] = bShelf.split(' / ');
        if (fName.trim().toLowerCase() === activeFreezer.name.trim().toLowerCase()) {
          bShelf = sName.trim();
        } else {
          return; // Belongs to different freezer
        }
      }
      if (!shelfMap[bShelf]) shelfMap[bShelf] = [];
      shelfMap[bShelf].push(b);
    }
  });

  const fefoShelfName = fefoBatch?.freezer_shelf || null;

  // Selected shelf bags count if a shelf is selected
  const selectedShelfBatches = selectedShelf ? (shelfMap[selectedShelf] || []) : [];
  const selectedShelfBags = selectedShelfBatches.reduce((sum, b) => sum + (b.remaining_bags || 0), 0);

  // Status text determination
  let statusText = 'Select a shelf or batch';
  let statusSub = 'SYSTEM STATUS';
  if (selectedBatch) {
    statusSub = 'BATCH SELECTED';
    statusText = `${escapeHtml(selectedBatch.batch_number)} - ${selectedBatch.remaining_bags} Bags Available`;
  } else if (selectedShelf) {
    statusSub = 'SHELF SELECTED';
    statusText = `${escapeHtml(selectedShelf)} - ${selectedShelfBags} Bags Total`;
  }

  // Freezer Tabs Bar
  const freezerTabsHtml = `
    <div class="digital-twin-tabs-bar">
      ${freezers.map(f => `
        <button class="digital-twin-tab ${f.id === activeFreezer.id ? 'digital-twin-tab--active' : ''} js-switch-freezer"
                data-freezer-id="${f.id}" type="button">
          <span class="icon" style="font-size:16px;">kitchen</span>
          <span>${escapeHtml(f.name)}</span>
          <span class="digital-twin-tab-rename-btn js-rename-freezer" data-freezer-id="${f.id}" title="Rename ${escapeHtml(f.name)}">
            <span class="icon" style="font-size:14px;">edit</span>
          </span>
        </button>
      `).join('')}
      <button class="digital-twin-add-freezer-btn" id="btn-add-freezer" type="button">
        <span class="icon">add</span> Add Freezer
      </button>
    </div>
  `;

  // Shelves HTML (Vertical Scroll Pane)
  const shelvesListHtml = shelves.map((shelfName, shelfIdx) => {
    const shelfBatches = shelfMap[shelfName] || [];
    const totalBags = shelfBatches.reduce((sum, b) => sum + (b.remaining_bags || 0), 0);
    const isFefoShelf = fefoShelfName === shelfName && totalBags > 0;
    const isNewestShelf = shelfIdx === shelves.length - 1;
    const isShelfSelected = selectedShelf === shelfName;

    // Render batch boxes (4 slots per row minimum)
    const filledBoxes = shelfBatches.map((b, bIdx) => {
      const isPriority = fefoBatch && fefoBatch.id === b.id;
      const isSelected = selectedBatch && selectedBatch.id === b.id;
      const isLow = (b.remaining_bags || 0) <= 3;

      let variantClass = 'batch-box--normal';
      if (isPriority) variantClass = 'batch-box--priority';
      else if (isLow) variantClass = 'batch-box--low';

      if (isSelected) variantClass += ' batch-box--selected';

      return `
        <div class="batch-box ${variantClass} js-freezer-batch-box"
             data-batch-id="${b.id}"
             data-shelf-name="${escapeHtml(shelfName)}"
             data-pos="${bIdx + 1}"
             title="${escapeHtml(b.batch_number)}: ${b.remaining_bags} bags (Click to inspect)">
          <span class="batch-box__no">${escapeHtml(b.batch_number)}</span>
          <span class="batch-box__bags">${b.remaining_bags} ${b.remaining_bags === 1 ? 'bag' : 'bags'}</span>
        </div>
      `;
    });

    // Render empty dashed slots to maintain at least 4 slots across
    const emptyCount = Math.max(0, 4 - filledBoxes.length);
    const emptyBoxes = [];
    for (let k = 0; k < emptyCount; k++) {
      emptyBoxes.push(`<div class="batch-box batch-box--empty" title="Empty Slot"></div>`);
    }

    let pillLabel = shelfName.toUpperCase();
    let pillClass = 'digital-twin-shelf-pill';
    if (isFefoShelf) {
      pillLabel = `${shelfName.toUpperCase()} (PRIORITY DISPATCH)`;
      pillClass += ' digital-twin-shelf-pill--priority';
    } else if (isNewestShelf) {
      pillLabel = `${shelfName.toUpperCase()} (NEWEST)`;
      pillClass += ' digital-twin-shelf-pill--newest';
    }

    return `
      <div class="digital-twin-shelf ${isShelfSelected ? 'digital-twin-shelf--selected' : ''} ${isFefoShelf ? 'digital-twin-shelf--fefo' : ''} js-freezer-shelf"
           data-shelf-name="${escapeHtml(shelfName)}">
        <div class="digital-twin-shelf-header">
          <span class="${pillClass}">
            ${isFefoShelf ? '<span class="icon" style="font-size:12px;">timer</span>' : ''}
            ${escapeHtml(pillLabel)}
          </span>
          <span class="digital-twin-shelf-bags-count">
            ${totalBags} / 20 bags
          </span>
        </div>

        <div class="batch-boxes-grid">
          ${filledBoxes.join('')}
          ${emptyBoxes.join('')}
        </div>
      </div>
    `;
  }).join('');

  // Right Panel: Details Card
  let detailsCardContent = '';
  if (selectedBatch) {
    const isPriorityBatch = fefoBatch && fefoBatch.id === selectedBatch.id;
    const batchShelf = selectedBatch.freezer_shelf || shelves[0] || 'Shelf 1';

    detailsCardContent = `
      <div class="details-card-header">
        <div>
          <h2 class="details-card-title">Batch Details</h2>
          <p class="details-card-subtitle">Targeted retrieval to minimize freezer door time.</p>
        </div>
        ${isPriorityBatch ? `
          <span class="priority-pick-badge">
            <span class="icon" style="font-size:14px;">bolt</span> Priority Pick
          </span>
        ` : ''}
      </div>

      <div class="details-inner-card">
        <div class="details-field-group">
          <span class="details-field-label">Target Batch</span>
          <span class="details-field-val details-field-val--batch">${escapeHtml(selectedBatch.batch_number)}</span>
        </div>
        <div class="details-field-group">
          <span class="details-field-label">Exact Location</span>
          <span class="details-field-val">${escapeHtml(batchShelf)}</span>
        </div>
        <div class="details-field-group">
          <span class="details-field-label">Quantity Available</span>
          <span class="details-field-val details-field-val--qty">${selectedBatch.remaining_bags} Bags <span style="font-size:12px;font-weight:400;color:var(--color-text-muted);">(of ${selectedBatch.total_bags})</span></span>
        </div>
        <div class="details-field-group">
          <span class="details-field-label">Date Pasteurized</span>
          <span class="details-field-val">${formatDate(selectedBatch.date_pasteurized)}</span>
        </div>
        <div class="details-field-group">
          <span class="details-field-label">Expiration Date</span>
          <span class="details-field-val details-field-val--expiry">${formatDate(selectedBatch.expiry_date)}</span>
        </div>
        <div class="details-field-group">
          <span class="details-field-label">Donor / Remarks</span>
          <span class="details-field-val" style="font-size:13px;">${escapeHtml(selectedBatch.remarks || 'None recorded')}</span>
        </div>
      </div>

      <div class="details-actions-row">
        <button class="btn btn-secondary js-freezer-edit-batch" data-batch-id="${selectedBatch.id}" type="button">
          <span class="icon icon--sm">edit</span> Edit
        </button>
        <button class="btn btn-outline-danger js-freezer-delete-batch" data-batch-id="${selectedBatch.id}" type="button">
          <span class="icon icon--sm">delete</span> Delete
        </button>
        <button class="btn btn-primary js-freezer-dispense-batch" data-batch-id="${selectedBatch.id}" type="button"
                style="background:#0284c7;border-color:#0284c7;margin-left:auto;gap:6px;">
          <span class="icon icon--sm">volunteer_activism</span> Dispense Bags
        </button>
      </div>
    `;
  } else if (selectedShelf) {
    detailsCardContent = `
      <div class="details-card-header">
        <div>
          <h2 class="details-card-title">Shelf Details</h2>
          <p class="details-card-subtitle">Storage occupancy and batches for ${escapeHtml(selectedShelf)}.</p>
        </div>
      </div>

      <div class="details-inner-card">
        <div class="details-field-group">
          <span class="details-field-label">Selected Shelf</span>
          <span class="details-field-val details-field-val--batch">${escapeHtml(selectedShelf)}</span>
        </div>
        <div class="details-field-group">
          <span class="details-field-label">Freezer Cabinet</span>
          <span class="details-field-val">${escapeHtml(activeFreezer.name)}</span>
        </div>
        <div class="details-field-group">
          <span class="details-field-label">Total Bags Stored</span>
          <span class="details-field-val details-field-val--qty">${selectedShelfBags} Bags</span>
        </div>
        <div class="details-field-group">
          <span class="details-field-label">Batches Count</span>
          <span class="details-field-val">${selectedShelfBatches.length} active batches</span>
        </div>
        <div class="details-field-group" style="grid-column: span 2;">
          <span class="details-field-label">Capacity Utilization (Max 20 Bags)</span>
          <div style="background:#e2e8f0;border-radius:6px;height:10px;overflow:hidden;margin-top:6px;">
            <div style="background:${selectedShelfBags > 18 ? '#dc2626' : (selectedShelfBags > 14 ? '#f59e0b' : '#0284c7')};width:${Math.min(100, Math.round(selectedShelfBags / 20 * 100))}%;height:100%;"></div>
          </div>
          <span style="font-size:11px;color:var(--color-text-muted);margin-top:4px;">${selectedShelfBags} of 20 bags used (${Math.min(100, Math.round(selectedShelfBags / 20 * 100))}%)</span>
        </div>
      </div>

      ${selectedShelfBatches.length > 0 ? `
        <div style="margin-top:8px;">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:8px;">
            Batches on this shelf:
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            ${selectedShelfBatches.map(b => `
              <button class="freezer-batch-pill js-freezer-batch-box" data-batch-id="${b.id}" style="cursor:pointer;border:1px solid #bae6fd;">
                <strong style="color:#0369a1;font-family:monospace;">${escapeHtml(b.batch_number)}</strong>
                <span>·</span>
                <span>${b.remaining_bags} bags</span>
              </button>
            `).join('')}
          </div>
        </div>
      ` : `
        <div style="color:var(--color-text-muted);font-size:13px;padding:12px 0;">
          No pasteurized batches currently assigned to this shelf.
        </div>
      `}

      <div class="details-actions-row">
        ${selectedShelfBatches.length > 0 ? `
          <button class="btn btn-primary js-freezer-dispense-batch" data-batch-id="${selectedShelfBatches[0].id}" type="button"
                  style="background:#0284c7;border-color:#0284c7;margin-left:auto;gap:6px;">
            <span class="icon icon--sm">volunteer_activism</span> Dispense From Shelf
          </button>
        ` : ''}
      </div>
    `;
  } else {
    // Default state: Prompt user to click shelf or batch
    detailsCardContent = `
      <div class="details-card-header">
        <div>
          <h2 class="details-card-title">Batch Details</h2>
          <p class="details-card-subtitle">Targeted retrieval to minimize freezer door time.</p>
        </div>
      </div>

      <div class="details-inner-card" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:220px;text-align:center;gap:12px;">
        <div style="width:52px;height:52px;border-radius:50%;background:#e0f2fe;display:flex;align-items:center;justify-content:center;">
          <span class="icon" style="color:#0284c7;font-size:28px;">touch_app</span>
        </div>
        <div style="font-size:15px;font-weight:700;color:var(--color-text);">Select a shelf or batch box</div>
        <p style="font-size:13px;color:var(--color-text-muted);max-width:320px;margin:0;">
          Click on any shelf to inspect total bag occupancy, or click a batch box to view expiration, edit details, or dispense pouches.
        </p>
      </div>
    `;
  }

  return `
    <div class="digital-twin-workspace">
      <!-- Top Bar with Add New Batch -->
      <div class="digital-twin-topbar">
        <div class="digital-twin-title-group">
          <h1 class="digital-twin-title">
            <span class="icon" style="color:#0284c7;">kitchen</span>
            Digital Twin Freezer
          </h1>
          <span class="digital-twin-subtitle">Visual cold-chain mapping, shelf capacity management & fast retrieval</span>
        </div>
        <button class="btn btn-primary" id="btn-freezer-add-batch" type="button"
                style="background:#0284c7;border-color:#0284c7;display:inline-flex;align-items:center;gap:6px;">
          <span class="icon icon--sm">add</span> Add New Batch
        </button>
      </div>

      <!-- Freezer tabs selector -->
      ${freezerTabsHtml}

      <!-- 2-Column Split: Visual Cabinet on Left, Details on Right -->
      <div class="digital-twin-grid">
        <!-- Left: Visual Cabinet -->
        <div class="digital-twin-cabinet">
          <!-- Dark Slate Header -->
          <div class="digital-twin-cabinet-header">
            <div class="digital-twin-cabinet-name-row">
              <div class="digital-twin-cabinet-name">
                <span class="icon" style="font-size:22px;">kitchen</span>
                <span>${escapeHtml(activeFreezer.name)}</span>
              </div>
              <button class="digital-twin-rename-inline-btn js-rename-freezer" data-freezer-id="${activeFreezer.id}" type="button">
                <span class="icon">edit</span> Rename
              </button>
            </div>

            <!-- System Status Box -->
            <div class="digital-twin-status-box">
              <span class="digital-twin-status-label">${escapeHtml(statusSub)}</span>
              <span class="digital-twin-status-val">${escapeHtml(statusText)}</span>
            </div>
          </div>

          <!-- Vertical Scroll Pane for Shelves -->
          <div class="digital-twin-shelves-pane" id="digital-twin-shelves-pane">
            ${shelvesListHtml}
          </div>

          <!-- Shelf Management Bottom Bar -->
          <div class="digital-twin-mgmt-bar">
            <span>Configure shelves to match physical unit.</span>
            <div style="display:flex;gap:6px;">
              <button id="btn-freezer-add-shelf" class="btn btn-secondary btn-sm" type="button">
                <span class="icon icon--sm">add</span> Add Shelf
              </button>
              <button id="btn-freezer-remove-shelf" class="btn btn-secondary btn-sm" type="button"
                      ${shelves.length <= 2 ? 'disabled' : ''}>
                <span class="icon icon--sm">remove</span> Remove Last
              </button>
            </div>
          </div>
        </div>

        <!-- Right: Detail Card -->
        <div class="digital-twin-details-card" id="digital-twin-details-card">
          ${detailsCardContent}
        </div>
      </div>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════════════════
// SHEET 3: Dispensing Ledger Spreadsheet
// Exactly 9 columns matching the 9 <th> elements
// ════════════════════════════════════════════════════════════════════════════
export function renderDispatchesSheet(dispatches = [], draftRows = [], availableBatches = [], fefoBatch = null) {
  const pendingCount = draftRows.length;

  const brgyOptionsHtml = (selected) => (BARANGAYS || []).map(b => `
    <option value="${b}" ${selected === b ? 'selected' : ''}>${b}</option>
  `).join('');

  const indicationOptionsHtml = (selected) => DISPENSE_INDICATIONS.map(i => `
    <option value="${i}" ${selected === i ? 'selected' : ''}>${i}</option>
  `).join('');

  const batchOptionsHtml = (selectedId) => {
    return availableBatches.map(b => {
      const isFefo = fefoBatch && fefoBatch.id === b.id;
      const isSel = (selectedId ? selectedId === b.id : isFefo);
      return `
        <option value="${b.id}" ${isSel ? 'selected' : ''}>
          ${isFefo ? '[DISPATCH FIRST] ' : ''}${b.batch_number} (${b.remaining_bags} bags avail · ${b.freezer_shelf})
        </option>
      `;
    }).join('');
  };

  const draftHtml = draftRows.map((draft, idx) => `
    <tr class="grid-row--draft" data-draft-idx="${idx}">
      <td style="color:#0284c7;font-weight:700;text-align:center;">+ Issue</td>
      <td>
        <input type="date" class="grid-cell-input js-dispense-date"
               value="${draft.dispensed_date || new Date().toISOString().split('T')[0]}" aria-label="Date Dispensed">
      </td>
      <td>
        <input type="text" class="grid-cell-input js-dispense-recipient"
               value="${escapeHtml(draft.recipient_name || '')}" placeholder="e.g. Baby Cruz / Maria Cruz" aria-label="Recipient Infant / Mother" autofocus>
      </td>
      <td>
        <select class="grid-cell-select js-dispense-brgy" aria-label="Barangay">
          ${brgyOptionsHtml(draft.barangay || BARANGAYS[0])}
        </select>
      </td>
      <td>
        <select class="grid-cell-select js-dispense-batch" aria-label="Batch Issued (FEFO)">
          ${batchOptionsHtml(draft.batch_id)}
        </select>
      </td>
      <td style="max-width:90px;text-align:center;">
        <input type="number" class="grid-cell-input js-dispense-bags" min="1"
               value="${draft.bags_dispensed || 1}" aria-label="Bags Dispensed">
      </td>
      <td>
        <select class="grid-cell-select js-dispense-indication" aria-label="Clinical Indication">
          ${indicationOptionsHtml(draft.indication || DISPENSE_INDICATIONS[0])}
        </select>
      </td>
      <td>
        <span class="text-muted text-xs">Self</span>
      </td>
      <td class="grid-actions-cell" style="text-align:center;">
        <button class="btn-grid-save js-save-single-dispatch" data-draft-idx="${idx}" title="Issue milk">
          <span class="icon" style="font-size:16px;">check</span> Issue
        </button>
        <button class="btn-grid-discard js-discard-single-dispatch" data-draft-idx="${idx}" title="Discard">
          <span class="icon" style="font-size:16px;">close</span>
        </button>
      </td>
    </tr>
  `).join('');

  const savedHtml = dispatches.map((item, index) => {
    const batchNo = item.milk_batches?.batch_number || 'Unknown Batch';
    const shelf = item.milk_batches?.freezer_shelf || 'Freezer';

    return `
      <tr>
        <td class="text-muted text-xs" style="text-align:center;">${index + 1}</td>
        <td class="text-sm font-weight-medium">${formatDate(item.dispensed_date)}</td>
        <td>
          <strong>${escapeHtml(item.recipient_name)}</strong>
        </td>
        <td>${escapeHtml(item.barangay)}</td>
        <td>
          <span class="milk-batch-code">${escapeHtml(batchNo)}</span>
          <span class="text-muted text-xs">(${shelf})</span>
        </td>
        <td class="text-center">
          <span class="badge badge--info">${item.bags_dispensed} bags</span>
        </td>
        <td>
          <span class="badge badge--secondary">${escapeHtml(item.indication)}</span>
        </td>
        <td class="text-sm text-muted">${escapeHtml(item.released_by_name || 'Staff')}</td>
        <td class="text-muted text-xs" style="text-align:center;">Issued</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="milk-sheet-toolbar">
      <div class="milk-sheet-title">
        <span class="icon icon--sm" aria-hidden="true" style="color:var(--color-milk-primary);">volunteer_activism</span>
        Beneficiary Dispensing Ledger
        <span class="milk-sheet-subtitle">Release of Pasteurized Milk to Infants</span>
      </div>
      <div class="milk-sheet-actions">
        <button id="btn-add-dispatch-row" class="btn btn-secondary btn-sm" type="button"
                ${availableBatches.length === 0 ? 'disabled title="No stock available"' : ''}>
          <span class="icon icon--sm" aria-hidden="true">add</span>
          Record Dispense Row
        </button>
        <button id="btn-save-all-dispatches" class="btn btn-primary btn-sm btn--ice" type="button"
                ${pendingCount === 0 ? 'disabled style="opacity:0.5;pointer-events:none;"' : ''}>
          <span class="icon icon--sm" aria-hidden="true">save</span>
          Save All Pending (${pendingCount})
        </button>
      </div>
    </div>

    ${renderCellBar('Click any cell in Dispensing Ledger to inspect or edit full content...')}

    <div class="table-responsive">
      <table class="milk-sheet-table">
        <thead>
          <tr>
            <th style="width:45px;text-align:center;">#</th>
            <th style="min-width:125px;">Date Dispensed</th>
            <th style="min-width:160px;">Recipient Infant / Mother *</th>
            <th style="min-width:140px;">Barangay *</th>
            <th style="min-width:170px;">Batch Issued (FEFO) *</th>
            <th style="min-width:85px;text-align:center;">Bags *</th>
            <th style="min-width:150px;">Indication *</th>
            <th style="min-width:120px;">Released By</th>
            <th style="min-width:90px;text-align:center;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${draftHtml}
          ${savedHtml}
          ${dispatches.length === 0 && draftRows.length === 0 ? `
            <tr>
              <td colspan="9" style="text-align:center;padding:36px;color:var(--color-text-muted);">
                No milk dispatches logged yet. Click <strong>Record Dispense Row</strong> to issue milk.
              </td>
            </tr>
          ` : ''}
        </tbody>
      </table>
    </div>
  `;
}

// ── Helpers ─────────────────────────────────────────────────────────

function getBatchStatusBadge(batch) {
  if (batch.remaining_bags <= 0) {
    return `<span class="badge badge--dark">Depleted</span>`;
  }
  const days = calculateDaysRemaining(batch.expiry_date);
  if (days !== null && days <= 0) {
    return `<span class="badge badge--danger">Expired</span>`;
  }
  if (batch.remaining_bags <= 3) {
    return `<span class="badge badge--warning">Low Stock (${batch.remaining_bags})</span>`;
  }
  return `<span class="badge badge--success">Available (${batch.remaining_bags})</span>`;
}

function calculateDaysRemaining(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = target - today;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return dateStr;
  }
}

export function formatTime(timeStr) {
  if (!timeStr) return '—';
  const match = String(timeStr).match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2];
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }
  return timeStr;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
