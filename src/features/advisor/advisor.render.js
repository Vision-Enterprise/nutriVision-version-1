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

    <div class="grid grid-2" style="gap: var(--space-3); margin-top: var(--space-3); align-items: start; max-width: 100%;">
      <!-- Left Column -->
      <div style="display: flex; flex-direction: column; gap: var(--space-3); min-width: 0;">
        
        <!-- Inventory Health -->
        <div class="card">
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
        <div class="card">
          <div class="card-header"><h3 class="card-title">Expiring Soon (90 Days)</h3></div>
          <div class="card-body" style="padding: var(--space-2) var(--space-3); overflow-y: auto; max-height: 220px;">
            ${expiringList}
          </div>
        </div>

      </div>

      <!-- Right Column -->
      <div style="display: flex; flex-direction: column; gap: var(--space-3); min-width: 0;">
        
        <!-- Current Status -->
        <div class="card">
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
        <div class="card">
          <div class="card-header"><h3 class="card-title">Suggested Actions</h3></div>
          <div class="card-body" style="padding: var(--space-2) var(--space-3); overflow-y: auto; max-height: 220px;">
            ${actionsList}
          </div>
        </div>

      </div>
    </div>
    
    <!-- Analytics Carousel -->
    <div class="card" style="margin-top: var(--space-4);">
      <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: none;">
        <h3 class="card-title" style="margin: 0;">Analytics & Trends</h3>
        <div style="display: flex; gap: var(--space-2);">
          <button id="adv-carousel-prev" class="btn btn-outline" style="padding: 4px 8px; min-height: auto;">
            <span class="icon">chevron_left</span>
          </button>
          <button id="adv-carousel-next" class="btn btn-outline" style="padding: 4px 8px; min-height: auto;">
            <span class="icon">chevron_right</span>
          </button>
        </div>
      </div>
      <div class="card-body" style="overflow: hidden; padding: 0; max-width: 100%;">
        <div id="adv-carousel-track" style="display: flex; transition: transform 0.4s ease;">
          
          <!-- Slide 1 -->
          <div style="min-width: 100%; padding: var(--space-4);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
              <h4 style="margin: 0; font-size: 1.1rem; color: var(--color-text);">Releases Over Time</h4>
              <select id="adv-chart-releases-toggle" class="form-input" style="width: auto; padding: 4px 8px; min-height: auto;">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly" selected>Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div style="position: relative; height: 220px; width: 100%;">
              <canvas id="adv-chart-releases"></canvas>
            </div>
          </div>
          
          <!-- Slide 2 -->
          <div style="min-width: 100%; padding: var(--space-4);">
            <h4 style="margin-bottom: var(--space-4); margin-top: 0; font-size: 1.1rem; color: var(--color-text);">Stock per Commodity</h4>
            <div style="position: relative; height: 220px; width: 100%;">
              <canvas id="adv-chart-stock"></canvas>
            </div>
          </div>
          
          <!-- Slide 3 -->
          <div style="min-width: 100%; padding: var(--space-4);">
            <h4 style="margin-bottom: var(--space-4); margin-top: 0; font-size: 1.1rem; color: var(--color-text);">Distribution by Barangay</h4>
            <div style="position: relative; height: 220px; width: 100%;">
              <canvas id="adv-chart-barangay"></canvas>
            </div>
          </div>
          
          <!-- Slide 4 -->
          <div style="min-width: 100%; padding: var(--space-4);">
            <h4 style="margin-bottom: var(--space-4); margin-top: 0; font-size: 1.1rem; color: var(--color-text);">Expiration Status</h4>
            <div style="position: relative; height: 220px; width: 100%; display: flex; justify-content: center;">
              <canvas id="adv-chart-expiry"></canvas>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  `;
}
