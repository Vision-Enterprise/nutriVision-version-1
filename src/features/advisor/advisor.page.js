import { fetchAdvisorData, generateAdvisorSummary } from './advisor.service.js';

export async function renderAdvisorPage(profile) {
  const content = document.getElementById('page-content');
  if (!content) return;

  content.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Inventory Advisor</h1>
      <p style="color: var(--color-text-muted);">Action Center & Inventory Health Analysis</p>
    </div>
    
    <div class="loading-state" id="advisor-loading">
      <div class="spinner spinner-lg"></div>
      <p>Analyzing inventory health...</p>
    </div>
    
    <div id="advisor-content" style="display: none;"></div>
  `;

  // Insert link to CSS
  if (!document.getElementById('advisor-css')) {
    const link = document.createElement('link');
    link.id = 'advisor-css';
    link.rel = 'stylesheet';
    link.href = '/src/features/advisor/advisor.css';
    document.head.appendChild(link);
  }

  const { success, data, error } = await fetchAdvisorData();
  
  if (!success) {
    document.getElementById('advisor-loading').innerHTML = `
      <div class="alert alert-error">
        Failed to load advisor data: ${error}
      </div>
    `;
    return;
  }

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

  const actionsList = data.suggestedActions.length > 0 ? data.suggestedActions.map((a, i) => `
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

  const html = `
    <!-- AI Summary -->
    <div class="advisor-summary">
      ${summaryText}
    </div>

    <div class="advisor-grid">
      <!-- Left Column -->
      <div style="display: flex; flex-direction: column; gap: var(--space-4);">
        
        <!-- Inventory Health -->
        <div class="card">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
            <h3 class="card-title" style="display: flex; align-items: center; gap: var(--space-2); margin: 0;">
               Inventory by Commodity
            </h3>
            <button class="btn btn-outline btn-sm" onclick="window.location.hash='#/commodities'">View All</button>
          </div>
          <div class="card-body" style="padding-top: 0;">
            <div class="advisor-commodity-list" style="max-height: 400px; overflow-y: auto;">
              ${healthList}
            </div>
          </div>
        </div>

        <!-- Expiring Soon -->
        <div class="card">
          <div class="card-header"><h3 class="card-title">Expiring Soon (90 Days)</h3></div>
          <div class="card-body">
            ${expiringList}
          </div>
        </div>

      </div>

      <!-- Right Column -->
      <div style="display: flex; flex-direction: column; gap: var(--space-4);">
        
        <!-- Current Status -->
        <div class="card">
          <div class="card-header"><h3 class="card-title">Current Status</h3></div>
          <div class="card-body">
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
          <div class="card-body" style="padding: var(--space-3);">
            ${actionsList}
          </div>
        </div>

      </div>
    </div>
  `;

  document.getElementById('advisor-loading').style.display = 'none';
  const contentContainer = document.getElementById('advisor-content');
  contentContainer.innerHTML = html;
  contentContainer.style.display = 'block';
}
