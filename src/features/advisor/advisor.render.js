/**
 * Inventory Advisor - View (Render)
 *
 * Pure HTML template builders for the Advisor page.
 * Returns cards, health summaries, and carousel markup.
 */

import { generateAdvisorSummary } from './advisor.service.js';
import { formatDate, getDaysRemaining } from '../../shared/utils/date.utils.js';
import { renderBatchCodeBadge } from '../batches/batches.render.js';

function _esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderDrilldownContent(type, data) {
  const drilldown = data.drilldown || {};

  if (type === 'expired') {
    const items = drilldown.expired || [];
    if (items.length === 0) {
      return `
        <div class="advisor-drilldown-panel" style="background:#fff; border:1px solid #fee2e2; border-radius:8px; padding:16px;">
          <p style="margin:0; color:#15803d; font-weight:600; display:flex; align-items:center; gap:6px;">
            <span class="icon">check_circle</span> No expired batches found. All active inventory is within date!
          </p>
        </div>
      `;
    }
    return `
      <div class="advisor-drilldown-panel" style="background:#fff; border:1px solid #fecaca; border-radius:8px; padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="icon" style="color:#dc2626;">error</span>
            <strong style="color:#991b1b; font-size:14px;">Expired Batches (${items.length})</strong>
            <span style="font-size:12px; color:#64748b;">Click any batch to inspect in Batches module</span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.location.hash='#/batches'" style="background:#dc2626; border-color:#dc2626; font-size:12px; gap:4px; display:inline-flex; align-items:center;">
            <span class="icon" style="font-size:15px;">archive</span> Archive This Batch
          </button>
        </div>
        <div style="display:grid; gap:8px;">
          ${items.map(b => {
            const days = getDaysRemaining(b.expirationDate);
            return `
              <div 
                onclick="window.location.hash='#/batches?highlight=${encodeURIComponent(b.batchNumber)}'"
                style="display:flex; justify-content:space-between; align-items:center; background:#fef2f2; border:1px solid #fee2e2; border-radius:6px; padding:10px 14px; gap:12px; cursor:pointer; transition:all 0.15s ease;"
                onmouseover="this.style.background='#fee2e2'; this.style.borderColor='#fca5a5'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 2px 6px rgba(220,38,38,0.12)';"
                onmouseout="this.style.background='#fef2f2'; this.style.borderColor='#fee2e2'; this.style.transform='none'; this.style.boxShadow='none';"
                title="Click to view batch in Batches module"
              >
                <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                  <strong>${_esc(b.commodityName)}</strong>
                  ${renderBatchCodeBadge(b.batchNumber)}
                  <span style="font-size:12px; font-weight:600; color:#991b1b;">${b.quantity.toLocaleString()} ${_esc(b.unit)}</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                  <span style="font-size:12px; color:#64748b;">${formatDate(b.expirationDate)}</span>
                  <span class="badge" style="background:#fee2e2; color:#b91c1c; font-weight:600; font-size:11px; padding:2px 8px; border-radius:9999px;">${Math.abs(days)}d overdue</span>
                  <span class="icon" style="font-size:16px; color:#991b1b; opacity:0.8;">arrow_forward</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  if (type === 'near-expiry') {
    const items = drilldown.nearExpiry || [];
    if (items.length === 0) {
      return `
        <div class="advisor-drilldown-panel" style="background:#fff; border:1px solid #fef3c7; border-radius:8px; padding:16px;">
          <p style="margin:0; color:#15803d; font-weight:600; display:flex; align-items:center; gap:6px;">
            <span class="icon">check_circle</span> No batches nearing expiration within 90 days.
          </p>
        </div>
      `;
    }
    return `
      <div class="advisor-drilldown-panel" style="background:#fff; border:1px solid #fde68a; border-radius:8px; padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="icon" style="color:#d97706;">warning</span>
            <strong style="color:#92400e; font-size:14px;">Batches Nearing Expiry (${items.length})</strong>
            <span style="font-size:12px; color:#64748b;">Click any batch to inspect in Batches module</span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.location.hash='#/bulk-release'" style="background:#d97706; border-color:#d97706; font-size:12px; gap:4px; display:inline-flex; align-items:center;">
            <span class="icon" style="font-size:15px;">local_shipping</span> Dispatch Batches
          </button>
        </div>
        <div style="display:grid; gap:8px;">
          ${items.map(b => {
            const days = getDaysRemaining(b.expirationDate);
            return `
              <div 
                onclick="window.location.hash='#/batches?highlight=${encodeURIComponent(b.batchNumber)}'"
                style="display:flex; justify-content:space-between; align-items:center; background:#fffbeb; border:1px solid #fef3c7; border-radius:6px; padding:10px 14px; gap:12px; cursor:pointer; transition:all 0.15s ease;"
                onmouseover="this.style.background='#fef3c7'; this.style.borderColor='#fde68a'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 2px 6px rgba(217,119,6,0.12)';"
                onmouseout="this.style.background='#fffbeb'; this.style.borderColor='#fef3c7'; this.style.transform='none'; this.style.boxShadow='none';"
                title="Click to view batch in Batches module"
              >
                <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                  <strong>${_esc(b.commodityName)}</strong>
                  ${renderBatchCodeBadge(b.batchNumber)}
                  <span style="font-size:12px; font-weight:600; color:#92400e;">${b.quantity.toLocaleString()} ${_esc(b.unit)}</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                  <span style="font-size:12px; color:#64748b;">${formatDate(b.expirationDate)}</span>
                  <span class="badge" style="background:#fef3c7; color:#b45309; font-weight:600; font-size:11px; padding:2px 8px; border-radius:9999px;">in ${days}d</span>
                  <span class="icon" style="font-size:16px; color:#b45309; opacity:0.8;">arrow_forward</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  if (type === 'low-stock') {
    const items = drilldown.lowStock || [];
    if (items.length === 0) {
      return `
        <div class="advisor-drilldown-panel" style="background:#fff; border:1px solid #fed7aa; border-radius:8px; padding:16px;">
          <p style="margin:0; color:#15803d; font-weight:600; display:flex; align-items:center; gap:6px;">
            <span class="icon">check_circle</span> Stock levels are sufficient across all active commodities.
          </p>
        </div>
      `;
    }
    return `
      <div class="advisor-drilldown-panel" style="background:#fff; border:1px solid #fdba74; border-radius:8px; padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="icon" style="color:#ea580c;">inventory_2</span>
            <strong style="color:#9a3412; font-size:14px;">Commodity Low Stock Alerts (${items.length})</strong>
            <span style="font-size:12px; color:#64748b;">Replenishment or procurement requested</span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.location.hash='#/batches?action=add'" style="background:#ea580c; border-color:#ea580c; font-size:12px; gap:4px; display:inline-flex; align-items:center;">
            <span class="icon" style="font-size:15px;">add_box</span> Add Stocks
          </button>
        </div>
        <div style="display:grid; gap:8px;">
          ${items.map(c => `
            <div 
              onclick="window.location.hash='#/commodities'"
              style="display:flex; justify-content:space-between; align-items:center; background:#fff7ed; border:1px solid #ffedd5; border-radius:6px; padding:10px 14px; gap:12px; cursor:pointer; transition:all 0.15s ease;"
              onmouseover="this.style.background='#ffedd5'; this.style.borderColor='#fed7aa'; this.style.transform='translateY(-1px)';"
              onmouseout="this.style.background='#fff7ed'; this.style.borderColor='#ffedd5'; this.style.transform='none';"
              title="Click to manage commodities"
            >
              <div style="display:flex; align-items:center; gap:10px;">
                <strong>${_esc(c.name)}</strong>
                <span style="font-size:11px; background:#e2e8f0; color:#475569; padding:2px 6px; border-radius:4px;">${_esc(c.category)}</span>
              </div>
              <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                <strong style="font-size:13px; color:${c.totalQty === 0 ? '#dc2626' : '#ea580c'};">${c.totalQty.toLocaleString()} ${_esc(c.unit)}</strong>
                <span class="badge" style="background:${c.totalQty === 0 ? '#fee2e2' : '#ffedd5'}; color:${c.totalQty === 0 ? '#991b1b' : '#9a3412'}; font-size:11px; font-weight:600; padding:2px 7px; border-radius:9999px;">${_esc(c.status)}</span>
                <span class="icon" style="font-size:16px; color:#ea580c; opacity:0.8;">arrow_forward</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (type === 'events') {
    const items = drilldown.events || [];
    if (items.length === 0) {
      return `
        <div class="advisor-drilldown-panel" style="background:#fff; border:1px solid #e9d5ff; border-radius:8px; padding:16px;">
          <p style="margin:0; color:#64748b; font-weight:500; display:flex; align-items:center; gap:6px;">
            <span class="icon">event_busy</span> No program events scheduled in the next 30 days.
          </p>
        </div>
      `;
    }
    return `
      <div class="advisor-drilldown-panel" style="background:#fff; border:1px solid #d8b4fe; border-radius:8px; padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="icon" style="color:#9333ea;">event</span>
            <strong style="color:#6b21a8; font-size:14px;">Scheduled Program Events (${items.length})</strong>
            <span style="font-size:12px; color:#64748b;">Upcoming municipal nutrition events</span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.location.hash='#/calendar'" style="background:#9333ea; border-color:#9333ea; font-size:12px; gap:4px; display:inline-flex; align-items:center;">
            <span class="icon" style="font-size:15px;">calendar_month</span> View Calendar
          </button>
        </div>
        <div style="display:grid; gap:8px;">
          ${items.map(e => `
            <div 
              onclick="window.location.hash='#/calendar'"
              style="display:flex; justify-content:space-between; align-items:center; background:#faf5ff; border:1px solid #f3e8ff; border-radius:6px; padding:10px 14px; gap:12px; cursor:pointer; transition:all 0.15s ease;"
              onmouseover="this.style.background='#f3e8ff'; this.style.borderColor='#e9d5ff'; this.style.transform='translateY(-1px)';"
              onmouseout="this.style.background='#faf5ff'; this.style.borderColor='#f3e8ff'; this.style.transform='none';"
              title="Click to view event in Calendar"
            >
              <div>
                <strong style="font-size:13px; color:#1e293b;">${_esc(e.title)}</strong>
                <span style="font-size:11px; color:#64748b; margin-left:8px;">📍 ${_esc(e.location)}</span>
              </div>
              <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                <span style="font-size:12px; font-weight:600; color:#6b21a8;">${formatDate(e.startDate)}</span>
                <span class="icon" style="font-size:16px; color:#6b21a8; opacity:0.8;">arrow_forward</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  return '';
}

export function renderAdvisorSummaryCard(data, { isDashboard = false } = {}) {
  const criticalCount = data?.criticalExpiringCount ?? 0;
  const warningCount = data?.warningExpiringCount ?? 0;
  const lowStockCount = data?.lowStockCount ?? 0;
  const eventsCount = (data?.events || []).length;
  const totalBatches = data?.totalBatches ?? 0;

  return `
    <div class="card advisor-summary-card" style="margin-bottom: var(--space-6); padding: var(--space-4) var(--space-5); background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 5px solid #10b981; border-radius: var(--radius-lg); box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="icon" style="color: #059669; font-size: 22px;">fact_check</span>
          <span style="font-weight: 700; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #065f46;">Advisor Action Summary</span>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 11px; color: #047857; font-weight: 500; display: inline-flex; align-items: center; gap: 4px;">
            <span class="icon" style="font-size: 14px;">touch_app</span> Click any status chip to inspect details
          </span>
          ${isDashboard ? `
            <a href="#/advisor" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; text-decoration: none; background: #059669; border-color: #059669; font-weight: 600; padding: 0.5rem 1.15rem; font-size: 0.875rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
              <span class="icon" style="font-size: 18px;">insights</span>
              Advisor
            </a>
          ` : ''}
        </div>
      </div>

      <div style="font-size: 13.5px; color: #1e293b; line-height: 1.6; margin-bottom: 12px;">
        Currently managing <strong>${totalBatches} active commodity batches</strong>. Action required:
      </div>

      <!-- Color-Coded Interactive Chips -->
      <div class="advisor-chips-container" style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
        <button type="button" class="advisor-chip-btn advisor-chip--danger ${criticalCount === 0 ? 'advisor-chip--inactive' : ''}" data-drilldown="expired" title="Click to view expired batches">
          <span class="icon" style="font-size: 16px;">error</span>
          <span><strong>${criticalCount}</strong> Expired Batch${criticalCount === 1 ? '' : 'es'}</span>
          <span class="chip-arrow icon" style="font-size: 15px;">expand_more</span>
        </button>

        <button type="button" class="advisor-chip-btn advisor-chip--warning ${warningCount === 0 ? 'advisor-chip--inactive' : ''}" data-drilldown="near-expiry" title="Click to view batches nearing expiry">
          <span class="icon" style="font-size: 16px;">warning</span>
          <span><strong>${warningCount}</strong> Nearing Expiry (90d)</span>
          <span class="chip-arrow icon" style="font-size: 15px;">expand_more</span>
        </button>

        <button type="button" class="advisor-chip-btn advisor-chip--orange ${lowStockCount === 0 ? 'advisor-chip--inactive' : ''}" data-drilldown="low-stock" title="Click to view low stock commodities">
          <span class="icon" style="font-size: 16px;">inventory_2</span>
          <span><strong>${lowStockCount}</strong> Low Stock Alert${lowStockCount === 1 ? '' : 's'}</span>
          <span class="chip-arrow icon" style="font-size: 15px;">expand_more</span>
        </button>

        <button type="button" class="advisor-chip-btn advisor-chip--purple" data-drilldown="events" title="Click to view scheduled events">
          <span class="icon" style="font-size: 16px;">event</span>
          <span><strong>${eventsCount}</strong> Program Event${eventsCount === 1 ? '' : 's'} (30d)</span>
          <span class="chip-arrow icon" style="font-size: 15px;">expand_more</span>
        </button>
      </div>

      <!-- Expandable Drilldown Drawer Tray -->
      <div class="advisor-drilldown-tray" style="display: none; margin-top: 14px; padding-top: 14px; border-top: 1px dashed #86efac;">
        <div class="advisor-drilldown-content"></div>
      </div>
    </div>
  `;
}

export function setupAdvisorChips(containerEl, data) {
  if (!containerEl || !data) return;
  const chipButtons = containerEl.querySelectorAll('.advisor-chip-btn');
  const drilldownTray = containerEl.querySelector('.advisor-drilldown-tray');
  const drilldownContent = containerEl.querySelector('.advisor-drilldown-content');
  let currentActiveTarget = null;

  chipButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = btn.dataset.drilldown;
      if (currentActiveTarget === target) {
        chipButtons.forEach(b => b.classList.remove('active'));
        if (drilldownTray) drilldownTray.style.display = 'none';
        currentActiveTarget = null;
      } else {
        chipButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentActiveTarget = target;
        if (drilldownTray && drilldownContent) {
          drilldownContent.innerHTML = renderDrilldownContent(target, data);
          drilldownTray.style.display = 'block';
          drilldownTray.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    });
  });
}

export function renderAdvisorLayout(data) {
  const healthList = data.healthData.map(c => {
    let badgeHtml = '';
    const unit = _esc(c.unit || 'Units');
    if (c.criticalQty > 0) {
      badgeHtml = `<span class="badge" style="background: #fee2e2; color: #991b1b; font-weight: 600; padding: 2px 8px; font-size: 11px; border-radius: 9999px;">${c.criticalQty.toLocaleString()} ${unit} Expired</span>`;
    } else if (c.warningQty > 0) {
      badgeHtml = `<span class="badge" style="background: #fef3c7; color: #92400e; font-weight: 600; padding: 2px 8px; font-size: 11px; border-radius: 9999px;">${c.warningQty.toLocaleString()} ${unit} Near Expiry</span>`;
    } else {
      badgeHtml = `<span class="badge" style="background: #dcfce7; color: #15803d; font-weight: 600; padding: 2px 8px; font-size: 11px; border-radius: 9999px;">Optimal Stock</span>`;
    }
    
    return `
      <div 
        onclick="window.location.hash='#/commodities'"
        class="advisor-commodity-item" 
        style="display: flex; justify-content: space-between; align-items: center; padding: 10px 8px; border-bottom: 1px solid var(--color-border-light); cursor: pointer; border-radius: 6px; transition: all 0.15s ease;"
        onmouseover="this.style.backgroundColor='#f8fafc'; this.style.paddingLeft='12px';"
        onmouseout="this.style.backgroundColor='transparent'; this.style.paddingLeft='8px';"
        title="Click to view commodity details"
      >
        <div class="commodity-info" style="min-width: 0;">
          <div class="commodity-name" style="font-weight: 600; font-size: 13px; color: var(--color-text);">${_esc(c.name)}</div>
          <div class="commodity-batches" style="font-size: 11px; color: var(--color-text-muted);">${c.activeBatches} Active ${c.activeBatches === 1 ? 'Batch' : 'Batches'}</div>
        </div>
        <div class="commodity-stats" style="text-align: right; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 3px;">
          <span class="commodity-total" style="font-size: 13px; font-weight: 700; color: var(--color-text);">${c.totalQty.toLocaleString()} ${unit}</span>
          ${badgeHtml}
        </div>
      </div>
    `;
  }).join('');

  const expiringList = data.expiringSoon.length > 0 ? data.expiringSoon.map(e => {
    const isExpired = String(e.status).toLowerCase().includes('expire');
    const days = getDaysRemaining(e.date);
    const daysBadge = isExpired
      ? `<span class="badge" style="background: #fee2e2; color: #b91c1c; font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 9999px; white-space: nowrap;">${Math.abs(days)}d overdue</span>`
      : `<span class="badge" style="background: #fef3c7; color: #b45309; font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 9999px; white-space: nowrap;">in ${days}d</span>`;

    return `
      <div 
        onclick="window.location.hash='#/batches?highlight=${encodeURIComponent(e.batch)}'"
        style="display: flex; justify-content: space-between; align-items: center; padding: 10px 8px; border-bottom: 1px solid var(--color-border-light); gap: 12px; cursor: pointer; border-radius: 6px; transition: all 0.15s ease;"
        onmouseover="this.style.backgroundColor='#f8fafc'; this.style.paddingLeft='12px';"
        onmouseout="this.style.backgroundColor='transparent'; this.style.paddingLeft='8px';"
        title="Click to view batch in Batches module"
      >
        <div style="min-width: 0; flex: 1;">
          <div style="font-weight: 600; font-size: 13px; color: var(--color-text); margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${_esc(e.name)}
          </div>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            ${renderBatchCodeBadge(e.batch)}
            <span style="font-size: 11px; color: var(--color-text-muted); font-weight: 500;">${(e.quantity || 0).toLocaleString()} ${_esc(e.unit)}</span>
          </div>
        </div>
        <div style="text-align: right; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 3px;">
          <div style="font-size: 12px; font-weight: 600; color: var(--color-text); font-variant-numeric: tabular-nums; white-space: nowrap;">
            ${formatDate(e.date)}
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            ${daysBadge}
            <span class="icon" style="font-size: 15px; color: var(--color-text-muted);">arrow_forward</span>
          </div>
        </div>
      </div>
    `;
  }).join('') : '<p style="color: var(--color-text-muted); padding: var(--space-3) 0;">No batches expiring within 90 days.</p>';

  return `
    <!-- Top KPI Stat Cards (Streamlined Non-Redundant) -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-6);">
      <div class="stat-card">
        <div class="stat-card__label">Total Active Commodities</div>
        <div class="stat-card__value stat-card__value--primary">${data.totalActiveItems}</div>
        <div class="stat-card__footer">Commodity types registered in stock</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">Total Batches</div>
        <div class="stat-card__value">${data.totalBatches}</div>
        <div class="stat-card__footer">Active deliveries currently in stock</div>
      </div>
    </div>

    <!-- Enhanced Green Advisor Action Summary Card -->
    ${renderAdvisorSummaryCard(data, { isDashboard: false })}

    <!-- Health & Expiry Grid (2-Column Balanced Layout) -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: var(--space-4); margin-bottom: var(--space-6); align-items: stretch; width: 100%; min-width: 0;">
      <!-- Inventory Health -->
      <div class="card" style="min-width: 0; overflow: hidden; display: flex; flex-direction: column;">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3); padding-bottom: var(--space-3);">
          <h3 class="card-title" style="margin: 0;">Inventory by Commodity</h3>
          <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#/commodities'">View All</button>
        </div>
        <div class="card-body" style="overflow-y: auto; max-height: 280px; flex: 1;">
          <div class="advisor-commodity-list">
            ${healthList}
          </div>
        </div>
      </div>

      <!-- Expiring Soon -->
      <div class="card" style="min-width: 0; overflow: hidden; display: flex; flex-direction: column;">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3); padding-bottom: var(--space-3);">
          <h3 class="card-title" style="margin: 0;">Expiring Soon (90 Days)</h3>
          <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#/batches'">Batches</button>
        </div>
        <div class="card-body" style="overflow-y: auto; max-height: 280px; flex: 1;">
          ${expiringList}
        </div>
      </div>
    </div>
    
<!-- Interactive Analytics Console -->
    <div class="card tv-console-card" style="margin-top: var(--space-4); width: 100%; min-width: 0; overflow: hidden; padding: 0;">
      <!-- Screen Header -->
      <div style="padding: var(--space-4) var(--space-5); background: linear-gradient(135deg, #f0fdf4, #f8fafc); border-bottom: 1px solid var(--color-border-light);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-3);">
          <div style="flex: 1; min-width: 220px;">
            <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: 4px;">
              <span class="icon" style="color: var(--color-primary); font-size: 22px;">insights</span>
              <h3 id="tv-console-title" style="margin: 0; font-size: 1.25rem; color: var(--color-text-dark); font-weight: 700;">Where do supplies go?</h3>
            </div>
            <p id="tv-console-subtitle" style="font-size: var(--font-size-sm); color: var(--color-text-muted); margin: 0; line-height: 1.4;">
              See how many supplies each barangay received, broken down by product type
            </p>
          </div>
          <!-- Live Summary Pill & Download Slot -->
          <div style="display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap;">
            <div id="tv-console-ticker" style="background: white; padding: 8px 16px; border-radius: var(--radius-lg); font-size: 13px; color: var(--color-text); box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid var(--color-border-subtle); display: flex; gap: 18px; align-items: center; flex-wrap: wrap;">
              <span style="display: flex; align-items: center; gap: 6px;">
                <span class="icon icon--sm" style="color: var(--color-primary);">summarize</span>
                <span style="color:#64748b;">Total:</span> <strong id="tv-ticker-total">...</strong>
              </span>
              <span style="display: flex; align-items: center; gap: 6px;">
                <span class="icon icon--sm" style="color: #f59e0b;">star</span>
                <span style="color:#64748b;">Top:</span> <strong id="tv-ticker-top">...</strong>
              </span>
            </div>
            <div id="tv-chart-toolbar-slot"></div>
          </div>
        </div>
      </div>

      <!-- Spoon-Fed Takeaway Banner -->
      <div id="tv-console-insight-card" style="margin: var(--space-3) var(--space-5) 0 var(--space-5); padding: 10px 16px; background: #ecfdf5; border-left: 4px solid var(--color-primary); border-radius: var(--radius-md); font-size: 13px; color: #065f46; display: flex; align-items: center; gap: 10px; line-height: 1.5; border: 1px solid #d1fae5; border-left-width: 4px;">
        <span class="icon" style="font-size: 20px; color: var(--color-primary); flex-shrink: 0;">lightbulb</span>
        <div id="tv-console-insight-text">Analyzing report details...</div>
      </div>

      <!-- Chart Display -->
      <div style="padding: var(--space-3) var(--space-5) var(--space-4) var(--space-5); background: white;">
        <div id="tv-console-chart" style="min-height: 400px; width: 100%;"></div>
      </div>
      
      <!-- Control Deck -->
      <div style="padding: var(--space-4) var(--space-5); background-color: #f8fafc; border-top: 1px solid var(--color-border-light);">
        
        <!-- Section: Report Selector (Channels) -->
        <div style="margin-bottom: var(--space-4);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2);">
            <p style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px; margin: 0;">Choose a Report</p>
            <span style="font-size: 12px; color: var(--color-text-muted);">Click to switch chart</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-2);" id="tv-channel-controls">
            <button class="btn tv-channel-btn btn-primary" data-channel="barangay" style="padding: 10px 14px; font-size: 13px; text-align: left; display: flex; align-items: center; gap: 10px; border-radius: var(--radius-md);">
              <span class="icon" style="font-size: 22px;">location_on</span>
              <span>
                <strong style="display: block; font-size: 13px;">By Barangay</strong>
                <span style="font-size: 11px; opacity: 0.85; font-weight: 400;">Supplies received per area</span>
              </span>
            </button>
            <button class="btn tv-channel-btn btn-outline" data-channel="stock" style="padding: 10px 14px; font-size: 13px; text-align: left; display: flex; align-items: center; gap: 10px; border-radius: var(--radius-md);">
              <span class="icon" style="font-size: 22px;">inventory_2</span>
              <span>
                <strong style="display: block; font-size: 13px;">Stock Status</strong>
                <span style="font-size: 11px; opacity: 0.75; font-weight: 400;">In-stock vs given out</span>
              </span>
            </button>
            <button class="btn tv-channel-btn btn-outline" data-channel="velocity" style="padding: 10px 14px; font-size: 13px; text-align: left; display: flex; align-items: center; gap: 10px; border-radius: var(--radius-md);">
              <span class="icon" style="font-size: 22px;">show_chart</span>
              <span>
                <strong style="display: block; font-size: 13px;">Release History</strong>
                <span style="font-size: 11px; opacity: 0.75; font-weight: 400;">Timeline & release trends</span>
              </span>
            </button>
            <button class="btn tv-channel-btn btn-outline" data-channel="expiry" style="padding: 10px 14px; font-size: 13px; text-align: left; display: flex; align-items: center; gap: 10px; border-radius: var(--radius-md);">
              <span class="icon" style="font-size: 22px;">schedule</span>
              <span>
                <strong style="display: block; font-size: 13px;">Expiry Check</strong>
                <span style="font-size: 11px; opacity: 0.75; font-weight: 400;">Shelf-life & risk status</span>
              </span>
            </button>
          </div>
        </div>

        <!-- Section: Filters & Customization -->
        <div>
          <p style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px; margin: 0 0 var(--space-2) 0;">Filters & Customization</p>
          <div style="display: flex; gap: var(--space-3); align-items: center; flex-wrap: wrap;">
            
            <!-- Year Tuner -->
            <div id="tv-tuner-year-wrap" style="display: flex; align-items: center; gap: 8px; background: white; padding: 6px 12px; border-radius: var(--radius-md); border: 1px solid var(--color-border-subtle); box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
              <span class="icon icon--sm" style="color: #64748b;">calendar_today</span>
              <label for="tv-tuner-year" style="font-size: 12px; color: #64748b; margin: 0; font-weight: 500;">Year:</label>
              <select id="tv-tuner-year" class="form-input" style="padding: 2px 4px; min-height: auto; font-size: 13px; border: none; background: transparent; font-weight: 600; cursor: pointer;">
                <option value="all">All Years</option>
                <option value="2026" selected>2026</option>
                <option value="2025">2025</option>
              </select>
            </div>

            <!-- Quarter / Period Tuner -->
            <div id="tv-tuner-period-wrap" style="display: flex; align-items: center; gap: 8px; background: white; padding: 6px 12px; border-radius: var(--radius-md); border: 1px solid var(--color-border-subtle); box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
              <span class="icon icon--sm" style="color: #64748b;">date_range</span>
              <label for="tv-tuner-period" style="font-size: 12px; color: #64748b; margin: 0; font-weight: 500;">Period:</label>
              <select id="tv-tuner-period" class="form-input" style="padding: 2px 4px; min-height: auto; font-size: 13px; border: none; background: transparent; font-weight: 600; cursor: pointer;">
                <option value="all" selected>Full Year</option>
                <option value="q1">Q1 (Jan – Mar)</option>
                <option value="q2">Q2 (Apr – Jun)</option>
                <option value="q3">Q3 (Jul – Sep)</option>
                <option value="q4">Q4 (Oct – Dec)</option>
              </select>
            </div>

            <!-- Granularity (Release History only: daily, weekly, monthly, yearly) -->
            <div id="tv-tuner-granularity-wrap" style="display: none; align-items: center; gap: 8px; background: white; padding: 6px 12px; border-radius: var(--radius-md); border: 1px solid var(--color-border-subtle); box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
              <span class="icon icon--sm" style="color: #64748b;">tune</span>
              <label for="tv-tuner-granularity" style="font-size: 12px; color: #64748b; margin: 0; font-weight: 500;">Interval:</label>
              <select id="tv-tuner-granularity" class="form-input" style="padding: 2px 4px; min-height: auto; font-size: 13px; border: none; background: transparent; font-weight: 600; cursor: pointer;">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly" selected>Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <!-- Commodity / Product Filter (Applies across all charts) -->
            <div id="tv-tuner-commodity-wrap" style="display: flex; align-items: center; gap: 8px; background: white; padding: 6px 12px; border-radius: var(--radius-md); border: 1px solid var(--color-border-subtle); box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
              <span class="icon icon--sm" style="color: #64748b;">category</span>
              <label for="tv-tuner-commodity" style="font-size: 12px; color: #64748b; margin: 0; font-weight: 500;">Product:</label>
              <select id="tv-tuner-commodity" class="form-input" style="padding: 2px 4px; min-height: auto; font-size: 13px; border: none; background: transparent; font-weight: 600; cursor: pointer; max-width: 180px;">
                <option value="all" selected>All Products</option>
              </select>
            </div>

            <!-- Limit / Count Filter (for Barangay) -->
            <div id="tv-tuner-limit-wrap" style="display: flex; align-items: center; gap: 8px; background: white; padding: 6px 12px; border-radius: var(--radius-md); border: 1px solid var(--color-border-subtle); box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
              <span class="icon icon--sm" style="color: #64748b;">format_list_numbered</span>
              <label for="tv-tuner-limit" style="font-size: 12px; color: #64748b; margin: 0; font-weight: 500;">Show:</label>
              <select id="tv-tuner-limit" class="form-input" style="padding: 2px 4px; min-height: auto; font-size: 13px; border: none; background: transparent; font-weight: 600; cursor: pointer;">
                <option value="5">Top 5</option>
                <option value="10" selected>Top 10</option>
                <option value="15">Top 15</option>
                <option value="all">All Barangays</option>
              </select>
            </div>

            <!-- Stock Sort Tuner (for Stock Status) -->
            <div id="tv-tuner-stock-sort-wrap" style="display: none; align-items: center; gap: 8px; background: white; padding: 6px 12px; border-radius: var(--radius-md); border: 1px solid var(--color-border-subtle); box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
              <span class="icon icon--sm" style="color: #64748b;">sort</span>
              <label for="tv-tuner-stock-sort" style="font-size: 12px; color: #64748b; margin: 0; font-weight: 500;">Sort by:</label>
              <select id="tv-tuner-stock-sort" class="form-input" style="padding: 2px 4px; min-height: auto; font-size: 13px; border: none; background: transparent; font-weight: 600; cursor: pointer;">
                <option value="lowest" selected>Lowest Stock (Restock Alert)</option>
                <option value="highest">Highest Stock</option>
                <option value="distributed">Most Distributed</option>
              </select>
            </div>

            <!-- Expiry Note Pill -->
            <div id="tv-tuner-expiry-note" style="display: none; align-items: center; gap: 6px; background: #e0f2fe; color: #0369a1; padding: 6px 12px; border-radius: var(--radius-md); font-size: 12px; font-weight: 500; border: 1px solid #bae6fd;">
              <span class="icon icon--sm">info</span>
              <span>Live assessment of current inventory in warehouse</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  `;
}
