/**
 * Renders the main reports HTML layout.
 */
export function renderReportsLayout() {
  return `
    <div class="page-header" style="margin-bottom: 24px;">
      <h1 class="page-title" style="margin: 0; font-size: 24px; color: var(--color-text, #1A2B1C);">Analytics & Reporting</h1>
      <p class="page-subtitle" style="margin: 4px 0 0 0; color: var(--color-text-muted, #5A7060); font-size: 14px;">Generate and export official LGU operational data.</p>
    </div>

    <!-- Report Configuration Card -->
    <div class="card" style="background: var(--color-surface, #ffffff); border: 1px solid var(--color-border, #D8E6DA); border-radius: 12px; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(27,122,62,0.03);">
      
      <div style="padding: 16px 24px; border-bottom: 1px solid var(--color-border, #D8E6DA); display: flex; align-items: center; gap: 8px;">
        <span class="icon" style="color: var(--color-primary, #1B7A3E);">settings</span>
        <h2 style="margin: 0; font-size: 16px; color: var(--color-text, #1A2B1C);">Report Configuration</h2>
      </div>

      <div style="padding: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; min-height: 250px;">
        
        <!-- Left: Model Selection -->
        <div>
          <label style="display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted, #5A7060); margin-bottom: 12px;">Select Data Model</label>
          
          <!-- Option 1: Distribution -->
          <label class="report-model-option active" style="display: flex; align-items: flex-start; gap: 12px; padding: 16px; border: 1px solid var(--color-primary, #1B7A3E); background: var(--color-primary-bg, #E8F5E9); border-radius: 8px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s;">
            <input type="radio" name="report_model" value="distribution" checked style="margin-top: 4px; accent-color: var(--color-primary, #1B7A3E);">
            <div>
              <div style="font-weight: 600; color: var(--color-text, #1A2B1C); margin-bottom: 4px;">Distribution & Dispatch Ledger</div>
              <div style="font-size: 12px; color: var(--color-text-muted, #5A7060);">Track items released to barangays.</div>
            </div>
          </label>

          <!-- Option 2: FEFO -->
          <label class="report-model-option" style="display: flex; align-items: flex-start; gap: 12px; padding: 16px; border: 1px solid var(--color-border, #D8E6DA); border-radius: 8px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s;">
            <input type="radio" name="report_model" value="fefo" style="margin-top: 4px; accent-color: var(--color-primary, #1B7A3E);">
            <div>
              <div style="font-weight: 600; color: var(--color-text, #1A2B1C); margin-bottom: 4px;">FEFO Wastage & Expiry Risk</div>
              <div style="font-size: 12px; color: var(--color-text-muted, #5A7060);">Audit items nearing critical expiry thresholds.</div>
            </div>
          </label>

          <!-- Option 3: Allocation -->
          <label class="report-model-option" style="display: flex; align-items: flex-start; gap: 12px; padding: 16px; border: 1px solid var(--color-border, #D8E6DA); border-radius: 8px; cursor: pointer; transition: all 0.2s;">
            <input type="radio" name="report_model" value="allocation" style="margin-top: 4px; accent-color: var(--color-primary, #1B7A3E);">
            <div>
              <div style="font-weight: 600; color: var(--color-text, #1A2B1C); margin-bottom: 4px;">Current Allocation Balances</div>
              <div style="font-size: 12px; color: var(--color-text-muted, #5A7060);">Overall snapshot of active MNAO inventory.</div>
            </div>
          </label>
        </div>

        <!-- Right: Filters -->
        <div>
          <!-- Date Range (Only for Distribution) -->
          <div id="filter-group-dates" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
            <div class="form-group">
              <label style="display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted, #5A7060); margin-bottom: 8px;">Date Range Start</label>
              <input type="date" id="report-date-start" class="form-control" style="width: 100%;">
            </div>
            <div class="form-group">
              <label style="display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted, #5A7060); margin-bottom: 8px;">Date Range End</label>
              <input type="date" id="report-date-end" class="form-control" style="width: 100%;">
            </div>
          </div>

          <!-- Commodity Filter (All models) -->
          <div class="form-group" style="margin-bottom: 20px;">
            <label style="display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted, #5A7060); margin-bottom: 8px;">Filter by Commodity (Optional)</label>
            <select id="report-filter-commodity" class="form-control" style="width: 100%;">
              <option value="all">All Commodities</option>
              <!-- Populated by JS -->
            </select>
          </div>

          <!-- Destination Filter (Only for Distribution) -->
          <div id="filter-group-destination" class="form-group">
            <label style="display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted, #5A7060); margin-bottom: 8px;">Filter by Destination (Optional)</label>
            <select id="report-filter-barangay" class="form-control" style="width: 100%;">
              <option value="all">All Barangays</option>
              <!-- Populated by JS -->
            </select>
          </div>
        </div>

      </div>

      <!-- Actions -->
      <div style="padding: 16px 24px; border-top: 1px solid var(--color-border, #D8E6DA); display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; gap: 12px;">
          <button id="btn-generate-pdf" class="btn btn-primary" style="display: flex; align-items: center; gap: 8px;">
            <span class="icon" style="font-size: 18px;">picture_as_pdf</span> Generate PDF
          </button>
          <button id="btn-export-csv" class="btn" style="display: flex; align-items: center; gap: 8px; border: 1px solid var(--color-border, #D8E6DA); background: white;">
            <span class="icon" style="font-size: 18px;">grid_on</span> Export as Excel (.csv)
          </button>
        </div>
        
        <button id="btn-print-preview" class="btn btn-ghost" style="display: flex; align-items: center; gap: 8px;">
          <span class="icon" style="font-size: 18px;">print</span> Print Preview
        </button>
      </div>

    </div>

    <!-- Report Archive Card -->
    <div class="card" style="background: var(--color-surface, #ffffff); border: 1px solid var(--color-border, #D8E6DA); border-radius: 12px; box-shadow: 0 4px 12px rgba(27,122,62,0.03);">
      
      <div style="padding: 16px 24px; border-bottom: 1px solid var(--color-border, #D8E6DA); display: flex; align-items: center; gap: 8px;">
        <span class="icon" style="color: var(--color-text-muted, #5A7060);">history</span>
        <h2 style="margin: 0; font-size: 16px; color: var(--color-text, #1A2B1C);">Report Archive</h2>
      </div>

      <div class="table-container">
        <table class="table" style="width: 100%;">
          <thead>
            <tr>
              <th style="font-size: 11px; text-transform: uppercase;">Report Name</th>
              <th style="font-size: 11px; text-transform: uppercase;">Parameters</th>
              <th style="font-size: 11px; text-transform: uppercase;">Generated On</th>
              <th style="font-size: 11px; text-transform: uppercase;">Format</th>
              <th style="font-size: 11px; text-transform: uppercase; text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody id="report-archive-tbody">
            <!-- Populated by JS -->
            <tr>
              <td colspan="5" style="text-align: center; color: var(--color-text-muted, #5A7060); padding: 32px;">No archived reports found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Renders the rows for the report archive table.
 */
export function renderArchiveRows(historyArr = []) {
  if (historyArr.length === 0) {
    return `<tr><td colspan="5" style="text-align: center; color: var(--color-text-muted, #5A7060); padding: 32px;">No archived reports found.</td></tr>`;
  }

  return historyArr.map(item => {
    const badgeColor = item.format === 'PDF' ? '#ef4444' : '#10b981';
    const badgeBg = item.format === 'PDF' ? '#fee2e2' : '#d1fae5';
    
    return `
      <tr>
        <td style="font-weight: 500;">${item.name}</td>
        <td style="color: var(--color-text-muted, #5A7060); font-size: 12px;">${item.parameters}</td>
        <td>${item.generatedOn}</td>
        <td>
          <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${item.format}</span>
        </td>
        <td style="text-align: right;">
          <button class="btn btn-icon btn-replay-report" data-id="${item.id}" title="Re-generate" style="color: var(--color-primary, #1B7A3E);">
            <span class="icon">download</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}
