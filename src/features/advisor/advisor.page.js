import { fetchAdvisorData, generateAdvisorSummary } from './advisor.service.js';
import { fetchChartData, fetchDashboardStats } from '../dashboard/dashboard.service.js';
import Chart from 'chart.js/auto';
import { EXPIRATION_STATUS } from '../../shared/constants/app.constants.js';
import './advisor.css';

let _advChartInstances = {};
let _advChartData = null;

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


  const [advisorRes, chartRes, statsRes] = await Promise.all([
    fetchAdvisorData(),
    fetchChartData(),
    fetchDashboardStats()
  ]);
  
  const { success, data, error } = advisorRes;
  _advChartData = !chartRes.error ? chartRes : null;
  
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
          <div class="card-header" ><h3 class="card-title">Expiring Soon (90 Days)</h3></div>
          <div class="card-body" style="padding: var(--space-2) var(--space-3); overflow-y: auto; max-height: 220px;">
            ${expiringList}
          </div>
        </div>

      </div>

      <!-- Right Column -->
      <div style="display: flex; flex-direction: column; gap: var(--space-3); min-width: 0;">
        
        <!-- Current Status -->
        <div class="card">
          <div class="card-header" ><h3 class="card-title">Current Status</h3></div>
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
          <div class="card-header" ><h3 class="card-title">Suggested Actions</h3></div>
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

  document.getElementById('advisor-loading').style.display = 'none';
  const contentContainer = document.getElementById('advisor-content');
  contentContainer.style.overflowX = "hidden";
  contentContainer.innerHTML = html;
  contentContainer.style.display = 'block';

  // Carousel Logic
  let currentSlide = 0;
  const track = document.getElementById('adv-carousel-track');
  const prevBtn = document.getElementById('adv-carousel-prev');
  const nextBtn = document.getElementById('adv-carousel-next');
  
  const updateCarousel = () => {
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
  };
  
  prevBtn.addEventListener('click', () => {
    if (currentSlide > 0) {
      currentSlide--;
      updateCarousel();
    }
  });
  
  nextBtn.addEventListener('click', () => {
    if (currentSlide < 3) {
      currentSlide++;
      updateCarousel();
    }
  });

  // Chart Init Logic
  if (statsRes && _advChartData) {
    _initAdvCharts(statsRes.expirationSummary);
    
    document.getElementById('adv-chart-releases-toggle').addEventListener('change', (e) => {
      _renderAdvReleasesChart(e.target.value);
    });
  }
}

function _initAdvCharts(expirationSummary) {
  const colors = {
    primary: '#047857',
    muted: '#9ca3af',
  };

  Chart.defaults.color = colors.muted;
  Chart.defaults.font.family = "'Inter', sans-serif";

  // Stock
  const stockMap = {};
  _advChartData.batches.forEach(b => {
    const name = b.commodities?.name || 'Unknown';
    stockMap[name] = (stockMap[name] || 0) + b.quantity;
  });
  
  const ctxStock = document.getElementById('adv-chart-stock').getContext('2d');
  _advChartInstances['stock'] = new Chart(ctxStock, {
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
      plugins: { legend: { display: false } }
    }
  });

  // Barangay
  const brgyMap = {};
  _advChartData.releases.forEach(r => {
    brgyMap[r.barangay] = (brgyMap[r.barangay] || 0) + r.quantity;
  });

  const ctxBrgy = document.getElementById('adv-chart-barangay').getContext('2d');
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

  // Expiry
  const ctxExpiry = document.getElementById('adv-chart-expiry').getContext('2d');
  _advChartInstances['expiry'] = new Chart(ctxExpiry, {
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
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
        borderWidth: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
    }
  });

  // Releases
  _renderAdvReleasesChart('monthly');
}

function _renderAdvReleasesChart(timeframe) {
  if (_advChartInstances['releases']) {
    _advChartInstances['releases'].destroy();
  }

  const dataMap = {};
  _advChartData.releases.forEach(r => {
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
      key = `Week ${weekNo}, ${d.getFullYear()}`;
    } else if (timeframe === 'monthly') {
      key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    } else {
      key = `${d.getFullYear()}`;
    }
    dataMap[key] = (dataMap[key] || 0) + r.quantity;
  });

  const sortedKeys = Object.keys(dataMap).sort();
  const sortedValues = sortedKeys.map(k => dataMap[k]);

  const ctxReleases = document.getElementById('adv-chart-releases').getContext('2d');
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
