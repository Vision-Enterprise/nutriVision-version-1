/**
 * Reports Module — Render
 * Uses the system design system classes exclusively:
 *   .page-header, .card, .card-header, .card-title
 *   .form-group, .form-label, .form-input, .form-select, .form-row
 *   .btn, .btn-primary, .btn-ghost
 *   .table, .badge
 */

import { EXPIRATION_STATUS } from '../../shared/constants/app.constants.js';
import { buildReportFileName } from './reports.export.js';

export function renderReportsLayout() {
  return `
    <!-- Page Header -->
    <div class="page-header">
      <h1 class="page-header__title">Analytics &amp; Reporting</h1>
      <p class="page-header__subtitle">Generate and export official MNAO batch inventory, barangay distribution, and stock summary reports.</p>
    </div>

    <!-- Report Configuration Card -->
    <div class="card" style="padding: 0; margin-bottom: var(--space-6); overflow: hidden;">

      <div class="card-header" style="padding: var(--space-4) var(--space-6); margin-bottom: 0; border-bottom: 1px solid var(--color-border);">
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <span class="icon" style="color: var(--color-primary); font-size: 20px;">tune</span>
          <h2 class="card-title">Report Configuration</h2>
        </div>
      </div>

      <div style="padding: var(--space-6); display: grid; grid-template-columns: 1.05fr 1fr; gap: var(--space-8); align-items: start;">

        <!-- Left: Report Type Selection -->
        <div>
          <p class="form-label" style="text-transform: uppercase; letter-spacing: 0.06em; font-size: var(--font-size-xs); color: var(--color-text-muted); margin-bottom: var(--space-3);">Select Official Report</p>

          <!-- 1. Batch Inventory & Expiry Status Report -->
          <label class="report-model-option" data-model="batches" style="
            display: flex; align-items: flex-start; gap: var(--space-3);
            padding: var(--space-3) var(--space-4); border-radius: var(--radius-lg);
            border: 1px solid var(--color-primary); box-shadow: inset 3px 0 0 var(--color-primary); background: #f4fbf5;
            margin-bottom: var(--space-3); cursor: pointer;
            transition: border-color var(--transition-md3), background var(--transition-md3), box-shadow var(--transition-md3);
          ">
            <input type="radio" name="report_model" value="batches" checked
              style="margin-top: 3px; accent-color: var(--color-primary); flex-shrink: 0;">
            <div>
              <div style="font-weight: var(--font-weight-semibold); color: var(--color-text); font-size: var(--font-size-sm);">Batch Inventory &amp; Expiry Status Report</div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px;">Complete ledger of available batches, suppliers, delivery dates, and FEFO expiry status.</div>
            </div>
          </label>

          <!-- 2. Barangay Distribution & Dispatch Report -->
          <label class="report-model-option" data-model="distribution" style="
            display: flex; align-items: flex-start; gap: var(--space-3);
            padding: var(--space-3) var(--space-4); border-radius: var(--radius-lg);
            border: 1px solid var(--color-border); box-shadow: none; background: transparent;
            margin-bottom: var(--space-3); cursor: pointer;
            transition: border-color var(--transition-md3), background var(--transition-md3), box-shadow var(--transition-md3);
          ">
            <input type="radio" name="report_model" value="distribution"
              style="margin-top: 3px; accent-color: var(--color-primary); flex-shrink: 0;">
            <div>
              <div style="font-weight: var(--font-weight-semibold); color: var(--color-text); font-size: var(--font-size-sm);">Barangay Distribution &amp; Dispatch Report</div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px;">Track commodities released to barangays, recipients, and releasing personnel.</div>
            </div>
          </label>

          <!-- 3. Commodity Stock Summary Report -->
          <label class="report-model-option" data-model="allocation" style="
            display: flex; align-items: flex-start; gap: var(--space-3);
            padding: var(--space-3) var(--space-4); border-radius: var(--radius-lg);
            border: 1px solid var(--color-border); box-shadow: none; background: transparent;
            cursor: pointer;
            transition: border-color var(--transition-md3), background var(--transition-md3), box-shadow var(--transition-md3);
          ">
            <input type="radio" name="report_model" value="allocation"
              style="margin-top: 3px; accent-color: var(--color-primary); flex-shrink: 0;">
            <div>
              <div style="font-weight: var(--font-weight-semibold); color: var(--color-text); font-size: var(--font-size-sm);">Commodity Stock Summary Report</div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px;">Physical stock balance per commodity, active batch counts, and cumulative units released.</div>
            </div>
          </label>
        </div>

        <!-- Right: Contextual Filters -->
        <div style="display: flex; flex-direction: column; gap: var(--space-4);">
          <p class="form-label" style="text-transform: uppercase; letter-spacing: 0.06em; font-size: var(--font-size-xs); color: var(--color-text-muted); margin-bottom: -4px;">Report Filters &amp; Scope</p>

          <!-- Commodity filter — all models -->
          <div class="form-group">
            <label class="form-label" for="report-filter-commodity">Filter by Commodity <span style="color: var(--color-text-muted); font-weight: normal;">(Optional)</span></label>
            <select id="report-filter-commodity" class="form-select">
              <option value="all">All Commodities</option>
            </select>
          </div>

          <!-- Expiry Status filter — only for Batch Inventory & Expiry Report -->
          <div id="filter-group-expiry-status" class="form-group">
            <label class="form-label" for="report-filter-expiry-status">Filter by Expiry Status</label>
            <select id="report-filter-expiry-status" class="form-select">
              <option value="all">All Active Batches (Full Inventory)</option>
              <option value="fefo_risk">Near Expiry &amp; Expired Only (FEFO Priority ≤ 90 Days)</option>
              <option value="${EXPIRATION_STATUS.GOOD}">Good (&gt; 6 Months)</option>
              <option value="${EXPIRATION_STATUS.MODERATE}">Moderate (3–6 Months)</option>
              <option value="${EXPIRATION_STATUS.NEAR_EXPIRY}">Near Expiry (0–3 Months)</option>
              <option value="${EXPIRATION_STATUS.EXPIRED}">Expired (&lt; 0 Days)</option>
            </select>
          </div>

          <!-- Date range + Quick Presets — for Distribution & Defects -->
          <div id="filter-group-dates" style="display: none; flex-direction: column; gap: var(--space-3);">
            <div>
              <label class="form-label" style="margin-bottom: 6px; display: block;">Quick Date Period</label>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button type="button" class="btn-table-action js-date-preset" data-preset="all" style="padding: 4px 10px; font-size: 12px;">All Time</button>
                <button type="button" class="btn-table-action js-date-preset" data-preset="month" style="padding: 4px 10px; font-size: 12px;">This Month</button>
                <button type="button" class="btn-table-action js-date-preset" data-preset="30d" style="padding: 4px 10px; font-size: 12px;">Last 30 Days</button>
                <button type="button" class="btn-table-action js-date-preset" data-preset="year" style="padding: 4px 10px; font-size: 12px;">This Year</button>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="report-date-start">Date Range Start</label>
                <input type="date" id="report-date-start" class="form-input">
              </div>
              <div class="form-group">
                <label class="form-label" for="report-date-end">Date Range End</label>
                <input type="date" id="report-date-end" class="form-input">
              </div>
            </div>
          </div>

          <!-- Barangay filter — Distribution only -->
          <div id="filter-group-destination" class="form-group" style="display: none;">
            <label class="form-label" for="report-filter-barangay">Filter by Destination Barangay <span style="color: var(--color-text-muted); font-weight: normal;">(Optional)</span></label>
            <select id="report-filter-barangay" class="form-select">
              <option value="all">All Barangays</option>
            </select>
          </div>

        </div>
      </div>

      <!-- Action Bar -->
      <div style="
        padding: var(--space-4) var(--space-6);
        border-top: 1px solid var(--color-border);
        display: flex; justify-content: space-between; align-items: center;
        background: var(--color-surface-alt, #f8faf9);
        flex-wrap: wrap; gap: var(--space-3);
      ">
        <div style="display: flex; gap: var(--space-3); flex-wrap: wrap;">
          <button id="btn-generate-pdf" class="btn btn-primary" style="display: flex; align-items: center; gap: var(--space-2);">
            <span class="icon" style="font-size: 18px;">picture_as_pdf</span>
            Generate PDF
          </button>
          <button id="btn-export-csv" class="btn" style="display: flex; align-items: center; gap: var(--space-2); border: 1px solid var(--color-border);">
            <span class="icon" style="font-size: 18px;">grid_on</span>
            Export as Excel (.csv)
          </button>
        </div>
        <button id="btn-print-preview" class="btn btn-ghost" style="display: flex; align-items: center; gap: var(--space-2);">
          <span class="icon" style="font-size: 18px;">print</span>
          Print Preview
        </button>
      </div>

    </div>

    <!-- Report Archive Card -->
    <div class="card" style="padding: 0; overflow: hidden;">

      <div class="card-header" style="padding: var(--space-4) var(--space-6); margin-bottom: 0; border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="display: flex; align-items: center; gap: var(--space-2);">
            <span class="icon" style="color: var(--color-text-muted); font-size: 20px;">history</span>
            <h2 class="card-title">Report Archive</h2>
          </div>
          <p class="card-subtitle" style="margin: 0;">Last 20 generated reports. Click view to open or delete to remove from history.</p>
        </div>
        <button id="btn-clear-archive" class="btn btn-ghost" style="display: none; font-size: var(--font-size-xs); color: var(--color-danger); gap: 4px; align-items: center;" title="Clear all report history">
          <span class="icon" style="font-size: 16px;">delete_sweep</span>
          Clear All
        </button>
      </div>

      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Report File Name</th>
              <th>Parameters</th>
              <th>Generated On</th>
              <th>Format</th>
              <th style="text-align: right; min-width: 150px;">Actions</th>
            </tr>
          </thead>
          <tbody id="report-archive-tbody">
            <tr>
              <td colspan="5" style="text-align: center; color: var(--color-text-muted); padding: var(--space-8);">
                <span class="icon" style="font-size: 32px; display: block; margin-bottom: var(--space-2); opacity: 0.4;">history</span>
                No archived reports yet. Generate one above.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  `;
}

