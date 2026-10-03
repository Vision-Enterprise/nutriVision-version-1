/**
 * Dashboard Page (Controller)
 *
 * Coordinates dashboard metrics, recent activity, advisor preview,
 * and chart configurations.
 *
 * MVC Controller: delegates HTML to .render.js and charts to .charts.js.
 */

import { fetchDashboardStats, fetchRecentActivity } from './dashboard.service.js';
import { fetchAdvisorData } from '../advisor/advisor.service.js';
import { renderDashboardLayout } from './dashboard.render.js';

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

  const [stats, activity, advisorRes] = await Promise.all([
    fetchDashboardStats(),
    fetchRecentActivity(5),
    fetchAdvisorData()
  ]);

  if (stats.error || activity.error) {
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

  const advisorData = advisorRes.success ? advisorRes.data : null;

  content.innerHTML = renderDashboardLayout({
    stats,
    activity,
    advisorData
  });
}
