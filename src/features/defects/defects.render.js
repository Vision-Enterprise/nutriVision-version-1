/**
 * Defects Module — HTML Render Templates
 * Uses system CSS classes exclusively.
 */

export function renderDefectsLayout() {
  return `
    <div class="page-header">
      <h1 class="page-header__title">Defect &amp; Quarantine Log</h1>
      <p class="page-header__subtitle">Flag and document damaged, recalled, or quarantined commodity batches.</p>
    </div>

    <!-- ── Incident Log Card ───────────────────────────────────────────── -->
    <div class="card" style="padding: 0; overflow: hidden; margin-bottom: var(--space-6);">

      <div class="card-header" style="padding: var(--space-4) var(--space-6); margin-bottom: 0; border-bottom: 1px solid var(--color-border);">
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <span class="icon" style="color: var(--color-exp-near, #e65100); font-size: 20px;">warning</span>
          <h2 class="card-title">Incident Log</h2>
        </div>
        <button id="btn-log-incident" class="btn btn-primary" style="display: flex; align-items: center; gap: var(--space-2);">
          <span class="icon" style="font-size: 18px;">add</span>
          Log Incident
        </button>
      </div>

      <!-- Filter Tabs -->
      <div style="padding: var(--space-3) var(--space-6); border-bottom: 1px solid var(--color-border); display: flex; gap: var(--space-2);">
        <button class="defect-tab active" data-filter="all" style="
          padding: 6px 16px; border-radius: var(--radius-full);
          border: 1px solid var(--color-primary); background: var(--color-primary); color: #fff;
          font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);
          cursor: pointer; transition: all var(--transition-md3);
        ">All Incidents</button>
        <button class="defect-tab" data-filter="Quarantined" style="
          padding: 6px 16px; border-radius: var(--radius-full);
          border: 1px solid var(--color-border); background: transparent; color: var(--color-text-muted);
          font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);
          cursor: pointer; transition: all var(--transition-md3);
        ">Quarantined Only</button>
        <button class="defect-tab" data-filter="Disposed" style="
          padding: 6px 16px; border-radius: var(--radius-full);
          border: 1px solid var(--color-border); background: transparent; color: var(--color-text-muted);
          font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);
          cursor: pointer; transition: all var(--transition-md3);
        ">Disposed Only</button>
      </div>

      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Batch ID</th>
              <th>Commodity</th>
              <th>Defect Classification</th>
              <th>Qty Affected</th>
              <th>Action Taken</th>
              <th>Reported By</th>
            </tr>
          </thead>
          <tbody id="defect-incidents-tbody">
            ${renderIncidentEmptyState()}
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── PDF Archive Card ────────────────────────────────────────────── -->
    <div class="card" style="padding: 0; overflow: hidden;">

      <div class="card-header" style="padding: var(--space-4) var(--space-6); margin-bottom: 0; border-bottom: 1px solid var(--color-border);">
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <span class="icon" style="color: var(--color-text-muted); font-size: 20px;">picture_as_pdf</span>
          <h2 class="card-title">Generated PDF Reports</h2>
        </div>
      </div>

      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Date Generated</th>
              <th>Report File Name</th>
              <th>Reference Batch</th>
              <th>Action Type</th>
              <th style="text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody id="defect-pdf-archive-tbody">
            ${renderPdfArchiveEmptyState()}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ─── Table Row Renderers ──────────────────────────────────────────────────────

export function renderIncidentEmptyState() {
  return `
    <tr>
      <td colspan="7" style="text-align: center; color: var(--color-text-muted); padding: var(--space-10);">
        <span class="icon" style="font-size: 36px; display: block; margin-bottom: var(--space-2); opacity: 0.4;">inventory</span>
        No incidents logged yet. Click "Log Incident" to report defective stock.
      </td>
    </tr>
  `;
}

export function renderIncidentRows(incidents = []) {
  if (!incidents.length) return renderIncidentEmptyState();

  return incidents.map(inc => {
    const date  = new Date(inc.reported_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    const badge = inc.action_taken === 'Disposed'
      ? '<span class="badge badge-expired" style="font-size:11px;">Disposed</span>'
      : '<span class="badge badge-near-expiry" style="font-size:11px;">Quarantine</span>';

    return `
      <tr>
        <td style="font-size: var(--font-size-sm); color: var(--color-text-muted);">${date}</td>
        <td style="font-weight: var(--font-weight-medium); font-family: monospace;">${inc.batches?.batch_number || '—'}</td>
        <td>${inc.batches?.commodities?.name || '—'}</td>
        <td style="font-size: var(--font-size-sm);">${inc.classification}</td>
        <td>${inc.quantity_affected} ${inc.batches?.commodities?.unit || ''}</td>
        <td>${badge}</td>
        <td style="font-size: var(--font-size-sm);">${inc.reporter_name || '—'}</td>
      </tr>
    `;
  }).join('');
}

export function renderPdfArchiveEmptyState() {
  return `
    <tr>
      <td colspan="5" style="text-align: center; color: var(--color-text-muted); padding: var(--space-10);">
        <span class="icon" style="font-size: 36px; display: block; margin-bottom: var(--space-2); opacity: 0.4;">history</span>
        No PDF reports generated yet.
      </td>
    </tr>
  `;
}

export function renderPdfArchiveRows(archiveArr = []) {
  if (!archiveArr.length) return renderPdfArchiveEmptyState();

  return archiveArr.map(item => {
    const date   = new Date(item.generatedOn).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    const type   = item.actionTaken === 'Disposed' ? 'Disposal Record' : 'Quarantine Notice';
    return `
      <tr>
        <td style="font-size: var(--font-size-sm); color: var(--color-text-muted);">${date}</td>
        <td style="font-weight: var(--font-weight-medium);">${item.fileName}</td>
        <td style="font-family: monospace; color: var(--color-text-muted);">${item.batchNumber}</td>
        <td style="font-size: var(--font-size-sm);">${type}</td>
        <td style="text-align: right;">
          <button class="btn btn-icon btn-replay-defect-pdf" data-id="${item.id}" title="Re-generate PDF">
            <span class="icon">download</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}
