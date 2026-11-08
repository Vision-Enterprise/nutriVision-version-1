/**
 * Commodity Management - View (Render)
 *
 * Pure presentation functions returning HTML strings for both Card Grid (#87)
 * and Table views. Zero database calls.
 */

import { COMMODITY_CATEGORIES, COMMODITY_UNITS, SHELF_LIFE_MODES } from '../../shared/constants/app.constants.js';
import { resolveShelfLifePolicy, formatPolicyRanges } from '../../shared/utils/shelf-life.utils.js';
import { getCategoryArtwork } from './commodity-image.utils.js';

function formatShortDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getDynamicCategories(commodities) {
  const dynamicCats = commodities.map(c => c.category).filter(Boolean);
  const uniqueCats = Array.from(new Set([...COMMODITY_CATEGORIES, ...dynamicCats]));
  return uniqueCats.sort((a, b) => {
    if (a.toLowerCase() === 'other') return 1;
    if (b.toLowerCase() === 'other') return -1;
    return a.localeCompare(b);
  });
}

export function getDynamicUnits(commodities) {
  const dynamicUnits = commodities.map(c => c.unit).filter(Boolean);
  return Array.from(new Set([...COMMODITY_UNITS, ...dynamicUnits])).sort();
}

export function renderCommoditiesLayout({
  commodities,
  filtered,
  search,
  category,
  viewMode = 'cards',
  stockMap = {},
}) {
  const categories = getDynamicCategories(commodities);
  const isCards = viewMode !== 'table';
  const hasFilter = Boolean(search || category !== 'all');

  return `
    <!-- Page header row -->
    <div style="display: flex; align-items: flex-start; justify-content: space-between;
                gap: var(--space-4); flex-wrap: wrap; margin-bottom: var(--space-6);">
      <div>
        <h1 class="page-header__title">Commodity Management</h1>
        <p class="page-header__subtitle">
          ${commodities.length} commodity type${commodities.length !== 1 ? 's' : ''} registered
        </p>
      </div>
      <button id="add-commodity-btn" class="btn btn-primary" type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Add Commodity
      </button>
    </div>

    <!-- Filters + View Mode Toggle -->
    <div class="commodity-toolbar">
      <div class="commodity-toolbar__filters">
        <div style="position: relative; flex: 1; min-width: 200px; max-width: 320px;">
          <svg style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
                      color: var(--color-text-muted); pointer-events: none;"
               width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            id="commodity-search"
            type="search"
            class="form-input"
            placeholder="Search by name or code..."
            value="${escapeHtml(search)}"
            style="padding-left: 36px;"
            aria-label="Search commodities"
          />
        </div>
        <select id="commodity-category-filter" class="form-input" style="max-width: 210px;"
                aria-label="Filter by category">
          <option value="all">All Categories</option>
          ${categories.map(cat =>
            `<option value="${escapeHtml(cat)}" ${category === cat ? 'selected' : ''}>${escapeHtml(cat)}</option>`
          ).join('')}
        </select>
      </div>

      <div class="commodity-view-toggle" role="group" aria-label="View layout">
        <button
          type="button"
          class="commodity-view-toggle__btn ${isCards ? 'is-active' : ''}"
          data-view-mode="cards"
          aria-pressed="${isCards ? 'true' : 'false'}"
          title="Card Grid View"
        >
          <span class="icon" style="font-size: 16px;" aria-hidden="true">grid_view</span>
          Cards
        </button>
        <button
          type="button"
          class="commodity-view-toggle__btn ${!isCards ? 'is-active' : ''}"
          data-view-mode="table"
          aria-pressed="${!isCards ? 'true' : 'false'}"
          title="Compact Table View"
        >
          <span class="icon" style="font-size: 16px;" aria-hidden="true">table_rows</span>
          Table
        </button>
      </div>
    </div>

    <!-- Commodity count after filter -->
    <p data-count-label
       style="display: ${hasFilter ? 'block' : 'none'}; font-size: var(--font-size-sm); color: var(--color-text-muted); margin-bottom: var(--space-3);">
      Showing ${filtered.length} of ${commodities.length} commodities
    </p>

    <!-- Cards / Table / Empty state -->
    <div id="commodity-table-region">
      ${filtered.length === 0
        ? renderEmpty(hasFilter)
        : (isCards ? renderCards(filtered, stockMap) : renderTable(filtered, stockMap))}
    </div>
  `;
}

