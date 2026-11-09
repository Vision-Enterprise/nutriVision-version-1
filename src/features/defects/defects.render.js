/**
 * Defects Module — HTML Render Templates
 * Clean, standard MNAO layout for LGU returns and in-house kitchen spoilage.
 */

import { renderBatchCodeBadge } from '../batches/batches.render.js';

export function renderDefectsLayout() {
  return `
    <div class="page-header" style="display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-6); flex-wrap: wrap;">
      <div>
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <h1 class="page-header__title" style="margin: 0;">Defects &amp; Returns</h1>
          <button class="btn btn-ghost" id="btn-guide-defects" title="Module Guide" style="padding: 2px 8px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--color-border); border-radius: var(--radius-full);">
            <span class="icon" style="font-size: 14px;">help_outline</span>
            <span>Guide</span>
          </button>
        </div>
        <p class="page-header__subtitle" style="margin-top: 4px; margin-bottom: 0;">
          Track damaged commodities, manage official returns to LGU / Suppliers, and document in-house kitchen spoilage.
        </p>
      </div>

      <button id="btn-log-incident" class="btn btn-primary" style="display: flex; align-items: center; gap: var(--space-2); white-space: nowrap; flex-shrink: 0;">
        <span class="icon" style="font-size: 18px;">add</span>
        Report Defect / Return
      </button>
    </div>

    <!-- ── 4 KPI Summary Cards ─────────────────────────────────────────── -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-6);">
      <div class="stat-card" style="border-radius: var(--radius-lg); padding: var(--space-4) var(--space-5);">
        <div class="stat-card__label" style="display: flex; align-items: center; justify-content: space-between;">
          <span>Total Incidents</span>
          <span class="icon" style="font-size: 18px; color: var(--color-text-muted);">assignment</span>
        </div>
        <div class="stat-card__value" id="kpi-total-incidents" style="font-size: 26px; margin-top: 6px;">0</div>
        <div class="stat-card__footer">Logged defect events</div>
      </div>

      <div class="stat-card" style="border-radius: var(--radius-lg); padding: var(--space-4) var(--space-5);">
        <div class="stat-card__label" style="display: flex; align-items: center; justify-content: space-between;">
          <span>Returned to LGU</span>
          <span class="icon" style="font-size: 18px; color: #0284c7;">assignment_return</span>
        </div>
        <div class="stat-card__value" id="kpi-total-returned" style="font-size: 26px; margin-top: 6px; color: #0284c7;">0</div>
        <div class="stat-card__footer">Turned over for replacement / credit</div>
      </div>

      <div class="stat-card" style="border-radius: var(--radius-lg); padding: var(--space-4) var(--space-5);">
        <div class="stat-card__label" style="display: flex; align-items: center; justify-content: space-between;">
          <span>In-House Spoilage</span>
          <span class="icon" style="font-size: 18px; color: #d97706;">bakery_dining</span>
        </div>
        <div class="stat-card__value" id="kpi-total-spoiled" style="font-size: 26px; margin-top: 6px; color: #d97706;">0</div>
        <div class="stat-card__footer">Nutribun / kitchen condemnation</div>
      </div>

      <div class="stat-card" style="border-radius: var(--radius-lg); padding: var(--space-4) var(--space-5);">
        <div class="stat-card__label" style="display: flex; align-items: center; justify-content: space-between;">
          <span>Batches Affected</span>
          <span class="icon" style="font-size: 18px; color: var(--color-text-muted);">inventory_2</span>
        </div>
        <div class="stat-card__value" id="kpi-batches-affected" style="font-size: 26px; margin-top: 6px;">0</div>
        <div class="stat-card__footer">Distinct inventory batches</div>
      </div>
    </div>

    <!-- ── Incident & Turnover Records Card ────────────────────────────── -->
    <div class="card" style="padding: 0; overflow: hidden; margin-bottom: var(--space-6);">

      <div class="card-header" style="padding: var(--space-4) var(--space-6); margin-bottom: 0; border-bottom: 1px solid var(--color-border); display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <span class="icon" style="color: var(--color-primary); font-size: 20px;">receipt_long</span>
          <h2 class="card-title" style="margin: 0; font-size: 16px;">Defect &amp; Turnover Records</h2>
        </div>
        <!-- Search bar -->
        <div style="position: relative; min-width: 240px; max-width: 340px; flex: 1;">
          <span class="icon" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 16px; color: var(--color-text-muted); pointer-events: none;">search</span>
          <input
            type="text"
            id="defects-search-input"
            class="form-input"
            placeholder="Search batch, commodity, reporter..."
            style="padding-left: 32px; padding-top: 6px; padding-bottom: 6px; font-size: 13px; height: 34px;"
          >
        </div>
      </div>

      <!-- Filter Tabs -->
      <div style="padding: var(--space-3) var(--space-6); border-bottom: 1px solid var(--color-border); display: flex; gap: var(--space-2); flex-wrap: wrap; background: var(--color-surface-alt, #fafbfc);">
        <button class="defect-tab active" data-filter="all" style="
          padding: 5px 14px; border-radius: var(--radius-full);
          border: 1px solid var(--color-primary); background: var(--color-primary); color: #fff;
          font-size: var(--font-size-xs); font-weight: var(--font-weight-medium);
          cursor: pointer; transition: all var(--transition-md3);
        ">All Records</button>
        <button class="defect-tab" data-filter="Returned" style="
          padding: 5px 14px; border-radius: var(--radius-full);
          border: 1px solid var(--color-border); background: transparent; color: var(--color-text-muted);
          font-size: var(--font-size-xs); font-weight: var(--font-weight-medium);
          cursor: pointer; transition: all var(--transition-md3);
        ">Returned to LGU / Supplier</button>
        <button class="defect-tab" data-filter="Spoiled" style="
          padding: 5px 14px; border-radius: var(--radius-full);
          border: 1px solid var(--color-border); background: transparent; color: var(--color-text-muted);
          font-size: var(--font-size-xs); font-weight: var(--font-weight-medium);
          cursor: pointer; transition: all var(--transition-md3);
        ">In-House Spoilage</button>
        <button class="defect-tab" data-filter="Quarantined" style="
          padding: 5px 14px; border-radius: var(--radius-full);
          border: 1px solid var(--color-border); background: transparent; color: var(--color-text-muted);
          font-size: var(--font-size-xs); font-weight: var(--font-weight-medium);
          cursor: pointer; transition: all var(--transition-md3);
        ">On Hold / Quarantined</button>
        <button class="defect-tab" data-filter="Disposed" style="
          padding: 5px 14px; border-radius: var(--radius-full);
          border: 1px solid var(--color-border); background: transparent; color: var(--color-text-muted);
          font-size: var(--font-size-xs); font-weight: var(--font-weight-medium);
          cursor: pointer; transition: all var(--transition-md3);
        ">Disposed (Legacy)</button>
      </div>

      <div class="table-wrapper" style="border: none; box-shadow: none; border-radius: 0; overflow-x: auto; width: 100%;">
        <table class="table table-compact" style="width: 100%; table-layout: auto;">
          <thead>
            <tr>
              <th style="padding: 10px 8px 10px 16px; white-space: nowrap;">Date</th>
              <th style="padding: 10px 8px; white-space: nowrap;">Batch ID</th>
              <th style="padding: 10px 8px;">Commodity</th>
              <th style="padding: 10px 8px;">Defect Classification</th>
              <th style="padding: 10px 8px; white-space: nowrap;">Qty Affected</th>
              <th style="padding: 10px 8px; white-space: nowrap; text-align: center;">Action Taken</th>
              <th style="padding: 10px 8px; white-space: nowrap;">Reported By</th>
              <th style="padding: 10px 16px 10px 8px; text-align: right; white-space: nowrap;">Actions</th>
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
      <td colspan="8" style="text-align: center; color: var(--color-text-muted); padding: var(--space-10);">
        <span class="icon" style="font-size: 36px; display: block; margin-bottom: var(--space-2); opacity: 0.4;">assignment_return</span>
        No defect or return records found matching this view.
      </td>
    </tr>
  `;
}

