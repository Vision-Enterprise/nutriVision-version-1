/**
 * Defects Module — HTML Render Templates
 * Uses system CSS classes exclusively.
 */

import { renderBatchCodeBadge } from '../batches/batches.render.js';

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

    const hasPhoto = Boolean(inc.evidence_url);
    const photoBadge = hasPhoto
      ? `<span title="Photographic evidence attached" style="display: inline-flex; align-items: center; gap: 2px; margin-left: 6px; font-size: 11px; color: var(--color-primary); vertical-align: middle;"><span class="icon" style="font-size: 14px;">photo_camera</span></span>`
      : '';

    let qtyStr = `${inc.quantity_affected} ${inc.batches?.commodities?.unit || ''}`;
    let restoreBtnHtml = '';

    if (inc.action_taken === 'Quarantined') {
      const remaining = inc.remaining_quarantined !== null ? inc.remaining_quarantined : inc.quantity_affected;
      qtyStr = `${remaining} ${inc.batches?.commodities?.unit || ''}`;

      if (remaining > 0) {
        restoreBtnHtml = `<button class="btn-table-action btn-restore-incident" data-id="${inc.id}" type="button"><span class="icon icon--sm" style="font-size: 15px;">restore</span> Restore</button>`;
      }
    }

    const viewBtnHtml = `<button class="btn-table-action btn-view-incident-pdf" data-id="${inc.id}" type="button" title="View / Print Official Report &amp; Evidence"><span class="icon icon--sm" style="font-size: 15px;">visibility</span> View Report</button>`;
    const actionHtml = `<div class="table-actions" style="justify-content: flex-end;">${viewBtnHtml}${restoreBtnHtml}</div>`;

    return `
      <tr>
        <td style="padding: 8px 6px 8px 14px; font-size: 12px; color: var(--color-text-muted); white-space: nowrap;">${date}</td>
        <td style="padding: 8px 6px; white-space: nowrap;">${renderBatchCodeBadge(inc.batches?.batch_number || '—')}</td>
        <td style="padding: 8px 6px; font-weight: var(--font-weight-medium); font-size: 12px;">${inc.batches?.commodities?.name || '—'}</td>
        <td style="padding: 8px 6px; font-size: 12px; color: var(--color-text-muted);">${inc.classification}${photoBadge}</td>
        <td style="padding: 8px 6px; text-align: center; white-space: nowrap;">${scopeBadge}</td>
        <td style="padding: 8px 6px; white-space: nowrap; font-weight: var(--font-weight-medium); font-size: 12px;">${qtyStr}</td>
        <td style="padding: 8px 6px; text-align: center; white-space: nowrap;">${badge}</td>
        <td style="padding: 8px 6px; font-size: 12px; color: var(--color-text-muted); white-space: nowrap;">${inc.reporter_name || '—'}</td>
        <td style="padding: 8px 14px 8px 6px; text-align: right; white-space: nowrap;">${actionHtml}</td>
      </tr>
    `;
  }).join('');
}