/**
 * Render responsive Card Grid displaying commodity image, SKU, category/unit,
 * shelf-life policy, live active stock, description, and actions (#87).
 */
export function renderCards(commodities, stockMap = {}) {
  return `
    <div class="commodity-card-grid">
      ${commodities.map(c => {
        const policy = resolveShelfLifePolicy(c);
        const ranges = formatPolicyRanges(policy);
        const art = getCategoryArtwork(c);
        const hasPhoto = Boolean(c.image_url && String(c.image_url).trim());
        const stock = stockMap[c.id] || { activeBatchCount: 0, totalUnits: 0, urgentBatchCount: 0 };
        const isStandardPolicy = policy.mode === SHELF_LIFE_MODES.STANDARD;
        const policyBadgeLabel = policy.badgeLabel || 'Standard Shelf';

        return `
          <article class="commodity-card" data-commodity-id="${c.id}">
            <div class="commodity-card__media ${hasPhoto ? 'commodity-card__media--has-photo' : ''}"
                 ${hasPhoto ? `data-preview-id="${c.id}" title="Click to preview full photo"` : ''}
                 style="${hasPhoto ? '' : `background: ${art.bgGradient};`}">
              ${hasPhoto
                ? `<img class="commodity-card__photo" src="${escapeHtml(c.image_url)}" alt="${escapeHtml(c.name)}" loading="lazy" />`
                : `<div class="commodity-card__artwork">${art.svgHtml}</div>`}
              <div class="commodity-card__badges">
                <code class="commodity-card__sku">${escapeHtml(c.commodity_code)}</code>
                <span class="commodity-card__policy-pill ${isStandardPolicy ? 'commodity-card__policy-pill--standard' : ''}"
                      title="${escapeHtml(policy.label)}">
                  ${escapeHtml(policyBadgeLabel)}
                </span>
              </div>
            </div>

            <div class="commodity-card__body">
              <div>
                <h3 class="commodity-card__title">${escapeHtml(c.name)}</h3>
                <div class="commodity-card__meta" style="margin-top: 6px;">
                  <span class="commodity-card__chip"
                        style="background: ${art.badgeBg}; color: ${art.accentColor}; border-color: transparent;">
                    ${escapeHtml(c.category || 'Uncategorized')}
                  </span>
                  <span class="commodity-card__chip">
                    Unit: ${escapeHtml(c.unit || '—')}
                  </span>
                </div>
              </div>

              <!-- Live Active Stock Snapshot -->
              <div class="commodity-card__stock ${stock.activeBatchCount > 0 ? 'commodity-card__stock--active' : ''}">
                <div style="display:flex; align-items:center; gap:6px; min-width:0;">
                  <span class="icon" style="font-size:15px; color:${stock.activeBatchCount > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)'};">inventory_2</span>
                  ${stock.activeBatchCount > 0
                    ? `<span style="color:var(--color-text); font-weight:600;">
                         <strong>${stock.totalUnits.toLocaleString()}</strong> ${escapeHtml(c.unit || 'units')}
                         <span style="color:var(--color-text-muted); font-weight:500;">&middot; ${stock.activeBatchCount} batch${stock.activeBatchCount !== 1 ? 'es' : ''}</span>
                       </span>`
                    : `<span style="color:var(--color-text-muted);">0 active stock</span>`}
                </div>
                ${stock.urgentBatchCount > 0
                  ? `<span style="padding:1px 7px; border-radius:999px; font-size:10.5px; font-weight:700; background:#fef3c7; color:#b45309; border:1px solid #fde68a; white-space:nowrap;"
                           title="${stock.urgentBatchCount} active batch(es) Near Expiry or Expired">
                       ${stock.urgentBatchCount} urgent
                     </span>`
                  : ''}
              </div>

              <!-- Compact Shelf-Life Threshold Summary -->
              <div style="font-size: 11px; color: var(--color-text-muted); line-height: 1.4;">
                <strong style="color: var(--color-text-secondary);">FEFO:</strong>
                Good ${escapeHtml(ranges.goodRange)} &bull; Mod ${escapeHtml(ranges.moderateRange)} &bull; Near ${escapeHtml(ranges.nearRange)}
              </div>

              <!-- Description -->
              <p class="commodity-card__desc" title="${escapeHtml(c.description || '')}">
                ${c.description
                  ? escapeHtml(c.description)
                  : '<em style="opacity:0.75;">No description provided.</em>'}
              </p>
            </div>

            <div class="commodity-card__footer">
              <span class="commodity-card__date">Added ${formatShortDate(c.created_at)}</span>
              <div class="table-actions">
                <button
                  class="btn-table-action graph-commodity-btn"
                  data-id="${c.id}"
                  aria-label="View lineage graph for ${escapeHtml(c.name)}"
                  type="button"
                  title="View Batch Lineage & Traceability Graph"
                >
                  <span class="icon icon--sm" style="font-size: 16px;">account_tree</span>
                  Graph
                </button>
                <button
                  class="btn-table-icon edit-commodity-btn"
                  data-id="${c.id}"
                  aria-label="Edit ${escapeHtml(c.name)}"
                  title="Edit ${escapeHtml(c.name)}"
                  type="button"
                >
                  <span class="icon" aria-hidden="true">edit</span>
                </button>
                <button
                  class="btn-table-icon btn-table-icon--danger delete-commodity-btn"
                  data-id="${c.id}"
                  aria-label="Archive ${escapeHtml(c.name)}"
                  title="Archive ${escapeHtml(c.name)}"
                  type="button"
                >
                  <span class="icon" aria-hidden="true">delete</span>
                </button>
              </div>
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;
}

