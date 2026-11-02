/**
 * Inventory Advisor Page (Controller)
 *
 * Coordinates advisor state, summary generation, analytics carousel,
 * and chart lifecycle.
 *
 * MVC Controller: delegates HTML templates to .render.js and Chart.js to .charts.js.
 */

import { fetchAdvisorData } from './advisor.service.js';
import { fetchChartData, fetchDashboardStats } from '../dashboard/dashboard.service.js';
import { renderAdvisorLayout, renderDrilldownContent } from './advisor.render.js';
import { initAdvCharts, renderAdvChart } from './advisor.charts.js';
import './advisor.css';

let _advChartData = null;

export async function renderAdvisorPage(profile) {
  const content = document.getElementById('page-content');
  if (!content) return;

  content.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Inventory Advisor</h1>
      <p class="page-header__subtitle">Action Center &amp; Inventory Health Analysis</p>
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
  
  const loadingEl = document.getElementById('advisor-loading');
  if (!loadingEl) return;

  if (!success) {
    loadingEl.innerHTML = `
      <div class="alert alert-error">
        Failed to load advisor data: ${error}
      </div>
    `;
    return;
  }

  loadingEl.style.display = 'none';
  const contentContainer = document.getElementById('advisor-content');
  if (!contentContainer) return;
  contentContainer.innerHTML = renderAdvisorLayout(data);
  contentContainer.style.display = 'block';

  // Interactive Chip Drilldowns
  const chipButtons = contentContainer.querySelectorAll('.advisor-chip-btn');
  const drilldownTray = document.getElementById('advisor-drilldown-tray');
  const drilldownContent = document.getElementById('advisor-drilldown-content');
  let currentActiveTarget = null;

  chipButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.drilldown;
      if (currentActiveTarget === target) {
        // Toggle close
        chipButtons.forEach(b => b.classList.remove('active'));
        if (drilldownTray) drilldownTray.style.display = 'none';
        currentActiveTarget = null;
      } else {
        // Open selected drilldown
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

  // Charts Initialization
  if (statsRes && _advChartData) {
    initAdvCharts(_advChartData, statsRes.expirationSummary);

    // Initial View
    renderAdvChart('barangay', _advChartData, statsRes.expirationSummary);
  }
}
