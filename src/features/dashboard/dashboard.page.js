/**
 * Dashboard Page (Controller)
 *
 * Coordinates dashboard metrics, recent activity, advisor preview,
 * and chart configurations.
 *
 * MVC Controller: delegates HTML to .render.js and charts to .charts.js.
 */

import { fetchDashboardStats, fetchRecentActivity, fetchChartData } from './dashboard.service.js';
import { fetchAdvisorData } from '../advisor/advisor.service.js';
import { renderDashboardLayout } from './dashboard.render.js';
import { initDashboardCharts, renderDashboardReleasesChart } from './dashboard.charts.js';

let _chartData = null;

export async function renderDashboardPage(profile) {
  const content = document.getElementById('page-content');
  if (!content) return;

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

  const [stats, activity, chartData, advisorRes] = await Promise.all([
    fetchDashboardStats(),
    fetchRecentActivity(5),
    fetchChartData(),
    fetchAdvisorData()
  ]);

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
  const advisorData = advisorRes.success ? advisorRes.data : null;

  content.innerHTML = renderDashboardLayout({
    stats,
    activity,
    advisorData
  });

  if (stats.expirationSummary && _chartData) {
    initDashboardCharts(_chartData, stats.expirationSummary);

    document.getElementById('chart-releases-toggle')?.addEventListener('change', e => {
      renderDashboardReleasesChart(_chartData, e.target.value);
    });
  }
}
