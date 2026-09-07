/**
 * Data Archive & Audit - View (Render)
 *
 * Pure HTML rendering functions for:
 *   - Tabs (Historical Inventory vs Voided Records)
 *   - Historical Depleted Inventory table
 *   - Voided Records table with reasons
 */

import { formatDate } from '../../shared/utils/date.utils.js';

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
      <h1 class="page-header__title">Data Archive & Audit Log</h1>
      <p class="page-header__subtitle">Review depleted historical stock and audit voided entries.</p>
    </div>

    <!-- Tabs -->
    <div style="display: flex; gap: var(--space-6); border-bottom: 1px solid var(--color-border); margin-bottom: var(--space-6);">
      <button class="tab-btn ${currentTab === 'historical' ? 'active' : ''}" data-tab="historical" style="background: none; border: none; padding: var(--space-3) var(--space-4); border-bottom: 3px solid ${currentTab === 'historical' ? 'var(--color-primary)' : 'transparent'}; color: ${currentTab === 'historical' ? 'var(--color-primary)' : 'var(--color-text-muted)'}; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: var(--space-2);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
        Historical Inventory (Depleted)
      </button>
      <button class="tab-btn ${currentTab === 'voided' ? 'active' : ''}" data-tab="voided" style="background: none; border: none; padding: var(--space-3) var(--space-4); border-bottom: 3px solid ${currentTab === 'voided' ? 'var(--color-primary)' : 'transparent'}; color: ${currentTab === 'voided' ? 'var(--color-primary)' : 'var(--color-text-muted)'}; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: var(--space-2);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        Voided Records (Audit Trail)
      </button>
      <button class="tab-btn ${currentTab === 'commodities' ? 'active' : ''}" data-tab="commodities" style="background: none; border: none; padding: var(--space-3) var(--space-4); border-bottom: 3px solid ${currentTab === 'commodities' ? 'var(--color-primary)' : 'transparent'}; color: ${currentTab === 'commodities' ? 'var(--color-primary)' : 'var(--color-text-muted)'}; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: var(--space-2);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
        Archived Commodities
      </button>
    </div>

    <!-- Content Area -->
    <div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden;">
      <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-4); border-bottom: 1px solid var(--color-border-light);">
        <h2 style="font-size: var(--font-size-base); font-weight: 600; margin: 0;">
          ${currentTab === 'historical' ? 'Past Distributions (Zero Stock)' : (currentTab === 'voided' ? 'Audit Trail: Soft Deleted Entries' : 'Archived Commodities (Soft Deleted)')}
        </h2>
        <div style="position: relative; width: 300px;">
          <input type="text" id="archive-search" class="form-input" placeholder="${currentTab === 'historical' ? 'Search batch code...' : (currentTab === 'voided' ? 'Search reason or user...' : 'Search commodity code or name...')}" value="${escapeHtml(searchTerm)}" style="padding-right: var(--space-8);">
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
          ${filtered.map(b => `
            <tr>
              <td style="font-weight: 600;">${escapeHtml(b.batch_number)}</td>
              <td>${escapeHtml(b.commodities?.name || '-')}</td>
              <td>${b.totalDistributed.toLocaleString()}</td>
              <td>${formatDate(b.updated_at)}</td>
              <td>
                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: var(--color-surface-alt); border-radius: 4px; font-size: 12px; color: var(--color-text-muted);">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  Depleted
                </span>
              </td>
              <td style="text-align: right;">
                <button class="btn btn-ghost btn-sm ledger-btn" data-id="${b.id}" style="color: var(--color-primary);">Release Ledger</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function renderVoidedTable(voidedBatches, searchTerm = '') {
  const filtered = voidedBatches.filter(b => 
    !searchTerm || 
    b.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.void_reason || '').toLowerCase().includes(searchTerm.toLowerCase())
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
          ${filtered.map(b => `
            <tr>
              <td style="font-weight: 600;">${escapeHtml(b.batch_number)}</td>
              <td>${escapeHtml(b.commodities?.name || '-')}</td>
              <td style="font-style: italic; color: var(--color-text-muted);">"${escapeHtml(b.void_reason || 'No reason provided')}"</td>
              <td>${escapeHtml(b.voided_by_name || 'Unknown')}</td>
              <td>${formatDate(b.deleted_at)}</td>
              <td>
                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: rgba(239, 68, 68, 0.1); color: var(--color-danger); border-radius: 4px; font-size: 12px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                  Voided
                </span>
              </td>
              <td style="text-align: right;">
                <button class="btn btn-ghost btn-sm restore-btn" data-id="${b.id}" aria-label="Restore record" title="Restore Record">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/></svg>
                </button>
              </td>
            </tr>
          `).join('')}
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
    <div class="table-container">
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
              <td style="font-weight: 600; font-family: monospace;">${escapeHtml(c.commodity_code)}</td>
              <td>${escapeHtml(c.name)}</td>
              <td><span class="badge badge-outline">${escapeHtml(c.category)}</span></td>
              <td>${escapeHtml(c.unit)}</td>
              <td>${formatDate(c.deleted_at)}</td>
              <td>
                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: rgba(245, 158, 11, 0.1); color: #d97706; border-radius: 4px; font-size: 12px; font-weight: 600;">
                  Archived
                </span>
              </td>
              <td style="text-align: right;">
                <button class="btn btn-ghost btn-sm restore-commodity-btn" data-id="${c.id}" data-name="${escapeHtml(c.name)}" aria-label="Restore commodity" title="Restore Commodity">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/></svg>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

