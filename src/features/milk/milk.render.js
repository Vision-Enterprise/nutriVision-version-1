/**
 * Milk Bank UI Renderer
 * Generates the 2-section layout, spreadsheet-like data entry grids,
 * strictly matching Form MH.MNAO.FM.002.00 (Log of Milk Received),
 * Pasteurized Batches (BM-XXX), and the Option B Virtual Freezer Map.
 */

import { BARANGAYS, AUDIT_ACTIONS } from '../../shared/constants/app.constants.js';
import { getBatchFreezerAndShelf, getFreezerShelfAllocations, getBatchActualShelfInfo } from './milk.service.js';

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
            <button class="milk-tab" data-tab="audit" role="tab" aria-selected="false">
              <span class="icon icon--sm" aria-hidden="true">history</span>
              Audit Trail
              <span class="milk-tab__count" id="count-milk-audit">0</span>
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
      : renderBatchesTable(batches, draftBatches, shelves, fefoBatch, freezerOptions.freezers || [])
    }
  `;
}

function renderBatchesTable(batches = [], draftBatches = [], shelves = [], fefoBatch = null, freezers = []) {
  const activeFreezers = freezers.length > 0 ? freezers : [{ id: 'freezer-1', name: 'Upright Freezer A', shelves: ['Shelf 1', 'Shelf 2', 'Shelf 3', 'Shelf 4'] }];

  const freezerOptionsHtml = (selectedName) => activeFreezers.map(f => `
    <option value="${escapeHtml(f.name)}" ${f.name.toLowerCase() === (selectedName || '').toLowerCase() ? 'selected' : ''}>
      ${escapeHtml(f.name)}
    </option>
  `).join('');

  // Exactly 10 columns: #, Batch No., Date Past., Expiry, Freezer, Shelf, Initial, Remaining, Status, Actions
  const draftHtml = draftBatches.map((draft, idx) => {
    const draftLoc = getBatchFreezerAndShelf(draft, activeFreezers);

    return `
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
          <select class="grid-cell-select js-draft-freezer" data-draft-idx="${idx}" aria-label="Freezer">
            ${freezerOptionsHtml(draftLoc.freezerName)}
          </select>
        </td>
        <td>
          <span class="badge badge--neutral text-xs" style="color:var(--color-text-muted);font-weight:500;padding:4px 8px;background:var(--color-bg-subtle,#f1f5f9);border-radius:4px;display:inline-flex;align-items:center;gap:3px;" title="Shelf is automatically assigned to the first shelf with available capacity (FIFO)">
            <span class="icon" style="font-size:13px;color:#0284c7;">auto_awesome</span> Auto (FIFO)
          </span>
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
    `;
  }).join('');

  const savedHtml = batches.map((b, index) => {
    const isFefo = fefoBatch && fefoBatch.id === b.id;
    const statusBadge = getBatchStatusBadge(b);
    const daysLeft = calculateDaysRemaining(b.expiry_date);
    const expiryClass = daysLeft <= 0 ? 'text-danger fw-bold' : (daysLeft <= 30 ? 'text-warning fw-bold' : '');
    const actualLoc = getBatchActualShelfInfo(b, batches, activeFreezers);

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
          <select class="milk-shelf-select js-update-freezer" data-batch-id="${b.id}" aria-label="Freezer">
            ${freezerOptionsHtml(actualLoc.freezerName)}
          </select>
        </td>
        <td>
          <div style="display:flex;flex-direction:column;gap:2px;">
            <span class="badge badge--secondary" style="font-weight:600;font-size:12px;padding:3px 8px;width:fit-content;display:inline-flex;align-items:center;gap:4px;" title="Located on ${escapeHtml(actualLoc.startingShelf)} (Drag and drop in Virtual Freezer to rearrange)">
              <span class="icon" style="font-size:13px;color:#0284c7;">kitchen</span>
              ${escapeHtml(actualLoc.startingShelf)}
            </span>
            ${actualLoc.shelves.length > 1 ? `
              <div style="font-size:11px;color:#0284c7;font-weight:600;display:flex;align-items:center;gap:3px;" title="Due to 20-bag shelf limit, this batch's bags span across ${actualLoc.shelfDisplay}">
                <span class="icon icon--sm" style="font-size:12px;">layers</span> Spans ${escapeHtml(actualLoc.shelfDisplay)}
              </div>
            ` : ''}
          </div>
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
            <th style="min-width:140px;">Freezer</th>
            <th style="min-width:110px;">Shelf</th>
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
              <td colspan="10" style="text-align:center;padding:36px;color:var(--color-text-muted);">
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
  const configuredShelves = (activeFreezer.shelves && activeFreezer.shelves.length > 0)
    ? [...activeFreezer.shelves]
    : ['Shelf 1', 'Shelf 2', 'Shelf 3', 'Shelf 4'];

  // Isolate batches strictly by freezer: A newly created freezer (e.g. Freezer B) has 0 batches
  const freezerBatches = (batches || []).filter(b => {
    if ((b.remaining_bags || 0) <= 0) return false;
    const loc = getBatchFreezerAndShelf(b, freezers);
    return loc.freezerName.toLowerCase() === activeFreezer.name.toLowerCase();
  });

  // Dynamic Shelf Distribution: 20-bag max capacity per shelf, with excess rolling over to next shelf
  const shelfAllocations = configuredShelves.map(name => ({
    shelfName: name,
    usedBags: 0,
    items: [] // { batch, bags, isExcess, totalBatchBags }
  }));

  // Sort batches: Priority/FEFO batch first, then earliest expiration (FEFO + FIFO)
  const sortedBatches = [...freezerBatches].sort((a, b) => {
    if (fefoBatch && fefoBatch.id === a.id) return -1;
    if (fefoBatch && fefoBatch.id === b.id) return 1;
    const diffExpiry = new Date(a.expiry_date || 0) - new Date(b.expiry_date || 0);
    if (diffExpiry !== 0) return diffExpiry;
    const diffPast = new Date(a.date_pasteurized || 0) - new Date(b.date_pasteurized || 0);
    if (diffPast !== 0) return diffPast;
    const numA = parseInt((a.batch_number || '').replace(/\D/g, ''), 10) || 0;
    const numB = parseInt((b.batch_number || '').replace(/\D/g, ''), 10) || 0;
    if (numA !== numB) return numA - numB;
    return new Date(a.created_at || 0) - new Date(b.created_at || 0);
  });

  // Place batches onto shelves with 20 bags max per shelf
  sortedBatches.forEach(b => {
    const loc = getBatchFreezerAndShelf(b, freezers);
    let startIdx = shelfAllocations.findIndex(s => s.shelfName.toLowerCase() === loc.shelfName.toLowerCase());
    if (startIdx === -1) startIdx = 0;

    let remaining = b.remaining_bags;
    let currIdx = startIdx;

    while (remaining > 0) {
      if (currIdx >= shelfAllocations.length) {
        const nextShelfName = `Shelf ${shelfAllocations.length + 1}`;
        shelfAllocations.push({
          shelfName: nextShelfName,
          usedBags: 0,
          items: []
        });
      }

      const shelfObj = shelfAllocations[currIdx];
      const avail = Math.max(0, 20 - shelfObj.usedBags);

      if (avail > 0) {
        const place = Math.min(avail, remaining);
        shelfObj.items.push({
          batch: b,
          bags: place,
          isExcess: currIdx !== startIdx,
          totalBatchBags: b.remaining_bags
        });
        shelfObj.usedBags += place;
        remaining -= place;
      }
      currIdx++;
    }
  });

  // Selected shelf data if a shelf is clicked
  const selectedShelfObj = selectedShelf ? shelfAllocations.find(s => s.shelfName === selectedShelf) : null;
  const selectedShelfBags = selectedShelfObj ? selectedShelfObj.usedBags : 0;

  // Status text determination for dark header
  let statusText = 'Select a shelf or batch';
  let statusSub = 'SYSTEM STATUS';
  if (selectedBatch) {
    statusSub = 'BATCH SELECTED';
    statusText = `${escapeHtml(selectedBatch.batch_number)} - ${selectedBatch.remaining_bags} Bags Available`;
  } else if (selectedShelf) {
    statusSub = 'SHELF SELECTED';
    statusText = `${escapeHtml(selectedShelf)} - ${selectedShelfBags} / 20 Bags Total`;
  }

  // Freezer Tabs Bar with Rename & Delete (delete shown when >1 freezer)
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
          ${freezers.length > 1 ? `
            <span class="digital-twin-tab-del-btn js-delete-freezer" data-freezer-id="${f.id}" title="Delete ${escapeHtml(f.name)}">
              <span class="icon" style="font-size:14px;">delete</span>
            </span>
          ` : ''}
        </button>
      `).join('')}
      <button class="digital-twin-add-freezer-btn" id="btn-add-freezer" type="button">
        <span class="icon">add</span> Add Freezer
      </button>
    </div>
  `;

  // Shelves HTML (Vertical Scroll Pane — NO empty dashed boxes)
  const shelvesListHtml = shelfAllocations.map((shelfObj, shelfIdx) => {
    const totalBags = shelfObj.usedBags;
    const isFefoShelf = shelfObj.items.some(it => fefoBatch && fefoBatch.id === it.batch.id);
    const isNewestShelf = shelfIdx === shelfAllocations.length - 1;
    const isShelfSelected = selectedShelf === shelfObj.shelfName;

    // Render batch boxes strictly for actual contents (no empty placeholder boxes)
    const filledBoxes = shelfObj.items.map(it => {
      const b = it.batch;
      const isPriority = fefoBatch && fefoBatch.id === b.id;
      const isSelected = selectedBatch && selectedBatch.id === b.id;
      const isLow = (b.remaining_bags || 0) <= 3;

      let variantClass = 'batch-box--normal';
      if (isPriority) variantClass = 'batch-box--priority';
      else if (isLow) variantClass = 'batch-box--low';

      if (isSelected) variantClass += ' batch-box--selected';

      return `
        <div class="batch-box ${variantClass} js-freezer-batch-box"
             draggable="true"
             data-batch-id="${b.id}"
             data-shelf-name="${escapeHtml(shelfObj.shelfName)}"
             title="Drag and drop to move ${escapeHtml(b.batch_number)} to another shelf (${it.bags} bags on this shelf)">
          <span class="batch-box__no" style="display:inline-flex;align-items:center;gap:2px;">
            <span class="icon icon--sm" style="font-size:11px;opacity:0.5;cursor:grab;">drag_indicator</span>${escapeHtml(b.batch_number)}
          </span>
          <span class="batch-box__bags">
            ${it.bags} ${it.bags === 1 ? 'bag' : 'bags'}
            ${it.isExcess ? '<span style="font-size:9.5px;color:#d97706;font-weight:700;">(excess)</span>' : ''}
          </span>
        </div>
      `;
    });

    let pillLabel = shelfObj.shelfName.toUpperCase();
    let pillClass = 'digital-twin-shelf-pill';
    if (isFefoShelf) {
      pillLabel = `${shelfObj.shelfName.toUpperCase()} (PRIORITY DISPATCH)`;
      pillClass += ' digital-twin-shelf-pill--priority';
    } else if (isNewestShelf) {
      pillLabel = `${shelfObj.shelfName.toUpperCase()} (NEWEST)`;
      pillClass += ' digital-twin-shelf-pill--newest';
    }

    return `
      <div class="digital-twin-shelf ${isShelfSelected ? 'digital-twin-shelf--selected' : ''} ${isFefoShelf ? 'digital-twin-shelf--fefo' : ''} js-freezer-shelf"
           data-shelf-name="${escapeHtml(shelfObj.shelfName)}">
        <div class="digital-twin-shelf-header">
          <span class="${pillClass}">
            ${isFefoShelf ? '<span class="icon" style="font-size:12px;">timer</span>' : ''}
            ${escapeHtml(pillLabel)}
          </span>
          <span class="digital-twin-shelf-bags-count">
            ${totalBags} / 20 bags ${totalBags >= 20 ? '<span style="color:#dc2626;font-weight:700;margin-left:4px;">(Full)</span>' : ''}
          </span>
        </div>

        <div class="batch-boxes-grid">
          ${filledBoxes.length > 0 ? filledBoxes.join('') : `
            <div style="grid-column: span 4; font-size: 12px; color: var(--color-text-muted); font-style: italic; padding: 6px 0;">
              No batches on this shelf (20 bags available)
            </div>
          `}
        </div>
      </div>
    `;
  }).join('');

  // Right Panel: Details Card
  let detailsCardContent = '';
  if (selectedBatch) {
    const isPriorityBatch = fefoBatch && fefoBatch.id === selectedBatch.id;
    const loc = getBatchFreezerAndShelf(selectedBatch, freezers);

    // Find all shelves where this batch is placed due to overflow
    const shelvesWithBatch = [];
    shelfAllocations.forEach(s => {
      const match = s.items.find(it => it.batch.id === selectedBatch.id);
      if (match) {
        shelvesWithBatch.push(`${s.shelfName} (${match.bags} bags)`);
      }
    });

    const locationText = shelvesWithBatch.length > 1
      ? shelvesWithBatch.join(' · ')
      : `${loc.freezerName} / ${loc.shelfName}`;

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
          <span class="details-field-label">Freezer & Location</span>
          <span class="details-field-val" style="font-size:13.5px;">${escapeHtml(locationText)}</span>
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
        <button class="btn btn-primary js-quick-dispense-btn" data-batch-id="${selectedBatch.id}" type="button"
                style="background:#0284c7;border-color:#0284c7;margin-left:auto;gap:6px;">
          <span class="icon icon--sm">volunteer_activism</span> Dispense Bags
        </button>
      </div>
    `;
  } else if (selectedShelfObj) {
    const shelfItems = selectedShelfObj.items;

    detailsCardContent = `
      <div class="details-card-header">
        <div>
          <h2 class="details-card-title">Shelf Details</h2>
          <p class="details-card-subtitle">Storage occupancy and batches for ${escapeHtml(selectedShelfObj.shelfName)}.</p>
        </div>
      </div>

      <div class="details-inner-card">
        <div class="details-field-group">
          <span class="details-field-label">Selected Shelf</span>
          <span class="details-field-val details-field-val--batch">${escapeHtml(selectedShelfObj.shelfName)}</span>
        </div>
        <div class="details-field-group">
          <span class="details-field-label">Freezer Cabinet</span>
          <span class="details-field-val">${escapeHtml(activeFreezer.name)}</span>
        </div>
        <div class="details-field-group">
          <span class="details-field-label">Total Bags on Shelf</span>
          <span class="details-field-val details-field-val--qty">${selectedShelfBags} / 20 Bags</span>
        </div>
        <div class="details-field-group">
          <span class="details-field-label">Batches Count</span>
          <span class="details-field-val">${shelfItems.length} active batch portions</span>
        </div>
        <div class="details-field-group" style="grid-column: span 2;">
          <span class="details-field-label">Capacity Utilization (Max 20 Bags)</span>
          <div style="background:#e2e8f0;border-radius:6px;height:10px;overflow:hidden;margin-top:6px;">
            <div style="background:${selectedShelfBags >= 20 ? '#dc2626' : (selectedShelfBags > 14 ? '#f59e0b' : '#0284c7')};width:${Math.min(100, Math.round(selectedShelfBags / 20 * 100))}%;height:100%;"></div>
          </div>
          <span style="font-size:11px;color:var(--color-text-muted);margin-top:4px;">${selectedShelfBags} of 20 bags used (${Math.min(100, Math.round(selectedShelfBags / 20 * 100))}%)</span>
        </div>
      </div>

      ${shelfItems.length > 0 ? `
        <div style="margin-top:8px;">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:8px;">
            Batches on this shelf:
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            ${shelfItems.map(it => `
              <button class="freezer-batch-pill js-freezer-batch-box" data-batch-id="${it.batch.id}" style="cursor:pointer;border:1px solid #bae6fd;">
                <strong style="color:#0369a1;font-family:monospace;">${escapeHtml(it.batch.batch_number)}</strong>
                <span>·</span>
                <span>${it.bags} bags</span>
              </button>
            `).join('')}
          </div>
        </div>
      ` : `
        <div style="color:var(--color-text-muted);font-size:13px;padding:12px 0;">
          No pasteurized batches currently stored on this shelf.
        </div>
      `}

      <div class="details-actions-row">
        ${shelfItems.length > 0 ? `
          <button class="btn btn-primary js-dispense-shelf-btn" data-shelf-name="${escapeHtml(selectedShelf)}" type="button"
                  style="background:#0284c7;border-color:#0284c7;margin-left:auto;gap:6px;">
            <span class="icon icon--sm">volunteer_activism</span> Dispense From Shelf (${selectedShelfBags} bags)
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
          Click on any shelf to inspect bag occupancy, or click a batch box to view expiration, edit details, or dispense pouches.
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
              <div style="display:flex;align-items:center;gap:6px;">
                <button class="digital-twin-rename-inline-btn js-rename-freezer" data-freezer-id="${activeFreezer.id}" type="button">
                  <span class="icon">edit</span> Rename
                </button>
                ${freezers.length > 1 ? `
                  <button class="digital-twin-rename-inline-btn js-delete-freezer" data-freezer-id="${activeFreezer.id}" style="color:#fca5a5;" type="button">
                    <span class="icon">delete</span> Delete
                  </button>
                ` : ''}
              </div>
            </div>

            <!-- System Status Box -->
            <div class="digital-twin-status-box">
              <span class="digital-twin-status-label">${escapeHtml(statusSub)}</span>
              <span class="digital-twin-status-val">${escapeHtml(statusText)}</span>
            </div>
          </div>

          <!-- Vertical Scroll Pane for Shelves (NO empty placeholder boxes) -->
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
                      ${activeFreezer.shelves.length <= 2 ? 'disabled' : ''}>
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
// SHEET 3: Dispensing Ledger Spreadsheet (Clinical Indication REMOVED)
// Exactly 8 columns: #, Date, Recipient, Barangay, Batch, Bags, Released By, Actions
// ════════════════════════════════════════════════════════════════════════════
export function renderDispatchesSheet(dispatches = [], draftRows = [], availableBatches = [], fefoBatch = null, freezers = []) {
  const pendingCount = draftRows.length;
  const activeFreezers = freezers.length > 0 ? freezers : [];

  const brgyOptionsHtml = (selected) => (BARANGAYS || []).map(b => `
    <option value="${b}" ${selected === b ? 'selected' : ''}>${b}</option>
  `).join('');

  const batchOptionsHtml = (selectedId) => {
    return availableBatches.map(b => {
      const isFefo = fefoBatch && fefoBatch.id === b.id;
      const isSel = (selectedId ? selectedId === b.id : isFefo);
      const actualLoc = getBatchActualShelfInfo(b, availableBatches, activeFreezers);
      return `
        <option value="${b.id}" ${isSel ? 'selected' : ''} data-remaining="${b.remaining_bags || 0}">
          ${isFefo ? '[DISPATCH FIRST] ' : ''}${b.batch_number} (${b.remaining_bags} bags avail · ${actualLoc.shelfDisplay})
        </option>
      `;
    }).join('');
  };

  const draftHtml = draftRows.map((draft, idx) => {
    const selectedBatch = availableBatches.find(b => b.id === draft.batch_id) || (fefoBatch || availableBatches[0]);
    const maxBags = selectedBatch ? (selectedBatch.remaining_bags || 1) : 1;
    const currentBags = draft.bags_dispensed !== undefined ? draft.bags_dispensed : maxBags;
    draft.bags_dispensed = currentBags;
    if (selectedBatch && !draft.batch_id) {
      draft.batch_id = selectedBatch.id;
    }

    return `
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
          <select class="grid-cell-select js-dispense-batch" data-draft-idx="${idx}" aria-label="Batch Issued (FEFO)">
            ${batchOptionsHtml(draft.batch_id || (selectedBatch ? selectedBatch.id : ''))}
          </select>
        </td>
        <td style="max-width:90px;text-align:center;">
          <input type="number" class="grid-cell-input js-dispense-bags" min="1" max="${maxBags}"
                 value="${currentBags}" aria-label="Bags Dispensed"
                 title="Maximum available for this batch: ${maxBags} bag(s)">
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
    `;
  }).join('');

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
            <th style="min-width:120px;">Released By</th>
            <th style="min-width:90px;text-align:center;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${draftHtml}
          ${savedHtml}
          ${dispatches.length === 0 && draftRows.length === 0 ? `
            <tr>
              <td colspan="8" style="text-align:center;padding:36px;color:var(--color-text-muted);">
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

/**
 * Render Milk Bank In-Module Audit Trail Sheet
 */
export function renderMilkAuditSheet(auditLogs = [], filterAction = '', searchQuery = '') {
  let filtered = auditLogs || [];
  if (filterAction) {
    filtered = filtered.filter(l => l.action === filterAction);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(l =>
      (l.description || '').toLowerCase().includes(q) ||
      (l.action || '').toLowerCase().includes(q) ||
      (l.profiles?.full_name || '').toLowerCase().includes(q)
    );
  }

  const rowsHtml = filtered.map((log, idx) => {
    const d = new Date(log.created_at);
    const dateFormatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeFormatted = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    let actionBadgeCls = 'badge--secondary';
    let actionIcon = 'info';
    let actionLabel = log.action;

    switch (log.action) {
      case AUDIT_ACTIONS.CREATE_MILK_DONATION:
        actionBadgeCls = 'badge--info';
        actionIcon = 'receipt_long';
        actionLabel = 'Milk Intake';
        break;
      case AUDIT_ACTIONS.CREATE_MILK_BATCH:
        actionBadgeCls = 'badge--info';
        actionIcon = 'kitchen';
        actionLabel = 'Batch Created';
        break;
      case AUDIT_ACTIONS.UPDATE_MILK_BATCH:
        actionBadgeCls = 'badge--warning';
        actionIcon = 'edit';
        actionLabel = 'Batch Edited';
        break;
      case AUDIT_ACTIONS.DELETE_MILK_BATCH:
        actionBadgeCls = 'badge--danger';
        actionIcon = 'delete';
        actionLabel = 'Batch Deleted';
        break;
      case AUDIT_ACTIONS.MOVE_MILK_SHELF:
        actionBadgeCls = 'badge--warning';
        actionIcon = 'swap_horiz';
        actionLabel = 'Shelf Relocated';
        break;
      case AUDIT_ACTIONS.DISPENSE_MILK_BATCH:
        actionBadgeCls = 'badge--success';
        actionIcon = 'volunteer_activism';
        actionLabel = 'Milk Dispensed';
        break;
      case AUDIT_ACTIONS.CREATE_FREEZER_UNIT:
        actionBadgeCls = 'badge--info';
        actionIcon = 'add_box';
        actionLabel = 'Freezer Created';
        break;
      case AUDIT_ACTIONS.UPDATE_FREEZER_UNIT:
        actionBadgeCls = 'badge--warning';
        actionIcon = 'edit_note';
        actionLabel = 'Freezer Renamed';
        break;
      case AUDIT_ACTIONS.DELETE_FREEZER_UNIT:
        actionBadgeCls = 'badge--danger';
        actionIcon = 'delete_forever';
        actionLabel = 'Freezer Deleted';
        break;
    }

    return `
      <tr>
        <td class="text-muted text-xs" style="text-align:center;">${idx + 1}</td>
        <td class="text-sm">
          <div style="font-weight:600;">${dateFormatted}</div>
          <div class="text-muted text-xs">${timeFormatted}</div>
        </td>
        <td>
          <span class="badge ${actionBadgeCls}" style="display:inline-flex;align-items:center;gap:4px;">
            <span class="icon" style="font-size:13px;">${actionIcon}</span>
            ${actionLabel}
          </span>
        </td>
        <td class="text-muted text-xs font-mono">${escapeHtml(log.entity_type || '—')}</td>
        <td class="text-sm font-weight-medium" style="max-width:380px;">${escapeHtml(log.description || '—')}</td>
        <td class="text-sm">
          <span class="milk-staff-pill" style="display:inline-flex;align-items:center;gap:4px;background:#f1f5f9;padding:3px 8px;border-radius:6px;font-size:12px;">
            <span class="icon" style="font-size:13px;color:#64748b;">person</span>
            ${escapeHtml(log.profiles?.full_name || 'Staff User')}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="milk-sheet-toolbar">
      <div class="milk-sheet-title">
        <span class="icon icon--sm" aria-hidden="true" style="color:var(--color-milk-primary);">history</span>
        MILK BANK AUDIT TRAIL
        <span class="milk-sheet-subtitle">Custody, Dispensing &amp; Cold-Chain Log (${filtered.length} entries)</span>
      </div>
      <div class="milk-sheet-actions">
        <input type="text" id="milk-audit-search" class="form-input"
               placeholder="Search audit descriptions, batches, staff..."
               value="${escapeHtml(searchQuery)}"
               style="width: 260px; font-size: 13px; padding: 5px 10px;">
        <select id="milk-audit-filter" class="form-input" style="width: 170px; font-size: 13px; padding: 5px 8px;">
          <option value="">All Milk Actions</option>
          <option value="${AUDIT_ACTIONS.CREATE_MILK_DONATION}" ${filterAction === AUDIT_ACTIONS.CREATE_MILK_DONATION ? 'selected' : ''}>Intakes (FM.002.00)</option>
          <option value="${AUDIT_ACTIONS.CREATE_MILK_BATCH}" ${filterAction === AUDIT_ACTIONS.CREATE_MILK_BATCH ? 'selected' : ''}>Batches Created</option>
          <option value="${AUDIT_ACTIONS.MOVE_MILK_SHELF}" ${filterAction === AUDIT_ACTIONS.MOVE_MILK_SHELF ? 'selected' : ''}>Shelf Relocations</option>
          <option value="${AUDIT_ACTIONS.DISPENSE_MILK_BATCH}" ${filterAction === AUDIT_ACTIONS.DISPENSE_MILK_BATCH ? 'selected' : ''}>Milk Dispenses</option>
          <option value="${AUDIT_ACTIONS.CREATE_FREEZER_UNIT}" ${filterAction === AUDIT_ACTIONS.CREATE_FREEZER_UNIT ? 'selected' : ''}>Freezer Units Added</option>
          <option value="${AUDIT_ACTIONS.UPDATE_FREEZER_UNIT}" ${filterAction === AUDIT_ACTIONS.UPDATE_FREEZER_UNIT ? 'selected' : ''}>Freezers Renamed</option>
          <option value="${AUDIT_ACTIONS.DELETE_FREEZER_UNIT}" ${filterAction === AUDIT_ACTIONS.DELETE_FREEZER_UNIT ? 'selected' : ''}>Freezers Deleted</option>
          <option value="${AUDIT_ACTIONS.DELETE_MILK_BATCH}" ${filterAction === AUDIT_ACTIONS.DELETE_MILK_BATCH ? 'selected' : ''}>Batches Deleted</option>
        </select>
      </div>
    </div>

    <div class="table-responsive">
      <table class="milk-sheet-table">
        <thead>
          <tr>
            <th style="width:45px;text-align:center;">#</th>
            <th style="min-width:130px;">Date &amp; Time</th>
            <th style="min-width:140px;">Action Type</th>
            <th style="min-width:100px;">Target Type</th>
            <th style="min-width:320px;">Description of Activity</th>
            <th style="min-width:150px;">Personnel</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || `
            <tr>
              <td colspan="6" style="text-align:center;padding:48px 20px;color:var(--color-text-muted);">
                <span class="icon" style="font-size:36px;color:#94a3b8;display:block;margin-bottom:8px;">history_toggle_off</span>
                No audit activity records found matching this filter.
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  `;
}
