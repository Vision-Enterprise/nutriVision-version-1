/**
 * Dashboard - Charts
 *
 * Chart.js rendering and lifecycle handling for:
 *   - Stock per Commodity bar chart
 *   - Barangay Distribution doughnut chart
 *   - Expiration Status pie chart
 *   - Releases Over Time line chart (with timeframe selector)
 */

import Chart from 'chart.js/auto';
import { EXPIRATION_STATUS } from '../../shared/constants/app.constants.js';

let _chartInstances = {};

export function initDashboardCharts(chartData, expirationSummary) {
  destroyDashboardCharts();

  const colors = {
    primary: '#047857',
    secondary: '#1d4ed8',
    warning: '#b45309',
    danger: '#b91c1c',
    muted: '#9ca3af',
    grid: '#374151'
  };

  Chart.defaults.color = colors.muted;
  Chart.defaults.font.family = "'Inter', sans-serif";

  // 1. Stock per Commodity
  const stockMap = {};
  chartData.batches.forEach(b => {
    const name = b.commodities?.name || 'Unknown';
    stockMap[name] = (stockMap[name] || 0) + b.quantity;
  });
  
  const ctxStock = document.getElementById('chart-stock')?.getContext('2d');
  if (ctxStock) {
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
  }

  // 2. Barangay Distribution
  const brgyMap = {};
  chartData.releases.forEach(r => {
    brgyMap[r.barangay] = (brgyMap[r.barangay] || 0) + r.quantity;
  });

  const ctxBrgy = document.getElementById('chart-barangay')?.getContext('2d');
  if (ctxBrgy) {
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
  }

  // 3. Expiration Status
  const ctxExpiry = document.getElementById('chart-expiry')?.getContext('2d');
  if (ctxExpiry && expirationSummary) {
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
  }

  // 4. Releases Over Time
  renderDashboardReleasesChart(chartData, 'monthly');
}

export function renderDashboardReleasesChart(chartData, timeframe) {
  if (_chartInstances['releases']) {
    _chartInstances['releases'].destroy();
  }

  const dataMap = {};
  chartData.releases.forEach(r => {
    const d = new Date(r.released_at);
    let key = '';
    
    if (timeframe === 'daily') {
      key = d.toISOString().split('T')[0];
    } else if (timeframe === 'weekly') {
      const dCopy = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = dCopy.getUTCDay() || 7;
      dCopy.setUTCDate(dCopy.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(dCopy.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((dCopy - yearStart) / 86400000) + 1) / 7);
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

  const ctxReleases = document.getElementById('chart-releases')?.getContext('2d');
  if (!ctxReleases) return;

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

export function destroyDashboardCharts() {
  Object.values(_chartInstances).forEach(inst => {
    if (inst && typeof inst.destroy === 'function') {
      inst.destroy();
    }
  });
  _chartInstances = {};
}
