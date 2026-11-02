/**
 * Data Archive & Audit - View (Render)
 *
 * Pure HTML template builders for the Data Archive page:
 *   - Search & Filter Bar (Audit Logs dropdown + Defect Log quick pills)
 *   - Expired Stock, Data Entry Errors & Voided tables with reason badges
 *   - Depleted Batches table with release history trigger
 *   - Archived Commodities table with restore trigger
 */

import { renderBatchCodeBadge } from '../batches/batches.render.js';
import { formatDate } from '../../shared/utils/date.utils.js';

export function escapeHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Parses void_reason string into category and specific notes
 */
export function parseVoidReason(reasonStr) {
  const str = String(reasonStr || '').trim();
  if (!str) return { category: 'Other', details: 'No reason provided' };
  
  if (str.toLowerCase().startsWith('expired stock')) {
    const details = str.includes(':') 
      ? str.split(':').slice(1).join(':').trim() 
      : (str.includes('-') ? str.split('-').slice(1).join('-').trim() : '');
    return { category: 'Expired Stock', details: details || 'Expired batch removed from inventory' };
  }
  
  if (str.toLowerCase().startsWith('data entry error')) {
    const details = str.includes(':') 
      ? str.split(':').slice(1).join(':').trim() 
      : (str.includes('-') ? str.split('-').slice(1).join('-').trim() : '');
    return { category: 'Data Entry Error', details: details || 'Clerical or data entry correction' };
  }
  
  if (str.toLowerCase().startsWith('other')) {
    const details = str.includes(':') ? str.split(':').slice(1).join(':').trim() : '';
    return { category: 'Other', details: details || str };
  }

  // Any legacy free text (e.g. "sample", "typo")
  return { category: 'Other', details: str };
}

export function renderReasonBadge(category) {
  if (category === 'Expired Stock') {
    return `<span class="badge-reason--expired"><span class="icon" style="font-size:13px;">error</span> Expired Stock</span>`;
  }
  if (category === 'Data Entry Error') {
    return `<span class="badge-reason--error"><span class="icon" style="font-size:13px;">edit_note</span> Data Entry Error</span>`;
  }
  if (category === 'Depleted') {
    return `<span class="badge-reason--depleted"><span class="icon" style="font-size:13px;">check_circle</span> Depleted Stock</span>`;
  }
  if (category === 'Commodity') {
    return `<span class="badge-reason--commodity"><span class="icon" style="font-size:13px;">inventory_2</span> Commodity</span>`;
  }
  return `<span class="badge-reason--other"><span class="icon" style="font-size:13px;">help_outline</span> Other Voided</span>`;
}

export function renderArchiveLayout({ currentFilter = 'all', searchTerm = '', counts, tableHtml }) {
  return `
    <div class="page-header" style="margin-bottom: var(--space-4);">
      <div>
        <h1 class="page-header__title">Data Archive &amp; Audit Log</h1>
        <p class="page-header__subtitle" id="archive-subtitle">
          ${counts.all} total historical, expired, and voided records
        </p>
      </div>
    </div>

    <!-- Filter Bar Card (Audit Logs & Defect Log Filter Style) -->
    <div class="card" style="padding: var(--space-4); margin-bottom: var(--space-6);">
      <div style="display: flex; gap: var(--space-3); flex-wrap: wrap; align-items: center; justify-content: space-between;">
        
        <!-- Search Input -->
        <div style="flex: 1; min-width: 240px;">
          <input
            type="text"
            id="archive-search"
            class="form-input"
            placeholder="Search by batch code, commodity, reason, or user..."
            value="${escapeHtml(searchTerm)}"
            aria-label="Search archive records"
          />
        </div>

        <!-- Filter Dropdown (Audit Logs style) -->
        <div style="min-width: 220px;">
          <select id="archive-filter-select" class="form-input" aria-label="Filter archive category" style="cursor: pointer; font-weight: 500;">
            <option value="all" ${currentFilter === 'all' ? 'selected' : ''}>All Archive Records (${counts.all})</option>
            <option value="expired" ${currentFilter === 'expired' ? 'selected' : ''}>Expired Stock (${counts.expired})</option>
            <option value="data-error" ${currentFilter === 'data-error' ? 'selected' : ''}>Data Entry Errors (${counts.dataError})</option>
            <option value="other" ${currentFilter === 'other' ? 'selected' : ''}>Other Voided (${counts.other})</option>
            <option value="depleted" ${currentFilter === 'depleted' ? 'selected' : ''}>Depleted Batches (${counts.depleted})</option>
            <option value="commodities" ${currentFilter === 'commodities' ? 'selected' : ''}>Archived Commodities (${counts.commodities})</option>
          </select>
        </div>
      </div>

      <!-- Quick Filter Pills (Defect Log style) -->
      <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--color-border-light);">
        <button type="button" class="archive-pill ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">
          All Records (${counts.all})
        </button>
        <button type="button" class="archive-pill ${currentFilter === 'expired' ? 'active' : ''}" data-filter="expired">
          Expired Stock (${counts.expired})
        </button>
        <button type="button" class="archive-pill ${currentFilter === 'data-error' ? 'active' : ''}" data-filter="data-error">
          Data Entry Errors (${counts.dataError})
        </button>
        <button type="button" class="archive-pill ${currentFilter === 'other' ? 'active' : ''}" data-filter="other">
          Other Voided (${counts.other})
        </button>
        <button type="button" class="archive-pill ${currentFilter === 'depleted' ? 'active' : ''}" data-filter="depleted">
          Depleted Batches (${counts.depleted})
        </button>
        <button type="button" class="archive-pill ${currentFilter === 'commodities' ? 'active' : ''}" data-filter="commodities">
          Archived Commodities (${counts.commodities})
        </button>
      </div>
    </div>

    <!-- Main Content Table Card -->
    <div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
      <div id="archive-table-container">
        ${tableHtml}
      </div>
    </div>
  `;
}