export function renderIncidentRows(incidents = []) {
  if (!incidents.length) return renderIncidentEmptyState();

  return incidents.map(inc => {
    const date = new Date(inc.reported_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

    // Clean Action Taken Badges
    let badge = '';
    const act = inc.action_taken || '';

    if (act === 'Returned') {
      badge = `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; white-space: nowrap;"><span class="icon" style="font-size: 13px;">assignment_return</span> Returned to LGU</span>`;
    } else if (act === 'Spoiled') {
      badge = `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: #fef3c7; color: #b45309; border: 1px solid #fde68a; white-space: nowrap;"><span class="icon" style="font-size: 13px;">bakery_dining</span> In-House Spoilage</span>`;
    } else if (act === 'Disposed') {
      badge = `<span class="badge badge-expired" style="font-size: 11px; padding: 2px 7px; white-space: nowrap;">Disposed</span>`;
    } else {
      badge = `<span class="badge badge-near-expiry" style="font-size: 11px; padding: 2px 7px; white-space: nowrap;">On Hold</span>`;
    }

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
        restoreBtnHtml = `<button class="btn-table-action btn-restore-incident" data-id="${inc.id}" type="button" style="color: var(--color-primary);" title="Restore stock back to active inventory"><span class="icon icon--sm" style="font-size: 15px;">restore</span> Restore</button>`;
      }
    }

    // Merged Scope in Qty Affected
    const isEntire = inc.scope === 'entire_batch';
    const scopeSubtitle = isEntire
      ? `<span style="font-size: 10px; color: #dc2626; font-weight: 600; letter-spacing: 0.02em;">Entire Batch</span>`
      : `<span style="font-size: 10px; color: var(--color-text-muted);">Partial Batch</span>`;

    const viewBtnHtml = `<button class="btn-table-action btn-view-incident-pdf" data-id="${inc.id}" type="button" title="View / Print Official Turnover Slip or Spoilage Record"><span class="icon icon--sm" style="font-size: 15px;">description</span> View Slip</button>`;
    const actionHtml = `<div class="table-actions" style="justify-content: flex-end;">${viewBtnHtml}${restoreBtnHtml}</div>`;

    return `
      <tr>
        <td style="padding: 8px 8px 8px 16px; font-size: 12px; color: var(--color-text-muted); white-space: nowrap;">${date}</td>
        <td style="padding: 8px 8px; white-space: nowrap;">${renderBatchCodeBadge(inc.batches?.batch_number || '—')}</td>
        <td style="padding: 8px 8px; font-weight: var(--font-weight-medium); font-size: 12px;">${inc.batches?.commodities?.name || '—'}</td>
        <td style="padding: 8px 8px; font-size: 12px; color: var(--color-text);">${inc.classification}${photoBadge}</td>
        <td style="padding: 8px 8px; white-space: nowrap;">
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <span style="font-weight: var(--font-weight-bold); font-size: 12px;">${qtyStr}</span>
            ${scopeSubtitle}
          </div>
        </td>
        <td style="padding: 8px 8px; text-align: center; white-space: nowrap;">${badge}</td>
        <td style="padding: 8px 8px; font-size: 12px; color: var(--color-text-muted); white-space: nowrap;">${inc.reporter_name || '—'}</td>
        <td style="padding: 8px 16px 8px 8px; text-align: right; white-space: nowrap;">${actionHtml}</td>
      </tr>
    `;
  }).join('');
}
