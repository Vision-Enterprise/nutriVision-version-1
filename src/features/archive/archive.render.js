/**
 * Data Archive & Audit - View (Render)
 *
 * Pure HTML rendering functions for:
 *   - Tabs (Depleted Batches, Voided Records, Archived Commodities)
 *   - Depleted Batches table
 *   - Voided Records table with reasons
 *   - Archived Commodities table
 */

import { formatDate } from '../../shared/utils/date.utils.js';
import { renderBatchCodeBadge } from '../batches/batches.render.js';

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderArchiveLayout({ currentTab, searchTerm, tableHtml }) {
  return `
    <div class="page-header">
      <h1 class="page-header__title">Data Archive &amp; Audit Log</h1>
      <p class="page-header__subtitle">Review depleted batches, audit voided records, and manage archived commodities.</p>
    </div>

    <!-- Tabs -->
    <div style="display: flex; gap: var(--space-6); border-bottom: 1px solid var(--color-border); margin-bottom: var(--space-6);">
      <button class="tab-btn ${currentTab === 'historical' ? 'active' : ''}" data-tab="historical" style="background: none; border: none; padding: var(--space-3) var(--space-4); border-bottom: 3px solid ${currentTab === 'historical' ? 'var(--color-primary)' : 'transparent'}; color: ${currentTab === 'historical' ? 'var(--color-primary)' : 'var(--color-text-muted)'}; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: var(--space-2);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
        Depleted Batches
      </button>
      <button class="tab-btn ${currentTab === 'voided' ? 'active' : ''}" data-tab="voided" style="background: none; border: none; padding: var(--space-3) var(--space-4); border-bottom: 3px solid ${currentTab === 'voided' ? 'var(--color-primary)' : 'transparent'}; color: ${currentTab === 'voided' ? 'var(--color-primary)' : 'var(--color-text-muted)'}; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: var(--space-2);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        Voided Records
      </button>
      <button class="tab-btn ${currentTab === 'commodities' ? 'active' : ''}" data-tab="commodities" style="background: none; border: none; padding: var(--space-3) var(--space-4); border-bottom: 3px solid ${currentTab === 'commodities' ? 'var(--color-primary)' : 'transparent'}; color: ${currentTab === 'commodities' ? 'var(--color-primary)' : 'var(--color-text-muted)'}; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: var(--space-2);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
        Archived Commodities
      </button>
    </div>

    <!-- Content Area -->
    <div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden;">
      <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-4); border-bottom: 1px solid var(--color-border-light); flex-wrap: wrap; gap: var(--space-3);">
        <h2 style="font-size: var(--font-size-base); font-weight: 600; margin: 0;">
          ${currentTab === 'historical' ? 'Depleted Batches (Zero Stock)' : (currentTab === 'voided' ? 'Voided Records (Soft Deleted)' : 'Archived Commodities (Soft Deleted)')}
        </h2>
        <div style="position: relative; width: 300px;">
          <input type="text" id="archive-search" class="form-input" placeholder="${currentTab === 'historical' ? 'Search batch code or commodity...' : (currentTab === 'voided' ? 'Search batch code, reason, or user...' : 'Search commodity code or name...')}" value="${escapeHtml(searchTerm)}" style="padding-right: var(--space-8);">
        </div>
      </div>

      <div id="archive-table-container">
        ${tableHtml}
      </div>
    </div>
  `;
}