export function renderArchiveEmpty(message) {
  return `
    <div style="padding: var(--space-8); text-align: center; color: var(--color-text-muted);">
      <span class="icon" style="font-size: 40px; color: var(--color-text-subtle); display: block; margin-bottom: 8px;">archive</span>
      <p style="margin: 0; font-size: var(--font-size-sm);">${message}</p>
    </div>
  `;
}

/**
 * Renders Depleted Batches Table (with View Releases ledger button)
 */
export function renderHistoricalTable(depletedBatches, searchTerm = '') {
  const filtered = depletedBatches.filter(b => 
    !searchTerm || 
    b.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.commodities?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.commodities?.commodity_code || '').toLowerCase().includes(searchTerm.toLowerCase())
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

/**
 * Renders Voided / Expired Batches Table (with Restore button)
 */
export function renderVoidedTable(voidedBatches, searchTerm = '', targetCategory = null) {
  let filtered = voidedBatches.map(b => {
    const parsed = parseVoidReason(b.void_reason);
    return { ...b, reasonCategory: parsed.category, reasonDetails: parsed.details };
  });

  if (targetCategory) {
    filtered = filtered.filter(b => b.reasonCategory === targetCategory);
  }

  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    filtered = filtered.filter(b => 
      b.batch_number.toLowerCase().includes(q) ||
      (b.commodities?.name || '').toLowerCase().includes(q) ||
      (b.commodities?.commodity_code || '').toLowerCase().includes(q) ||
      b.reasonCategory.toLowerCase().includes(q) ||
      b.reasonDetails.toLowerCase().includes(q) ||
      (b.voided_by_name || '').toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    return renderArchiveEmpty(
      targetCategory 
        ? `No ${targetCategory} records found.` 
        : 'No voided batch records found.'
    );
  }

  return `
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Batch Code</th>
            <th>Commodity</th>
            <th>Reason Category</th>
            <th>Notes / Details</th>
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
                <td style="white-space: nowrap;">
                  ${renderReasonBadge(b.reasonCategory)}
                </td>
                <td style="color: var(--color-text); font-size: var(--font-size-sm); max-width: 240px; word-break: break-word;">
                  ${escapeHtml(b.reasonDetails)}
                </td>
                <td style="white-space: nowrap; color: var(--color-text); font-weight: 500;">
                  ${escapeHtml(b.voided_by_name || 'Admin')}
                </td>
                <td style="color: var(--color-text-muted); font-size: var(--font-size-sm); white-space: nowrap;">
                  ${formatDate(b.deleted_at)}
                </td>
                <td style="white-space: nowrap;">
                  <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: rgba(239, 68, 68, 0.1); color: var(--color-danger); border-radius: 4px; font-size: 12px; font-weight: 500;">
                    <span class="icon" style="font-size: 13px;">cancel</span>
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

/**
 * Renders Archived Commodities Table (with Restore button)
 */
export function renderArchivedCommoditiesTable(commodities, searchTerm = '') {
  const filtered = (commodities || []).filter(c =>
    !searchTerm ||
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

/**
 * Unified Table for "All Archive Records"
 */
export function renderAllArchiveTable({ voidedBatches, depletedBatches, archivedCommodities, searchTerm = '' }) {
  // Combine all items with normalized fields
  const allItems = [];

  // 1. Voided Batches (Expired Stock, Data Entry Error, Other)
  (voidedBatches || []).forEach(b => {
    const parsed = parseVoidReason(b.void_reason);
    allItems.push({
      id: b.id,
      kind: 'batch-voided',
      code: b.batch_number,
      isBatch: true,
      name: b.commodities?.name || '-',
      sku: b.commodities?.commodity_code || '',
      category: parsed.category,
      details: parsed.details,
      user: b.voided_by_name || 'Admin',
      date: b.deleted_at,
      statusLabel: 'Voided',
      statusClass: 'danger',
      batchObj: b
    });
  });

  // 2. Depleted Batches
  (depletedBatches || []).forEach(b => {
    allItems.push({
      id: b.id,
      kind: 'batch-depleted',
      code: b.batch_number,
      isBatch: true,
      name: b.commodities?.name || '-',
      sku: b.commodities?.commodity_code || '',
      category: 'Depleted',
      details: `Total distributed: ${(b.totalDistributed || 0).toLocaleString()} ${b.commodities?.unit || 'units'}`,
      user: 'Distribution',
      date: b.updated_at,
      statusLabel: 'Depleted',
      statusClass: 'muted',
      batchObj: b
    });
  });

  // 3. Archived Commodities
  (archivedCommodities || []).forEach(c => {
    allItems.push({
      id: c.id,
      kind: 'commodity-archived',
      code: c.commodity_code,
      isBatch: false,
      name: c.name,
      sku: c.commodity_code,
      category: 'Commodity',
      details: `Category: ${c.category} | Unit: ${c.unit}`,
      user: 'Admin',
      date: c.deleted_at,
      statusLabel: 'Archived',
      statusClass: 'warning',
      commObj: c
    });
  });

  // Sort by date desc
  allItems.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  let filtered = allItems;
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    filtered = filtered.filter(item => 
      item.code.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.details.toLowerCase().includes(q) ||
      item.user.toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) return renderArchiveEmpty('No archive records found.');

  return `
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Identifier</th>
            <th>Item / Commodity</th>
            <th>Archive Type</th>
            <th>Details &amp; Reason</th>
            <th>Actioned By</th>
            <th>Date</th>
            <th>Status</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(item => {
            let actionHtml = '';
            if (item.kind === 'batch-voided') {
              actionHtml = `
                <button class="btn-table-action restore-btn" data-id="${item.id}" type="button" title="Restore batch ${escapeHtml(item.code)}">
                  <span class="icon icon--sm" style="font-size: 15px;" aria-hidden="true">restore</span>
                  Restore
                </button>
              `;
            } else if (item.kind === 'batch-depleted') {
              actionHtml = `
                <button class="btn-table-action ledger-btn" data-id="${item.id}" type="button" title="View releases for batch ${escapeHtml(item.code)}">
                  <span class="icon icon--sm" style="font-size: 15px;" aria-hidden="true">receipt_long</span>
                  View Releases
                </button>
              `;
            } else if (item.kind === 'commodity-archived') {
              actionHtml = `
                <button class="btn-table-action restore-commodity-btn" data-id="${item.id}" data-name="${escapeHtml(item.name)}" type="button" title="Restore commodity ${escapeHtml(item.name)}">
                  <span class="icon icon--sm" style="font-size: 15px;" aria-hidden="true">restore</span>
                  Restore
                </button>
              `;
            }

            return `
              <tr>
                <td style="white-space: nowrap;">
                  ${item.isBatch ? renderBatchCodeBadge(item.code) : `<code class="code-badge">${escapeHtml(item.code)}</code>`}
                </td>
                <td>
                  <span style="font-weight: var(--font-weight-medium); color: var(--color-text);">
                    ${escapeHtml(item.name)}
                  </span>
                  ${item.sku && item.isBatch ? `
                    <br>
                    <span style="display: inline-block; margin-top: 2px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 0.74rem; font-weight: var(--font-weight-bold); color: var(--color-primary); letter-spacing: 0.03em;">
                      ${item.sku}
                    </span>
                  ` : ''}
                </td>
                <td style="white-space: nowrap;">
                  ${renderReasonBadge(item.category)}
                </td>
                <td style="color: var(--color-text); font-size: var(--font-size-sm); max-width: 240px; word-break: break-word;">
                  ${escapeHtml(item.details)}
                </td>
                <td style="white-space: nowrap; color: var(--color-text); font-weight: 500;">
                  ${escapeHtml(item.user)}
                </td>
                <td style="color: var(--color-text-muted); font-size: var(--font-size-sm); white-space: nowrap;">
                  ${formatDate(item.date)}
                </td>
                <td style="white-space: nowrap;">
                  <span class="badge badge-${item.statusClass}" style="font-size: 11px; padding: 2px 7px;">
                    ${item.statusLabel}
                  </span>
                </td>
                <td style="text-align: right; white-space: nowrap;">
                  <div class="table-actions">
                    ${actionHtml}
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