/**
 * Renders archive table rows.
 */
export function renderArchiveRows(historyArr = []) {
  if (!historyArr || historyArr.length === 0) {
    return `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--color-text-muted); padding: var(--space-8);">
          <span class="icon" style="font-size: 32px; display: block; margin-bottom: var(--space-2); opacity: 0.4;">history</span>
          No archived reports yet. Generate one above.
        </td>
      </tr>
    `;
  }

  return historyArr.map(item => {
    const isPdf = item.format === 'PDF';
    const badgeClass = isPdf ? 'badge badge-near-expiry' : 'badge badge-active';
    const displayFileName = item.fileName || buildReportFileName(item.modelId, item.filters, item.format, item.generatedOn);
    return `
      <tr>
        <td style="font-weight: var(--font-weight-medium);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="icon" style="font-size: 18px; color: ${isPdf ? '#e05252' : '#10b981'}; flex-shrink: 0;">
              ${isPdf ? 'picture_as_pdf' : 'table_view'}
            </span>
            <span style="word-break: break-all;">${displayFileName}</span>
          </div>
        </td>
        <td style="color: var(--color-text-muted); font-size: var(--font-size-sm);">${item.parameters}</td>
        <td style="font-size: var(--font-size-sm); white-space: nowrap;">${item.generatedOn}</td>
        <td><span class="${badgeClass}">${item.format}</span></td>
        <td style="text-align: right; white-space: nowrap;">
          <div class="table-actions">
            ${isPdf ? `
              <button class="btn-table-icon btn-replay-report" data-id="${item.id}" type="button" title="View / Print report" aria-label="View report">
                <span class="icon">visibility</span>
              </button>
            ` : `
              <button class="btn-table-icon btn-replay-report" data-id="${item.id}" type="button" title="Download CSV" aria-label="Download CSV">
                <span class="icon">download</span>
              </button>
            `}
            <button class="btn-table-icon btn-table-icon--danger btn-delete-report" data-id="${item.id}" type="button" title="Delete from history" aria-label="Delete report">
              <span class="icon">delete_outline</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}
