/**
 * Defects & Returns Module — HTML Render Templates
 * Clean, standard SaaS log sheet: Quarantined, Returned, Disposed.
 */

import { renderBatchCodeBadge } from '../batches/batches.render.js';

export function renderDefectsLayout() {
  return `
    <div class="page-header" style="display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-6); flex-wrap: wrap;">
      <div>
        <h1 class="page-header__title" style="margin: 0;">Defects &amp; Returns</h1>
        <p class="page-header__subtitle" style="margin-top: 4px; margin-bottom: 0;">
          Log sheet for quarantined stock under review, supplier returns, and condemned inventory disposals.
        </p>
      </div>

      <button id="btn-log-incident" class="btn btn-primary" style="display: flex; align-items: center; gap: var(--space-2); white-space: nowrap; flex-shrink: 0;">
        <span class="icon" style="font-size: 18px;">add</span>
        Log Stock Event
      </button>
    </div>

    <!-- ── 3 KPI Cards: Quarantine, Return, Disposed (Dashboard Shape: 28px 0 28px 0) ── -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-6);">
      <!-- 1. Quarantined -->
      <div class="stat-card">
        <div class="stat-card__label" style="display: flex; align-items: center; justify-content: space-between;">
          <span>Quarantined</span>
          <span class="icon" style="font-size: 18px; color: #d97706;">visibility</span>
        </div>
        <div class="stat-card__value" id="kpi-quarantined" style="color: #d97706;">0</div>
        <div class="stat-card__footer">Units under active observation</div>
      </div>

      <!-- 2. Returned -->
      <div class="stat-card">
        <div class="stat-card__label" style="display: flex; align-items: center; justify-content: space-between;">
          <span>Returned</span>
          <span class="icon" style="font-size: 18px; color: #0284c7;">assignment_return</span>
        </div>
        <div class="stat-card__value" id="kpi-returned" style="color: #0284c7;">0</div>
        <div class="stat-card__footer">Units returned to supplier / source</div>
      </div>

      <!-- 3. Disposed -->
      <div class="stat-card">
        <div class="stat-card__label" style="display: flex; align-items: center; justify-content: space-between;">
          <span>Disposed</span>
          <span class="icon" style="font-size: 18px; color: #dc2626;">delete_outline</span>
        </div>
        <div class="stat-card__value" id="kpi-disposed" style="color: #dc2626;">0</div>
        <div class="stat-card__footer">Units condemned / written off</div>
      </div>
    </div>

    <!-- ── Log Sheet Card ──────────────────────────────────────────────── -->
    <div class="card" style="padding: 0; overflow: hidden; margin-bottom: var(--space-6);">

      <div class="card-header" style="padding: var(--space-4) var(--space-6); margin-bottom: 0; border-bottom: 1px solid var(--color-border); display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); flex-wrap: wrap;">
        <!-- 3 Filter Tabs: Quarantined, Returned, Disposed -->
        <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
          <button class="defect-tab active" data-filter="Quarantined" style="
            padding: 6px 16px; border-radius: var(--radius-full);
            border: 1px solid var(--color-primary); background: var(--color-primary); color: #fff;
            font-size: var(--font-size-xs); font-weight: var(--font-weight-medium);
            cursor: pointer; transition: all var(--transition-md3);
          ">Quarantined</button>
          <button class="defect-tab" data-filter="Returned" style="
            padding: 6px 16px; border-radius: var(--radius-full);
            border: 1px solid var(--color-border); background: transparent; color: var(--color-text-muted);
            font-size: var(--font-size-xs); font-weight: var(--font-weight-medium);
            cursor: pointer; transition: all var(--transition-md3);
          ">Returned</button>
          <button class="defect-tab" data-filter="Disposed" style="
            padding: 6px 16px; border-radius: var(--radius-full);
            border: 1px solid var(--color-border); background: transparent; color: var(--color-text-muted);
            font-size: var(--font-size-xs); font-weight: var(--font-weight-medium);
            cursor: pointer; transition: all var(--transition-md3);
          ">Disposed</button>
        </div>

        <!-- Search bar -->
        <div style="position: relative; min-width: 240px; max-width: 340px; flex: 1;">
          <span class="icon" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 16px; color: var(--color-text-muted); pointer-events: none;">search</span>
          <input
            type="text"
            id="defects-search-input"
            class="form-input"
            placeholder="Search batch, commodity, reason..."
            style="padding-left: 32px; padding-top: 6px; padding-bottom: 6px; font-size: 13px; height: 34px;"
          >
        </div>
      </div>

      <div class="table-wrapper" style="border: none; box-shadow: none; border-radius: 0; overflow-x: auto; width: 100%;">
        <table class="table table-compact" style="width: 100%; table-layout: auto;">
          <thead>
            <tr>
              <th style="padding: 10px 8px 10px 16px; white-space: nowrap;">Date</th>
              <th style="padding: 10px 8px; white-space: nowrap;">Batch ID</th>
              <th style="padding: 10px 8px;">Commodity</th>
              <th style="padding: 10px 8px; white-space: nowrap;">Quantity</th>
              <th style="padding: 10px 8px;">Reason / Classification</th>
              <th style="padding: 10px 8px;">Remarks / Log Details</th>
              <th style="padding: 10px 8px; white-space: nowrap;">Handled By</th>
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
        <span class="icon" style="font-size: 36px; display: block; margin-bottom: var(--space-2); opacity: 0.4;">inventory_2</span>
        No records found matching this category.
      </td>
    </tr>
  `;
}

