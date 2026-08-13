/**
 * Dashboard Page
 * Full implementation: Phase 4
 */

import { fetchDashboardStats, fetchRecentActivity } from './dashboard.service.js';
import { formatDateTime } from '../../shared/utils/date.utils.js';
import { EXPIRATION_STATUS } from '../../shared/constants/app.constants.js';

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

  // Fetch data
  const [stats, activity] = await Promise.all([
    fetchDashboardStats(),
    fetchRecentActivity(5)
  ]);

  // Handle errors
  if (stats.error || activity.error) {
    content.innerHTML = `
      <div class="page-header">
        <h1 class="page-header__title">Dashboard</h1>
        <p class="page-header__subtitle">
          Overview of nutrition commodity inventory status
        </p>
      </div>
      <div class="alert alert-error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>Failed to load dashboard data. Please try again.</span>
      </div>
    `;
    return;
  }

  // Render Dashboard
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
        <div class="stat-card__footer">Expiring within 6 months</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">Expired</div>
        <div class="stat-card__value stat-card__value--danger">${stats.expiredBatches}</div>
        <div class="stat-card__footer">Requires immediate action</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-6);">
      
      <!-- Expiration Summary -->
      <div class="card">
        <div class="card-header" style="margin-bottom: var(--space-4); padding-bottom: 0; border: none;">
          <h2 class="card-title">Expiration Status Summary</h2>
        </div>
        <div class="table-wrapper" style="border: none; box-shadow: none;">
          <table class="table">
            <tbody>
              <tr>
                <td><span class="badge badge-good">Good</span></td>
                <td style="text-align: right; font-weight: var(--font-weight-medium);">${stats.expirationSummary[EXPIRATION_STATUS.GOOD]} batches</td>
              </tr>
              <tr>
                <td><span class="badge badge-moderate">Moderate</span></td>
                <td style="text-align: right; font-weight: var(--font-weight-medium);">${stats.expirationSummary[EXPIRATION_STATUS.MODERATE]} batches</td>
              </tr>
              <tr>
                <td><span class="badge badge-near-expiry">Near Expiry</span></td>
                <td style="text-align: right; font-weight: var(--font-weight-medium);">${stats.expirationSummary[EXPIRATION_STATUS.NEAR_EXPIRY]} batches</td>
              </tr>
              <tr>
                <td><span class="badge badge-expired">Expired</span></td>
                <td style="text-align: right; font-weight: var(--font-weight-medium);">${stats.expirationSummary[EXPIRATION_STATUS.EXPIRED]} batches</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="card">
        <div class="card-header" style="margin-bottom: var(--space-4); padding-bottom: 0; border: none;">
          <h2 class="card-title">Recent Activity</h2>
        </div>
        ${activity.logs.length === 0 ? `
          <div style="text-align: center; padding: var(--space-8) 0; color: var(--color-text-muted); font-size: var(--font-size-sm);">
            No recent activity to display.
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: var(--space-3);">
            ${activity.logs.map(log => `
              <div style="display: flex; align-items: flex-start; gap: var(--space-3); padding-bottom: var(--space-3); border-bottom: 1px solid var(--color-border);">
                <div style="flex-shrink: 0; margin-top: 2px;">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-primary);">
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

    </div>
  `;
}
