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
          + Add Entry Row
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
                No intake records yet. Click <strong>+ Add Entry Row</strong> above to begin logging.
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
export function renderBatchesSheet(batches = [], draftBatches = [], subView = 'table', shelves = [], fefoBatch = null) {
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
            + Add Batch Row
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
      ? renderFreezerMapView(batches, shelves, fefoBatch)
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
          ${isFefo ? '<span class="fefo-star-badge" style="margin-left:4px;">⭐ FEFO Next</span>' : ''}
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
                No pasteurized batches recorded yet. Click <strong>+ Add Batch Row</strong> to log a BM batch.
              </td>
            </tr>
          ` : ''}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Option B: Virtual Freezer Map Visualization
 */
export function renderFreezerMapView(batches = [], shelves = [], fefoBatch = null) {
  const shelfMap = {};
  shelves.forEach(s => { shelfMap[s] = []; });

  (batches || []).forEach(b => {
    if ((b.remaining_bags || 0) > 0) {
      const shelfName = b.freezer_shelf || shelves[0] || 'Shelf 1';
      if (!shelfMap[shelfName]) shelfMap[shelfName] = [];
      shelfMap[shelfName].push(b);
    }
  });

  const fefoShelfName = fefoBatch?.freezer_shelf || null;

  const shelvesHtml = shelves.map(shelfName => {
    const shelfBatches = shelfMap[shelfName] || [];
    const totalShelfBags = shelfBatches.reduce((sum, b) => sum + (b.remaining_bags || 0), 0);
    const isFefoShelf = fefoShelfName === shelfName && totalShelfBags > 0;
    const isBottomBin = shelfName.toLowerCase().includes('bottom') || shelfName.toLowerCase().includes('bin');

    const batchPills = shelfBatches.map(b => `
      <div class="freezer-batch-pill">
        <strong style="color:#0369a1;font-family:monospace;">${escapeHtml(b.batch_number)}</strong>
        <span>·</span>
        <span>${b.remaining_bags} bags</span>
        <span style="color:var(--color-text-muted);font-size:11px;">(Exp: ${formatDate(b.expiry_date)})</span>
        ${fefoBatch && fefoBatch.id === b.id ? '<span class="fefo-star-badge">⭐ Next</span>' : ''}
      </div>
    `).join('');

    return `
      <div class="freezer-shelf-row ${isFefoShelf ? 'freezer-shelf-row--fefo' : ''}">
        <div class="freezer-shelf-info">
          <div class="freezer-shelf-icon">
            <span class="icon">${isBottomBin ? 'inbox' : 'grid_view'}</span>
          </div>
          <div>
            <div class="freezer-shelf-name">${escapeHtml(shelfName)}</div>
            <div class="freezer-shelf-count">${totalShelfBags} ${totalShelfBags === 1 ? 'bag' : 'bags'} stored</div>
          </div>
        </div>

        <div class="freezer-shelf-batches">
          ${batchPills || '<span style="color:var(--color-text-muted);font-size:12px;font-style:italic;">Empty shelf</span>'}
        </div>

        <div class="freezer-shelf-controls">
          ${isFefoShelf ? `
            <span class="fefo-star-badge" style="margin-right:6px;">
              ⭐ FIRST TO DISPENSE (FEFO)
            </span>
          ` : ''}
          ${totalShelfBags > 0 ? `
            <button class="btn btn-secondary btn-sm js-freezer-dispense"
                    data-shelf="${escapeHtml(shelfName)}"
                    data-batch-id="${shelfBatches[0]?.id || ''}"
                    style="padding:5px 10px;font-size:12px;">
              <span class="icon icon--sm">outbox</span> Dispense
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="freezer-workspace">
      <div class="freezer-cabinet-card">
        <div class="freezer-cabinet-topbar">
          <div class="freezer-cabinet-title">
            <span class="icon">kitchen</span>
            Upright Cold-Chain Freezer (Manolo Fortich MNAO)
          </div>
          <div style="font-size:12px;opacity:0.9;">
            Active Storage Rack
          </div>
        </div>

        <div class="freezer-shelves-list">
          ${shelvesHtml}
        </div>

        <div class="freezer-mgmt-bar">
          <div>
            <span>Shelves count: <strong>${shelves.length}</strong></span>
            <span style="margin-left:12px;color:var(--color-text-subtle);">Configure racks to match physical freezer unit</span>
          </div>
          <div style="display:flex;gap:8px;">
            <button id="btn-add-shelf" class="btn btn-secondary btn-sm" type="button">
              <span class="icon icon--sm">add</span> Add Shelf
            </button>
            <button id="btn-remove-shelf" class="btn btn-secondary btn-sm" type="button"
                    ${shelves.length <= 2 ? 'disabled' : ''}>
              <span class="icon icon--sm">remove</span> Remove Last Shelf
            </button>
          </div>
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
          ${isFefo ? '⭐ [FEFO] ' : ''}${b.batch_number} (${b.remaining_bags} bags avail · ${b.freezer_shelf})
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
          + Record Dispense Row
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
                No milk dispatches logged yet. Click <strong>+ Record Dispense Row</strong> to issue milk.
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