export function renderIncidentRows(incidents = [], currentFilter = 'Quarantined') {
  if (!incidents.length) return renderIncidentEmptyState();

  return incidents.map(inc => {
    const date = new Date(inc.reported_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    const unit = inc.batches?.commodities?.unit || '';

    let qtyDisplay = '';
    let actionButtons = '';

    if (currentFilter === 'Quarantined') {
      const remaining = inc.remaining_quarantined !== null ? inc.remaining_quarantined : inc.quantity_affected;
      const initial   = inc.quantity_affected;

      const qtySub = remaining < initial
        ? `<span style="font-size: 10px; color: var(--color-text-muted);">${remaining} of ${initial} remaining</span>`
        : `<span style="font-size: 10px; color: #d97706; font-weight: 500;">Active Hold</span>`;

      qtyDisplay = `
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <span style="font-weight: var(--font-weight-bold); font-size: 13px; color: #d97706;">${remaining} ${unit}</span>
          ${qtySub}
        </div>
      `;

      actionButtons = `
        <button class="btn-table-action btn-resolve-quarantine" data-id="${inc.id}" type="button" style="color: var(--color-primary); font-weight: 600;" title="Resolve quarantined stock (Restore, Return, or Dispose)">
          <span class="icon icon--sm" style="font-size: 15px;">tune</span> Resolve
        </button>
      `;
    } else {
      const color = currentFilter === 'Returned' ? '#0284c7' : '#dc2626';
      qtyDisplay = `<span style="font-weight: var(--font-weight-bold); font-size: 13px; color: ${color};">${inc.quantity_affected} ${unit}</span>`;
      actionButtons = `<span style="color: var(--color-text-subtle); font-size: 11px;">Recorded</span>`;
    }

    return `
      <tr>
        <td style="padding: 8px 8px 8px 16px; font-size: 12px; color: var(--color-text-muted); white-space: nowrap;">${date}</td>
        <td style="padding: 8px 8px; white-space: nowrap;">${renderBatchCodeBadge(inc.batches?.batch_number || '—')}</td>
        <td style="padding: 8px 8px; font-weight: var(--font-weight-medium); font-size: 12px;">${inc.batches?.commodities?.name || '—'}</td>
        <td style="padding: 8px 8px; white-space: nowrap;">${qtyDisplay}</td>
        <td style="padding: 8px 8px; font-size: 12px; color: var(--color-text);">${inc.classification || 'Inspection'}</td>
        <td style="padding: 8px 8px; font-size: 12px; color: var(--color-text-muted); max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${inc.display_remarks || ''}">
          ${inc.display_remarks || '—'}
        </td>
        <td style="padding: 8px 8px; font-size: 12px; color: var(--color-text-muted); white-space: nowrap;">${inc.reporter_name || '—'}</td>
        <td style="padding: 8px 16px 8px 8px; text-align: right; white-space: nowrap;">
          <div class="table-actions" style="justify-content: flex-end;">${actionButtons}</div>
        </td>
      </tr>
    `;
  }).join('');
}
