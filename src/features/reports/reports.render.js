/**
 * Reports Module — Render
 * Uses the system design system classes exclusively:
 *   .page-header, .card, .card-header, .card-title
 *   .form-group, .form-label, .form-input, .form-select, .form-row
 *   .btn, .btn-primary, .btn-ghost
 *   .table, .badge
 */

export function renderReportsLayout() {
  return `
    <!-- Page Header -->
    <div class="page-header">
      <h1 class="page-header__title">Analytics &amp; Reporting</h1>
      <p class="page-header__subtitle">Generate and export official LGU operational data.</p>
    </div>

    <!-- Report Configuration Card -->
    <div class="card" style="padding: 0; margin-bottom: var(--space-6); overflow: hidden;">

      <div class="card-header" style="padding: var(--space-4) var(--space-6); margin-bottom: 0; border-bottom: 1px solid var(--color-border);">
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <span class="icon" style="color: var(--color-primary); font-size: 20px;">tune</span>
          <h2 class="card-title">Report Configuration</h2>
        </div>
      </div>

      <div style="padding: var(--space-6); display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-10); align-items: start;">

        <!-- Left: Data Model Selection -->
        <div>
          <p class="form-label" style="text-transform: uppercase; letter-spacing: 0.06em; font-size: var(--font-size-xs); color: var(--color-text-muted); margin-bottom: var(--space-3);">Select Data Model</p>

          <label class="report-model-option" data-model="distribution" style="
            display: flex; align-items: flex-start; gap: var(--space-3);
            padding: var(--space-4); border-radius: var(--radius-lg);
            border: 1px solid var(--color-primary); box-shadow: inset 3px 0 0 var(--color-primary); background: #f4fbf5;
            margin-bottom: var(--space-3); cursor: pointer;
            transition: border-color var(--transition-md3), background var(--transition-md3), box-shadow var(--transition-md3);
          ">
            <input type="radio" name="report_model" value="distribution" checked
              style="margin-top: 3px; accent-color: var(--color-primary); flex-shrink: 0;">
            <div>
              <div style="font-weight: var(--font-weight-semibold); color: var(--color-text); font-size: var(--font-size-sm);">Distribution &amp; Dispatch Ledger</div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px;">Track items released to barangays.</div>
            </div>
          </label>

          <label class="report-model-option" data-model="fefo" style="
            display: flex; align-items: flex-start; gap: var(--space-3);
            padding: var(--space-4); border-radius: var(--radius-lg);
            border: 1px solid var(--color-border); box-shadow: none; background: transparent;
            margin-bottom: var(--space-3); cursor: pointer;
            transition: border-color var(--transition-md3), background var(--transition-md3), box-shadow var(--transition-md3);
          ">
            <input type="radio" name="report_model" value="fefo"
              style="margin-top: 3px; accent-color: var(--color-primary); flex-shrink: 0;">
            <div>
              <div style="font-weight: var(--font-weight-semibold); color: var(--color-text); font-size: var(--font-size-sm);">FEFO Wastage &amp; Expiry Risk</div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px;">Audit items nearing critical expiry thresholds.</div>
            </div>
          </label>

          <label class="report-model-option" data-model="allocation" style="
            display: flex; align-items: flex-start; gap: var(--space-3);
            padding: var(--space-4); border-radius: var(--radius-lg);
            border: 1px solid var(--color-border); box-shadow: none; background: transparent;
            cursor: pointer;
            transition: border-color var(--transition-md3), background var(--transition-md3), box-shadow var(--transition-md3);
          ">
            <input type="radio" name="report_model" value="allocation"
              style="margin-top: 3px; accent-color: var(--color-primary); flex-shrink: 0;">
            <div>
              <div style="font-weight: var(--font-weight-semibold); color: var(--color-text); font-size: var(--font-size-sm);">Current Allocation Balances</div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px;">Overall snapshot of active MNAO inventory.</div>
            </div>
          </label>
        </div>

        <!-- Right: Filters -->
        <div style="display: flex; flex-direction: column; gap: var(--space-4);">

          <!-- Date range — only for Distribution -->
          <div id="filter-group-dates" class="form-row">
            <div class="form-group">
              <label class="form-label" for="report-date-start">Date Range Start</label>
              <input type="date" id="report-date-start" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label" for="report-date-end">Date Range End</label>
              <input type="date" id="report-date-end" class="form-input">
            </div>
          </div>

          <!-- Commodity filter — all models -->
          <div class="form-group">
            <label class="form-label" for="report-filter-commodity">Filter by Commodity <span style="color: var(--color-text-muted); font-weight: normal;">(Optional)</span></label>
            <select id="report-filter-commodity" class="form-select">
              <option value="all">All Commodities</option>
            </select>
          </div>

          <!-- Barangay filter — Distribution only -->
          <div id="filter-group-destination" class="form-group">
            <label class="form-label" for="report-filter-barangay">Filter by Destination <span style="color: var(--color-text-muted); font-weight: normal;">(Optional)</span></label>
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
      ">
        <div style="display: flex; gap: var(--space-3);">
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

      <div class="card-header" style="padding: var(--space-4) var(--space-6); margin-bottom: 0; border-bottom: 1px solid var(--color-border);">
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <span class="icon" style="color: var(--color-text-muted); font-size: 20px;">history</span>
          <h2 class="card-title">Report Archive</h2>
        </div>
        <p class="card-subtitle" style="margin: 0;">Last 20 generated reports. Click download to re-generate.</p>
      </div>

      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Report Name</th>
              <th>Parameters</th>
              <th>Generated On</th>
              <th>Format</th>
              <th style="text-align: right;">Action</th>
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
    return `
      <tr>
        <td style="font-weight: var(--font-weight-medium);">${item.name}</td>
        <td style="color: var(--color-text-muted); font-size: var(--font-size-sm);">${item.parameters}</td>
        <td style="font-size: var(--font-size-sm);">${item.generatedOn}</td>
        <td><span class="${badgeClass}">${item.format}</span></td>
        <td style="text-align: right;">
          <button class="btn btn-icon btn-replay-report" data-id="${item.id}" title="Re-generate this report">
            <span class="icon">download</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}
