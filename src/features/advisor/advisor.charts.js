/**
 * Inventory Advisor - Charts
 *
 * Dedicated Chart.js lifecycle management for:
 *   - Stock per Commodity bar chart
 *   - Barangay Distribution doughnut chart
 *   - Expiration Status pie chart
 *   - Releases Over Time line chart (with timeframe toggles)
 */

import Chart from 'chart.js/auto';
import { EXPIRATION_STATUS } from '../../shared/constants/app.constants.js';

let _advChartInstances = {};

export function initAdvCharts(chartData, expirationSummary) {
  destroyAdvCharts();

  const colors = {
    primary: '#047857',
    muted: '#9ca3af',
  };

  Chart.defaults.color = colors.muted;
  Chart.defaults.font.family = "'Inter', sans-serif";

  // 1. Stock per Commodity
  const stockMap = {};
  chartData.batches.forEach(b => {
    const name = b.commodities?.name || 'Unknown';
    stockMap[name] = (stockMap[name] || 0) + b.quantity;
  });
  
  const stockLabels = Object.keys(stockMap);
  const stockValues = Object.values(stockMap);
  const hasStock = stockLabels.length > 0;

  const ctxStock = document.getElementById('adv-chart-stock')?.getContext('2d');
  if (ctxStock) {
    _advChartInstances['stock'] = new Chart(ctxStock, {
      type: 'bar',
      data: {
        labels: hasStock ? stockLabels : ['No Active Stock'],
        datasets: [{
          label: 'Total Available Quantity',
          data: hasStock ? stockValues : [0],
          backgroundColor: hasStock ? colors.primary : '#d1d5db',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { display: false },
          tooltip: { enabled: hasStock }
        }
      }
    });
  }

  // 2. Barangay Distribution
  const brgyMap = {};
  chartData.releases.forEach(r => {
    brgyMap[r.barangay] = (brgyMap[r.barangay] || 0) + r.quantity;
  });

  const ctxBrgy = document.getElementById('adv-chart-barangay')?.getContext('2d');
  if (ctxBrgy) {
    _advChartInstances['barangay'] = new Chart(ctxBrgy, {
      type: 'doughnut',
      data: {
        labels: Object.keys(brgyMap),
        datasets: [{
          data: Object.values(brgyMap),
          backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#84cc16', '#14b8a6'],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      }
    });
  }

  // 3. Expiration Status
  const ctxExpiry = document.getElementById('adv-chart-expiry')?.getContext('2d');
  if (ctxExpiry && expirationSummary) {
    const totalBatchesCount = (expirationSummary[EXPIRATION_STATUS.GOOD] || 0) +
      (expirationSummary[EXPIRATION_STATUS.MODERATE] || 0) +
      (expirationSummary[EXPIRATION_STATUS.NEAR_EXPIRY] || 0) +
      (expirationSummary[EXPIRATION_STATUS.EXPIRED] || 0);

    const hasBatches = totalBatchesCount > 0;

    _advChartInstances['expiry'] = new Chart(ctxExpiry, {
      type: 'pie',
      data: {
        labels: hasBatches 
          ? ['Good', 'Moderate', 'Near Expiry', 'Expired'] 
          : ['No Active Batches'],
        datasets: [{
          data: hasBatches ? [
            expirationSummary[EXPIRATION_STATUS.GOOD] || 0,
            expirationSummary[EXPIRATION_STATUS.MODERATE] || 0,
            expirationSummary[EXPIRATION_STATUS.NEAR_EXPIRY] || 0,
            expirationSummary[EXPIRATION_STATUS.EXPIRED] || 0
          ] : [1],
          backgroundColor: hasBatches 
            ? ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'] 
            : ['#e5e7eb'],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 12 } },
          tooltip: { enabled: hasBatches }
        }
      }
    });
  }

  // 4. Releases Over Time
  renderAdvReleasesChart(chartData, 'monthly');
}

export function renderAdvReleasesChart(chartData, timeframe) {
  if (_advChartInstances['releases']) {
    _advChartInstances['releases'].destroy();
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
      key = `Week ${weekNo}, ${d.getFullYear()}`;
    } else if (timeframe === 'monthly') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else {
      key = `${d.getFullYear()}`;
    }
    dataMap[key] = (dataMap[key] || 0) + r.quantity;
  });

  const sortedKeys = Object.keys(dataMap).sort();
  const sortedValues = sortedKeys.map(k => dataMap[k]);

  const ctxReleases = document.getElementById('adv-chart-releases')?.getContext('2d');
  if (!ctxReleases) return;

  _advChartInstances['releases'] = new Chart(ctxReleases, {
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
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
    }
  });
}

export function destroyAdvCharts() {
  Object.values(_advChartInstances).forEach(inst => {
    if (inst && typeof inst.destroy === 'function') {
      inst.destroy();
    }
  });
  _advChartInstances = {};
}