export function renderHistoricalTable(depletedBatches, searchTerm = '') {
  const filtered = depletedBatches.filter(b => 
    !searchTerm || 
    b.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.commodities?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (filtered.length === 0) return renderArchiveEmpty('No depleted batches found.');

  return `
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Batch Code</th>
            <th>Commodity</th>
            <th>Total Units Dist.</th>
            <th>Date Depleted</th>
            <th>Status</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(b => {
            const sku = escapeHtml(b.commodities?.commodity_code || '');
            const unit = escapeHtml(b.commodities?.unit || '');
            return `
              <tr>
                <td style="white-space: nowrap;">${renderBatchCodeBadge(b.batch_number)}</td>
                <td>
                  <span style="font-weight: var(--font-weight-medium); color: var(--color-text);">
                    ${escapeHtml(b.commodities?.name || '-')}
                  </span>
                  ${sku ? `
                    <br>
                    <span style="display: inline-block; margin-top: 2px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 0.74rem; font-weight: var(--font-weight-bold); color: var(--color-primary); letter-spacing: 0.03em;">
                      ${sku}
                    </span>
                  ` : ''}
                </td>
                <td style="font-weight: var(--font-weight-medium); white-space: nowrap;">
                  ${b.totalDistributed.toLocaleString()} ${unit}
                </td>
                <td style="color: var(--color-text-muted); font-size: var(--font-size-sm); white-space: nowrap;">
                  ${formatDate(b.updated_at)}
                </td>
                <td style="white-space: nowrap;">
                  <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: var(--color-surface-alt); border-radius: 4px; font-size: 12px; color: var(--color-text-muted);">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    Depleted
                  </span>
                </td>
                <td style="text-align: right; white-space: nowrap;">
                  <div class="table-actions">
                    <button class="btn-table-action ledger-btn" data-id="${b.id}" type="button" title="View release history for batch ${escapeHtml(b.batch_number)}">
                      <span class="icon icon--sm" style="font-size: 15px;" aria-hidden="true">receipt_long</span>
                      View Releases
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function renderVoidedTable(voidedBatches, searchTerm = '') {
  const filtered = voidedBatches.filter(b => 
    !searchTerm || 
    b.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.commodities?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.void_reason || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.voided_by_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (filtered.length === 0) return renderArchiveEmpty('No voided records found.');

  return `
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Batch Code</th>
            <th>Commodity</th>
            <th>Void Reason</th>
            <th>Voided By</th>
            <th>Date Voided</th>
            <th>Status</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(b => {
            const sku = escapeHtml(b.commodities?.commodity_code || '');
            return `
              <tr>
                <td style="white-space: nowrap;">${renderBatchCodeBadge(b.batch_number)}</td>
                <td>
                  <span style="font-weight: var(--font-weight-medium); color: var(--color-text);">
                    ${escapeHtml(b.commodities?.name || '-')}
                  </span>
                  ${sku ? `
                    <br>
                    <span style="display: inline-block; margin-top: 2px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 0.74rem; font-weight: var(--font-weight-bold); color: var(--color-primary); letter-spacing: 0.03em;">
                      ${sku}
                    </span>
                  ` : ''}
                </td>
                <td style="font-style: italic; color: var(--color-text-muted);">"${escapeHtml(b.void_reason || 'No reason provided')}"</td>
                <td style="white-space: nowrap;">${escapeHtml(b.voided_by_name || 'Unknown')}</td>
                <td style="color: var(--color-text-muted); font-size: var(--font-size-sm); white-space: nowrap;">${formatDate(b.deleted_at)}</td>
                <td style="white-space: nowrap;">
                  <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: rgba(239, 68, 68, 0.1); color: var(--color-danger); border-radius: 4px; font-size: 12px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                    Voided
                  </span>
                </td>
                <td style="text-align: right; white-space: nowrap;">
                  <div class="table-actions">
                    <button class="btn-table-action restore-btn" data-id="${b.id}" type="button" aria-label="Restore batch ${escapeHtml(b.batch_number)}" title="Restore batch ${escapeHtml(b.batch_number)}">
                      <span class="icon icon--sm" style="font-size: 15px;" aria-hidden="true">restore</span>
                      Restore
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function renderArchiveEmpty(message) {
  return `
    <div style="padding: var(--space-8); text-align: center; color: var(--color-text-muted);">
      <p>${message}</p>
    </div>
  `;
}

export function renderArchivedCommoditiesTable(commodities, searchTerm = '') {
  const filtered = (commodities || []).filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.commodity_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!filtered.length) {
    return renderArchiveEmpty(
      searchTerm
        ? `No archived commodities match "${escapeHtml(searchTerm)}".`
        : 'No archived commodities found.'
    );
  }

  return `
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Category</th>
            <th>Unit</th>
            <th>Date Archived</th>
            <th>Status</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(c => `
            <tr>
              <td style="white-space: nowrap;">
                <code class="code-badge">${escapeHtml(c.commodity_code)}</code>
              </td>
              <td style="font-weight: var(--font-weight-medium);">${escapeHtml(c.name)}</td>
              <td><span class="badge badge-outline">${escapeHtml(c.category)}</span></td>
              <td>${escapeHtml(c.unit)}</td>
              <td style="color: var(--color-text-muted); font-size: var(--font-size-sm); white-space: nowrap;">
                ${formatDate(c.deleted_at)}
              </td>
              <td style="white-space: nowrap;">
                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: rgba(245, 158, 11, 0.1); color: #d97706; border-radius: 4px; font-size: 12px; font-weight: 600;">
                  Archived
                </span>
              </td>
              <td style="text-align: right; white-space: nowrap;">
                <div class="table-actions">
                  <button class="btn-table-action restore-commodity-btn" data-id="${c.id}" data-name="${escapeHtml(c.name)}" type="button" aria-label="Restore commodity ${escapeHtml(c.name)}" title="Restore commodity ${escapeHtml(c.name)}">
                    <span class="icon icon--sm" style="font-size: 15px;" aria-hidden="true">restore</span>
                    Restore
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
