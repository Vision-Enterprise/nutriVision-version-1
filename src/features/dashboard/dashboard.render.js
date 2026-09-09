/**
 * Dashboard - View (Render)
 *
 * Pure HTML template functions for the Dashboard:
 *   - Stat KPI cards (commodities, batches, near-expiry, expired)
 *   - AI Advisor summary widget with alerts
 *   - Chart container grids
 *   - Recent activity feed
 */

import { generateAdvisorSummary } from '../advisor/advisor.service.js';
import { formatDateTime } from '../../shared/utils/date.utils.js';
import { EXPIRATION_STATUS } from '../../shared/constants/app.constants.js';

export function renderDashboardLayout({ stats, activity, advisorData }) {
  const alertsHtml = advisorData ? advisorData.expiringSoon.slice(0, 2).map(item => {
    if (item.status === EXPIRATION_STATUS.EXPIRED || new Date(item.date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
      return `
        <div style="background-color: #fff5f5; border: 1px solid #ffcccc; border-radius: var(--radius-md); padding: var(--space-3);">
          <div style="display: flex; align-items: center; gap: var(--space-2); color: #c62828; font-weight: bold; margin-bottom: var(--space-2);">
            <span class="icon icon--sm">error</span>
            <span>CRITICAL: Imminent Expiration</span>
          </div>
          <div style="color: var(--color-text-dark);">
            Batch <strong>${item.batch}</strong> (${item.name}) expires on ${item.date}.
          </div>
        </div>
      `;
    } else {
      return `
        <div style="background-color: #fffde7; border: 1px solid #ffe082; border-radius: var(--radius-md); padding: var(--space-3);">
          <div style="display: flex; align-items: center; gap: var(--space-2); color: #f57f17; font-weight: bold; margin-bottom: var(--space-2);">
            <span class="icon icon--sm">warning</span>
            <span>NOTICE: Approaching Expiration</span>
          </div>
          <div style="color: var(--color-text-dark);">
            Batch <strong>${item.batch}</strong> (${item.name}) expires on ${item.date}.
          </div>
        </div>
      `;
    }
  }).join('') : '';

  return `
    <div class="page-header">
      <h1 class="page-header__title">Dashboard</h1>
      <p class="page-header__subtitle">
        Overview of nutrition commodity inventory status
      </p>
    </div>

    <!-- Quick Access Buttons -->
    <div style="display: flex; gap: var(--space-3); flex-wrap: wrap; margin-bottom: var(--space-6);">
      <a href="#/bulk-release" class="btn btn-bulk-release" style="text-decoration: none;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        Bulk Release
      </a>
      
      <a href="#/batches" class="btn btn-primary" style="text-decoration: none;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Add Batch
      </a>

      <a href="#/commodities" class="btn btn-primary" style="text-decoration: none;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Add Commodity
      </a>

      <a href="#/calendar" class="btn btn-secondary" style="text-decoration: none;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        Calendar
      </a>
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

    <!-- Inventory Advisor Widget -->
    ${advisorData ? `
      <div class="card" style="margin-bottom: var(--space-6); background: #ffffff; border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 0;">
        <div style="padding: var(--space-4);">
          <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-3); color: #5a6b7c;">
            <span class="icon icon--sm">fact_check</span>
            <span style="font-weight: bold; font-size: var(--text-sm); letter-spacing: 1px;">SYSTEM SUMMARY</span>
          </div>
          <div style="border-left: 4px solid var(--color-primary); padding-left: var(--space-3); font-size: var(--text-md); color: var(--color-text); line-height: 1.6;">
            ${generateAdvisorSummary(advisorData)}
          </div>
        </div>

        <div style="border-top: 1px solid var(--color-border-light);"></div>

        ${alertsHtml ? `<div style="padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3);">${alertsHtml}</div><div style="border-top: 1px solid var(--color-border-light);"></div>` : ''}

        <div style="padding: var(--space-4); display: flex; justify-content: flex-end; align-items: center;">
          <a href="#/advisor" class="btn btn-primary" style="display: flex; align-items: center; gap: var(--space-2);">
            Open Advisor
            <span class="icon icon--sm">open_in_new</span>
          </a>
        </div>
      </div>
    ` : ''}

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

      <!-- Expiry Status -->
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
}