export function renderTable(commodities, stockMap = {}) {
  return `
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Commodity</th>
            <th>Category</th>
            <th>Unit</th>
            <th>Active Stock</th>
            <th>Date Added</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${commodities.map(c => {
            const policy = resolveShelfLifePolicy(c);
            const ranges = formatPolicyRanges(policy);
            const art = getCategoryArtwork(c);
            const hasPhoto = Boolean(c.image_url && String(c.image_url).trim());
            const stock = stockMap[c.id] || { activeBatchCount: 0, totalUnits: 0, urgentBatchCount: 0 };
            const policyPill = policy.badgeLabel
              ? `<span style="display:inline-flex; align-items:center; gap:3px; margin-left:6px; padding:1px 7px; border-radius:999px; font-size:10.5px; font-weight:600; background:rgba(217,119,6,0.12); color:#b45309; border:1px solid rgba(217,119,6,0.28); vertical-align:middle;" title="${escapeHtml(policy.label)}">${escapeHtml(policy.badgeLabel)}</span>`
              : '';
            return `
            <tr class="commodity-row" data-commodity-id="${c.id}" style="cursor: pointer;" title="Click to view description & shelf-life policy">
              <td>
                <code class="code-badge">${escapeHtml(c.commodity_code)}</code>
              </td>
              <td>
                <div style="display:flex; align-items:center; gap:10px;">
                  <span class="commodity-table-thumb" style="${hasPhoto ? '' : `background: ${art.bgGradient};`}">
                    ${hasPhoto
                      ? `<img src="${escapeHtml(c.image_url)}" alt="${escapeHtml(c.name)}" loading="lazy" />`
                      : art.svgHtml}
                  </span>
                  <span style="font-weight: var(--font-weight-medium);">${escapeHtml(c.name)}${policyPill}</span>
                </div>
              </td>
              <td>${escapeHtml(c.category)}</td>
              <td>${escapeHtml(c.unit)}</td>
              <td style="font-size: var(--font-size-sm); white-space: nowrap;">
                ${stock.activeBatchCount > 0
                  ? `<strong>${stock.totalUnits.toLocaleString()}</strong> ${escapeHtml(c.unit)} <span style="color:var(--color-text-muted);">(${stock.activeBatchCount})</span>`
                  : '<span style="color:var(--color-text-muted);">0</span>'}
              </td>
              <td style="color: var(--color-text-muted); font-size: var(--font-size-sm); font-variant-numeric: tabular-nums; white-space: nowrap;">
                ${formatShortDate(c.created_at)}
              </td>
              <td style="text-align: right; white-space: nowrap;">
                <div class="table-actions">
                  <button
                    class="btn-table-action graph-commodity-btn"
                    data-id="${c.id}"
                    aria-label="View lineage graph for ${escapeHtml(c.name)}"
                    type="button"
                    title="View Batch Lineage & Traceability Graph"
                  >
                    <span class="icon icon--sm" style="font-size: 16px;">account_tree</span>
                    Graph
                  </button>
                  <button
                    class="btn-table-icon edit-commodity-btn"
                    data-id="${c.id}"
                    aria-label="Edit ${escapeHtml(c.name)}"
                    title="Edit ${escapeHtml(c.name)}"
                    type="button"
                  >
                    <span class="icon" aria-hidden="true">edit</span>
                  </button>
                  <button
                    class="btn-table-icon btn-table-icon--danger delete-commodity-btn"
                    data-id="${c.id}"
                    aria-label="Archive ${escapeHtml(c.name)}"
                    title="Archive ${escapeHtml(c.name)}"
                    type="button"
                  >
                    <span class="icon" aria-hidden="true">delete</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr class="commodity-desc-row" id="desc-${c.id}" style="display: none; background: var(--color-surface-alt);">
              <td colspan="7" style="padding: var(--space-3) var(--space-4); border-top: 1px solid var(--color-border-subtle); border-bottom: 1px solid var(--color-border-subtle);">
                <div style="display: flex; flex-wrap: wrap; gap: var(--space-5); align-items: flex-start;">
                  <div style="display: flex; gap: var(--space-2); align-items: flex-start; min-width: 260px;">
                    <span class="icon icon--sm" style="color: var(--color-primary); margin-top: 2px;">schedule</span>
                    <div style="font-size: var(--font-size-sm); line-height: 1.5;">
                      <strong style="color: var(--color-text-secondary);">Shelf-Life Policy:</strong>
                      <span style="color: var(--color-text); font-weight: 600;">${escapeHtml(policy.shortLabel)}</span>
                      <div style="font-size: 11.5px; color: var(--color-text-muted); margin-top: 2px;">
                        Good: ${escapeHtml(ranges.goodRange)} &bull; Moderate: ${escapeHtml(ranges.moderateRange)} &bull; Near: ${escapeHtml(ranges.nearRange)}
                      </div>
                    </div>
                  </div>
                  <div style="display: flex; gap: var(--space-2); align-items: flex-start; flex: 1; min-width: 240px;">
                    <span class="icon icon--sm" style="color: var(--color-text-muted); margin-top: 2px;">info</span>
                    <div style="font-size: var(--font-size-sm); color: var(--color-text-muted); line-height: 1.5; white-space: pre-wrap;">
                      ${c.description ? escapeHtml(c.description) : '<em>No description provided.</em>'}
                    </div>
                  </div>
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

export function renderEmpty(hasFilters = false) {
  return `
    <div style="text-align: center; padding: var(--space-16) var(--space-8);
                color: var(--color-text-muted);">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="1.5"
           stroke-linecap="round" stroke-linejoin="round"
           style="margin: 0 auto var(--space-4); display: block; opacity: 0.4;">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8
                 a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      </svg>
      <p style="font-size: var(--font-size-base); font-weight: var(--font-weight-medium);
                margin-bottom: var(--space-1);">
        ${hasFilters ? 'No matching commodities' : 'No commodities yet'}
      </p>
      <p style="font-size: var(--font-size-sm);">
        ${hasFilters
          ? 'Try adjusting your search or filter.'
          : 'Click "Add Commodity" to register the first one.'}
      </p>
    </div>
  `;
}

export function renderErrorAlert(message) {
  return `
    <div class="alert alert-error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
}
