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

      <div class="table-wrapper" style="border: none; box-shadow: none; border-radius: 0; overflow-x: hidden; width: 100%;">
        <table class="table table-compact" style="width: 100%; table-layout: auto;">
          <thead>
            <tr>
              <th style="padding: 10px 6px 10px 14px; white-space: nowrap;">Date</th>
              <th style="padding: 10px 6px; white-space: nowrap;">Batch ID</th>
              <th style="padding: 10px 6px;">Commodity</th>
              <th style="padding: 10px 6px;">Defect Classification</th>
              <th style="padding: 10px 6px; white-space: nowrap; text-align: center;">Scope</th>
              <th style="padding: 10px 6px; white-space: nowrap;">Qty Affected</th>
              <th style="padding: 10px 6px; white-space: nowrap; text-align: center;">Action Taken</th>
              <th style="padding: 10px 6px; white-space: nowrap;">Reported By</th>
              <th style="padding: 10px 14px 10px 6px; text-align: right; white-space: nowrap;">Actions</th>
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

      <div class="table-wrapper" style="border: none; box-shadow: none; border-radius: 0; overflow-x: hidden; width: 100%;">
        <table class="table table-compact" style="width: 100%; table-layout: auto;">
          <thead>
            <tr>
              <th style="padding: 10px 6px 10px 14px; white-space: nowrap;">Date Generated</th>
              <th style="padding: 10px 6px;">Report File Name</th>
              <th style="padding: 10px 6px; white-space: nowrap;">Reference Batch</th>
              <th style="padding: 10px 6px; white-space: nowrap;">Action Type</th>
              <th style="padding: 10px 14px 10px 6px; text-align: right; white-space: nowrap;">Action</th>
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
      <td colspan="9" style="text-align: center; color: var(--color-text-muted); padding: var(--space-10);">
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
      ? '<span class="badge badge-expired" style="font-size:11px; padding: 2px 7px; white-space:nowrap;">Disposed</span>'
      : '<span class="badge badge-near-expiry" style="font-size:11px; padding: 2px 7px; white-space:nowrap;">Quarantine</span>';

    const scopeBadge = inc.scope === 'entire_batch'
      ? '<span style="font-size: 10px; background: #e0e0e0; padding: 2px 5px; border-radius: 4px; white-space: nowrap;">Entire Batch</span>'
      : '<span style="font-size: 10px; background: #f0f0f0; padding: 2px 5px; border-radius: 4px; white-space: nowrap;">Partial</span>';

    let qtyStr = `${inc.quantity_affected} ${inc.batches?.commodities?.unit || ''}`;
    let actionHtml = '—';

    if (inc.action_taken === 'Quarantined') {
      // Fallback for legacy records before the column was added
      const remaining = inc.remaining_quarantined !== null ? inc.remaining_quarantined : inc.quantity_affected;
      
      // Show only the remaining amount so it's not confusing
      qtyStr = `${remaining} ${inc.batches?.commodities?.unit || ''}`;
      
      if (remaining > 0) {
        actionHtml = `<button class="btn btn-sm btn-restore-incident" data-id="${inc.id}" style="font-size: 11px; padding: 3px 8px; white-space: nowrap;">Restore</button>`;
      }
    }

    return `
      <tr>
        <td style="padding: 8px 6px 8px 14px; font-size: 12px; color: var(--color-text-muted); white-space: nowrap;">${date}</td>
        <td style="padding: 8px 6px; font-weight: var(--font-weight-medium); font-family: monospace; font-size: 11px; white-space: nowrap;">${inc.batches?.batch_number || '—'}</td>
        <td style="padding: 8px 6px; font-weight: var(--font-weight-medium); font-size: 12px;">${inc.batches?.commodities?.name || '—'}</td>
        <td style="padding: 8px 6px; font-size: 12px; color: var(--color-text-muted);">${inc.classification}</td>
        <td style="padding: 8px 6px; text-align: center; white-space: nowrap;">${scopeBadge}</td>
        <td style="padding: 8px 6px; white-space: nowrap; font-weight: var(--font-weight-medium); font-size: 12px;">${qtyStr}</td>
        <td style="padding: 8px 6px; text-align: center; white-space: nowrap;">${badge}</td>
        <td style="padding: 8px 6px; font-size: 12px; color: var(--color-text-muted); white-space: nowrap;">${inc.reporter_name || '—'}</td>
        <td style="padding: 8px 14px 8px 6px; text-align: right; white-space: nowrap;">${actionHtml}</td>
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
    const isDispose = (item.actionTaken || item.fileName || '').toLowerCase().includes('dispos');
    const type   = isDispose ? 'Disposal Record' : 'Quarantine Notice';
    let displayFileName = item.fileName || 'Report.pdf';
    if (isDispose && displayFileName.startsWith('Quarantine_Notice')) {
      displayFileName = displayFileName.replace('Quarantine_Notice', 'Disposal_Record');
    }

    return `
      <tr>
        <td style="padding: 8px 6px 8px 14px; font-size: 12px; color: var(--color-text-muted); white-space: nowrap;">${date}</td>
        <td style="padding: 8px 6px; font-weight: var(--font-weight-medium); font-size: 12px; word-break: break-all;">${displayFileName}</td>
        <td style="padding: 8px 6px; font-family: monospace; font-size: 11px; color: var(--color-text-muted); white-space: nowrap;">${item.batchNumber}</td>
        <td style="padding: 8px 6px; font-size: 12px; white-space: nowrap;">${type}</td>
        <td style="padding: 8px 14px 8px 6px; text-align: right; white-space: nowrap;">
          <button class="btn btn-icon btn-replay-defect-pdf" data-id="${item.id}" title="View / Save PDF" style="width: 28px; height: 28px;">
            <span class="icon" style="font-size: 18px;">download</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}
