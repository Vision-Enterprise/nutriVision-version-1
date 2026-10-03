/**
 * Inventory Advisor - View (Render)
 *
 * Pure HTML template builders for the Advisor page.
 * Returns cards, health summaries, and carousel markup.
 */

import { generateAdvisorSummary } from './advisor.service.js';

export function renderAdvisorLayout(data) {
  const summaryText = generateAdvisorSummary(data);

  const healthList = data.healthData.map(c => {
    let badgeHtml = '';
    if (c.criticalQty > 0) {
      badgeHtml = `<span class="badge-warning">${c.criticalQty.toLocaleString()} Critical</span>`;
    } else if (c.warningQty > 0) {
      badgeHtml = `<span class="badge-warning">${c.warningQty.toLocaleString()} Near Expiry</span>`;
    } else {
      badgeHtml = `<span class="badge-optimal">Optimal</span>`;
    }
    
    return `
      <div class="advisor-commodity-item">
        <div class="commodity-info">
          <span class="commodity-name">${c.name}</span>
          <span class="commodity-batches">${c.activeBatches} Active Batches</span>
        </div>
        <div class="commodity-stats">
          <span class="commodity-total">${c.totalQty.toLocaleString()} Units</span>
          ${badgeHtml}
        </div>
      </div>
    `;
  }).join('');

  const actionsList = data.suggestedActions.length > 0 ? data.suggestedActions.map(a => `
    <div class="advisor-action-card advisor-action-type-${a.type}">
      <div class="advisor-action-content">
        <h4>${a.title}</h4>
        <p>${a.desc}</p>
      </div>
      <button class="btn btn-ghost" onclick="window.location.hash='#/batches'">Act</button>
    </div>
  `).join('') : '<p style="color: var(--color-text-muted);">No urgent actions required.</p>';

  const expiringList = data.expiringSoon.length > 0 ? data.expiringSoon.map(e => `
    <div style="display: flex; justify-content: space-between; padding: var(--space-2) 0; border-bottom: 1px solid var(--color-border-light);">
      <div>
        <strong>${e.name}</strong> <span style="color: var(--color-text-muted); font-size: var(--text-sm);">(${e.batch})</span>
      </div>
      <div style="color: ${e.status === 'Expired' ? 'var(--color-danger)' : 'var(--color-warning)'}">
        ${e.date}
      </div>
    </div>
  `).join('') : '<p style="color: var(--color-text-muted);">No batches expiring within 90 days.</p>';

  return `
    <!-- AI Summary -->
    <div class="advisor-summary">
      ${summaryText}
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr)); gap: var(--space-4); margin-top: var(--space-4); align-items: start; width: 100%; min-width: 0;">
      <!-- Left Column -->
      <div style="display: flex; flex-direction: column; gap: var(--space-4); min-width: 0;">
        
        <!-- Inventory Health -->
        <div class="card" style="min-width: 0; overflow: hidden;">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
            <h3 class="card-title" style="display: flex; align-items: center; gap: var(--space-2); margin: 0;">
               Inventory by Commodity
            </h3>
            <button class="btn btn-outline btn-sm" onclick="window.location.hash='#/commodities'">View All</button>
          </div>
          <div class="card-body" style="padding: var(--space-2) var(--space-3); overflow-y: auto; max-height: 220px;">
            <div class="advisor-commodity-list">
              ${healthList}
            </div>
          </div>
        </div>

        <!-- Expiring Soon -->
        <div class="card" style="min-width: 0; overflow: hidden;">
          <div class="card-header"><h3 class="card-title">Expiring Soon (90 Days)</h3></div>
          <div class="card-body" style="padding: var(--space-2) var(--space-3); overflow-y: auto; max-height: 220px;">
            ${expiringList}
          </div>
        </div>

      </div>

      <!-- Right Column -->
      <div style="display: flex; flex-direction: column; gap: var(--space-4); min-width: 0;">
        
        <!-- Current Status -->
        <div class="card" style="min-width: 0; overflow: hidden;">
          <div class="card-header"><h3 class="card-title">Current Status</h3></div>
          <div class="card-body" style="padding: var(--space-2) var(--space-3); overflow-y: auto; max-height: 220px;">
            <div class="advisor-stat-row">
              <span class="advisor-stat-label">Total Active Items</span>
              <span class="advisor-stat-value">${data.totalActiveItems}</span>
            </div>
            <div class="advisor-stat-row">
              <span class="advisor-stat-label">Low Stock Alerts</span>
              <span class="advisor-stat-value" style="color: var(--color-warning);">${data.lowStockCount}</span>
            </div>
            <div class="advisor-stat-row">
              <span class="advisor-stat-label">Critical Expiring</span>
              <span class="advisor-stat-value" style="color: var(--color-danger);">${data.criticalExpiringCount}</span>
            </div>
            <div class="advisor-stat-row">
              <span class="advisor-stat-label">Upcoming Events (30d)</span>
              <span class="advisor-stat-value">${data.events.length}</span>
            </div>
            <div class="advisor-stat-row">
              <span class="advisor-stat-label">Last Audit Date</span>
              <span class="advisor-stat-value">${new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <!-- Suggested Actions -->
        <div class="card" style="min-width: 0; overflow: hidden;">
          <div class="card-header"><h3 class="card-title">Suggested Actions</h3></div>
          <div class="card-body" style="padding: var(--space-2) var(--space-3); overflow-y: auto; max-height: 220px;">
            ${actionsList}
          </div>
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
