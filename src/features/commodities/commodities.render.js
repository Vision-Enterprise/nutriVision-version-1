/**
 * Commodity Management - View (Render)
 *
 * Pure presentation functions returning HTML strings.
 * Zero database calls.
 */

import { formatDate } from '../../shared/utils/date.utils.js';
import { COMMODITY_CATEGORIES, COMMODITY_UNITS } from '../../shared/constants/app.constants.js';

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

export function renderCommoditiesLayout({ commodities, filtered, search, category }) {
  const categories = getDynamicCategories(commodities);

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

    <!-- Filters -->
    <div style="display: flex; gap: var(--space-3); margin-bottom: var(--space-4); flex-wrap: wrap;">
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
      <select id="commodity-category-filter" class="form-input" style="max-width: 200px;"
              aria-label="Filter by category">
        <option value="all">All Categories</option>
        ${categories.map(cat =>
          `<option value="${cat}" ${category === cat ? 'selected' : ''}>${cat}</option>`
        ).join('')}
      </select>
    </div>

    <!-- Commodity count after filter -->
    ${search || category !== 'all' ? `
      <p style="font-size: var(--font-size-sm); color: var(--color-text-muted);
                margin-bottom: var(--space-3);">
        Showing ${filtered.length} of ${commodities.length} commodities
      </p>
    ` : ''}

    <!-- Table or empty state -->
    <div id="commodity-table-region">
      ${filtered.length === 0 ? renderEmpty(Boolean(search || category !== 'all')) : renderTable(filtered)}
    </div>
  `;
}

export function renderTable(commodities) {
  return `
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Category</th>
            <th>Unit</th>
            <th>Date Added</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${commodities.map(c => `
            <tr class="commodity-row" data-commodity-id="${c.id}" style="cursor: pointer;" title="Click to view description">
              <td>
                <code style="font-size: var(--font-size-xs);
                             background: var(--color-surface-alt);
                             color: var(--color-primary);
                             padding: 2px 8px;
                             border-radius: var(--radius-sm);
                             font-weight: var(--font-weight-medium);
                             letter-spacing: 0.05em;">
                  ${escapeHtml(c.commodity_code)}
                </code>
              </td>
              <td style="font-weight: var(--font-weight-medium);">${escapeHtml(c.name)}</td>
              <td>${escapeHtml(c.category)}</td>
              <td>${escapeHtml(c.unit)}</td>
              <td style="color: var(--color-text-muted); font-size: var(--font-size-sm);">
                ${formatDate(c.created_at)}
              </td>
              <td style="text-align: right; white-space: nowrap;">
                <button
                  class="btn btn-ghost btn-sm edit-commodity-btn"
                  data-id="${c.id}"
                  aria-label="Edit ${escapeHtml(c.name)}"
                  type="button"
                >Edit</button>
                <button
                  class="btn btn-ghost btn-sm delete-commodity-btn"
                  data-id="${c.id}"
                  style="color: var(--color-danger);"
                  aria-label="Delete ${escapeHtml(c.name)}"
                  type="button"
                >Delete</button>
              </td>
            </tr>
            <tr class="commodity-desc-row" id="desc-${c.id}" style="display: none; background: var(--color-surface-alt);">
              <td colspan="6" style="padding: var(--space-3) var(--space-4); border-top: 1px solid var(--color-border-subtle); border-bottom: 1px solid var(--color-border-subtle);">
                <div style="display: flex; gap: var(--space-2); align-items: flex-start;">
                  <span class="icon icon--sm" style="color: var(--color-text-muted); margin-top: 2px;">info</span>
                  <div style="font-size: var(--font-size-sm); color: var(--color-text-muted); line-height: 1.5; white-space: pre-wrap;">
                    ${c.description ? escapeHtml(c.description) : '<em>No description provided.</em>'}
                  </div>
                </div>
              </td>
            </tr>
          `).join('')}
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
