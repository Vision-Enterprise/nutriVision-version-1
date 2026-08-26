/**
 * Dashboard Page
 * Full implementation: Phase 4
 */

import { fetchDashboardStats, fetchRecentActivity, fetchChartData } from './dashboard.service.js';
import { formatDateTime } from '../../shared/utils/date.utils.js';
import { EXPIRATION_STATUS } from '../../shared/constants/app.constants.js';
import Chart from 'chart.js/auto';

// Keep track of chart instances to destroy them when re-rendering or updating
let _chartInstances = {};
let _chartData = null; // Store raw data for toggle

export async function renderDashboardPage(profile) {
  const content = document.getElementById('page-content');
  if (!content) return;

  // Render initial loading state
  content.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Dashboard</h1>
      <p class="page-header__subtitle">
        Overview of nutrition commodity inventory status
      </p>
    </div>
    <div class="loading-overlay">
      <div class="spinner spinner-lg"></div>
    </div>
  `;

  // Fetch all data
  const [stats, activity, chartData] = await Promise.all([
    fetchDashboardStats(),
    fetchRecentActivity(5),
    fetchChartData()
  ]);

  // Handle errors
  if (stats.error || activity.error || chartData.error) {
    content.innerHTML = `
      <div class="page-header">
        <h1 class="page-header__title">Dashboard</h1>
      </div>
      <div class="alert alert-error">
        <span>Failed to load dashboard data. Please try again.</span>
      </div>
    `;
    return;
  }

  _chartData = chartData;

  // Render Dashboard Structure
  content.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Dashboard</h1>
      <p class="page-header__subtitle">
        Overview of nutrition commodity inventory status
      </p>
    </div>

    <!-- Top Stat Cards -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-6);">
      <div class="stat-card">
        <div class="stat-card__label">Total Commodities</div>
        <div class="stat-card__value stat-card__value--primary">${stats.totalCommodities}</div>
        <div class="stat-card__footer">Registered commodity types</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">Total Batches</div>
        <div class="stat-card__value">${stats.totalBatches}</div>
        <div class="stat-card__footer">Active deliveries in stock</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">Near Expiry</div>
        <div class="stat-card__value stat-card__value--warning">${stats.nearExpiryBatches}</div>
        <div class="stat-card__footer">Expiring within 3 months</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">Expired</div>
        <div class="stat-card__value stat-card__value--danger">${stats.expiredBatches}</div>
        <div class="stat-card__footer">Requires proper disposal</div>
      </div>
    </div>

    <!-- Charts Section -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: var(--space-6); margin-bottom: var(--space-6);">
      
      <!-- Releases Over Time -->
      <div class="card" style="padding: var(--space-4);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
          <h2 class="card-title" style="margin:0;">Releases Over Time</h2>
          <select id="chart-releases-toggle" class="form-input" style="width: auto; padding: 4px 8px; min-height: auto;">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly" selected>Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div style="position: relative; height: 300px; width: 100%;">
          <canvas id="chart-releases"></canvas>
        </div>
      </div>

      <!-- Current Stock per Commodity -->
      <div class="card" style="padding: var(--space-4);">
        <h2 class="card-title" style="margin-bottom: var(--space-4);">Stock per Commodity</h2>
        <div style="position: relative; height: 300px; width: 100%;">
          <canvas id="chart-stock"></canvas>
        </div>
      </div>

      <!-- Distribution by Barangay -->
      <div class="card" style="padding: var(--space-4);">
        <h2 class="card-title" style="margin-bottom: var(--space-4);">Distribution by Barangay</h2>
        <div style="position: relative; height: 300px; width: 100%;">
          <canvas id="chart-barangay"></canvas>
        </div>
      </div>

      <!-- Expiry Status (Replacing the old table) -->
      <div class="card" style="padding: var(--space-4);">
        <h2 class="card-title" style="margin-bottom: var(--space-4);">Expiration Status</h2>
        <div style="position: relative; height: 300px; width: 100%; display: flex; justify-content: center;">
          <canvas id="chart-expiry"></canvas>
        </div>
      </div>

    </div>

    <!-- Recent Activity -->
    <div class="card">
      <div class="card-header" style="margin-bottom: var(--space-4); padding-bottom: 0; border: none;">
        <h2 class="card-title">Recent Activity</h2>
      </div>
      ${activity.logs.length === 0 ? `
        <div style="text-align: center; padding: var(--space-8) 0; color: var(--color-text-muted);">
          No recent activity to display.
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: var(--space-3);">
          ${activity.logs.map(log => `
            <div style="display: flex; align-items: flex-start; gap: var(--space-3); padding-bottom: var(--space-3); border-bottom: 1px solid var(--color-border);">
              <div style="flex-shrink: 0; margin-top: 2px;">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-primary);">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div style="flex: 1; min-width: 0;">
                <p style="font-size: var(--font-size-sm); color: var(--color-text); margin-bottom: 2px;">
                  <span style="font-weight: var(--font-weight-medium);">${log.profiles?.full_name || 'System'}</span> 
                  performed <span style="font-weight: var(--font-weight-medium);">${log.action}</span>
                </p>
                ${log.description ? `<p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${log.description}</p>` : ''}
                <p style="font-size: var(--font-size-xs); color: var(--color-text-subtle);">
                  ${formatDateTime(log.created_at)}
                </p>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;

  _initCharts(stats.expirationSummary);

  // Bind toggle listener
  document.getElementById('chart-releases-toggle').addEventListener('change', (e) => {
    _renderReleasesChart(e.target.value);
  });
}

function _initCharts(expirationSummary) {
  // Common theme colors matching the app
  const colors = {
    primary: '#047857', // Emerald 700
    secondary: '#1d4ed8', // Blue 700
    warning: '#b45309', // Amber 700
    danger: '#b91c1c', // Red 700
    muted: '#9ca3af',
    surface: '#1f2937',
    grid: '#374151'
  };

  Chart.defaults.color = colors.muted;
  Chart.defaults.font.family = "'Inter', sans-serif";

  // 1. Stock per Commodity
  const stockMap = {};
  _chartData.batches.forEach(b => {
    const name = b.commodities?.name || 'Unknown';
    stockMap[name] = (stockMap[name] || 0) + b.quantity;
  });
  
  const ctxStock = document.getElementById('chart-stock').getContext('2d');
  _chartInstances['stock'] = new Chart(ctxStock, {
    type: 'bar',
    data: {
      labels: Object.keys(stockMap),
      datasets: [{
        label: 'Total Available Quantity',
        data: Object.values(stockMap),
        backgroundColor: colors.primary,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: colors.grid } },
        x: { grid: { display: false } }
      }
    }
  });

  // 2. Barangay Distribution
  const brgyMap = {};
  _chartData.releases.forEach(r => {
    brgyMap[r.barangay] = (brgyMap[r.barangay] || 0) + r.quantity;
  });

  const ctxBrgy = document.getElementById('chart-barangay').getContext('2d');
  _chartInstances['barangay'] = new Chart(ctxBrgy, {
    type: 'doughnut',
    data: {
      labels: Object.keys(brgyMap),
      datasets: [{
        data: Object.values(brgyMap),
        backgroundColor: [
          '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#84cc16', '#14b8a6'
        ],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 12 } }
      }
    }
  });

  // 3. Expiration Status
  const ctxExpiry = document.getElementById('chart-expiry').getContext('2d');
  _chartInstances['expiry'] = new Chart(ctxExpiry, {
    type: 'pie',
    data: {
      labels: ['Good', 'Moderate', 'Near Expiry', 'Expired'],
      datasets: [{
        data: [
          expirationSummary[EXPIRATION_STATUS.GOOD] || 0,
          expirationSummary[EXPIRATION_STATUS.MODERATE] || 0,
          expirationSummary[EXPIRATION_STATUS.NEAR_EXPIRY] || 0,
          expirationSummary[EXPIRATION_STATUS.EXPIRED] || 0
        ],
        backgroundColor: [colors.primary, colors.secondary, colors.warning, colors.danger],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 12 } }
      }
    }
  });

  // 4. Releases Over Time
  _renderReleasesChart('monthly');
}

function _renderReleasesChart(timeframe) {
  if (_chartInstances['releases']) {
    _chartInstances['releases'].destroy();
  }

  const dataMap = {};
  
  _chartData.releases.forEach(r => {
    const d = new Date(r.released_at);
    let key = '';
    
    if (timeframe === 'daily') {
      key = d.toISOString().split('T')[0];
    } else if (timeframe === 'weekly') {
      const dCopy = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = dCopy.getUTCDay() || 7;
      dCopy.setUTCDate(dCopy.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(dCopy.getUTCFullYear(),0,1));
      const weekNo = Math.ceil((((dCopy - yearStart) / 86400000) + 1)/7);
      key = `${d.getFullYear()}-W${weekNo}`;
    } else if (timeframe === 'monthly') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else if (timeframe === 'yearly') {
      key = `${d.getFullYear()}`;
    }
    
    dataMap[key] = (dataMap[key] || 0) + r.quantity;
  });

  const sortedKeys = Object.keys(dataMap).sort();
  const sortedValues = sortedKeys.map(k => dataMap[k]);

  const ctxReleases = document.getElementById('chart-releases').getContext('2d');
  _chartInstances['releases'] = new Chart(ctxReleases, {
    type: 'line',
    data: {
      labels: sortedKeys,
      datasets: [{
        label: 'Quantity Released',
        data: sortedValues,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#3b82f6'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: '#374151' } },
        x: { grid: { display: false } }
      }
    }
  });
}
