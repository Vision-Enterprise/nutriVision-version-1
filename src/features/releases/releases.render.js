/**
 * Releases Ledger - View (Render)
 *
 * Pure HTML rendering functions for the Releases Ledger.
 */

import { BARANGAYS } from '../../shared/constants/app.constants.js';
import { renderBatchCodeBadge } from '../batches/batches.render.js';

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatReleaseDateParts(dateString) {
  if (!dateString) return { date: 'N/A', time: '' };
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return { date: String(dateString), time: '' };

  const date = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(d);

  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);

  return { date, time };
}

export function renderReleasesLayout({ releases, commodities, filtered, filterCommodity, filterBarangay, searchTerm = '' }) {
  const hasFilters = filterCommodity !== 'all' || filterBarangay !== 'all' || Boolean(searchTerm);

  return `
    <div class="page-header" style="margin-bottom: var(--space-5);">
      <div>
        <h1 class="page-header__title">Releases Ledger</h1>
        <p class="page-header__subtitle">${releases.length} total release${releases.length !== 1 ? 's' : ''} recorded</p>
      </div>
    </div>

    <!-- Filters Bar -->
    <div style="display: flex; gap: var(--space-3); margin-bottom: var(--space-4); flex-wrap: wrap; align-items: center;">
      <select id="filter-commodity" class="form-input" style="max-width: 260px;" aria-label="Filter by commodity">
        <option value="all">All Commodities</option>
        ${commodities.map(c => `<option value="${escapeHtml(c)}" ${filterCommodity === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
      </select>

      <select id="filter-barangay" class="form-input" style="max-width: 220px;" aria-label="Filter by barangay">
        <option value="all">All Barangays</option>
        ${BARANGAYS ? BARANGAYS.map(b => `<option value="${escapeHtml(b)}" ${filterBarangay === b ? 'selected' : ''}>${escapeHtml(b)}</option>`).join('') : ''}
      </select>

      <div style="position: relative; flex: 1; min-width: 220px; max-width: 360px;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); pointer-events: none;">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input id="release-search" type="search" class="form-input"
               placeholder="Search batch #, commodity, recipient, or barangay..."
               value="${escapeHtml(searchTerm)}"
               style="padding-left: 34px; width: 100%;"
               aria-label="Search releases" />
      </div>
    </div>

    ${hasFilters ? `
      <p style="font-size: var(--font-size-sm); color: var(--color-text-muted); margin-bottom: var(--space-3);">
        Showing ${filtered.length} of ${releases.length} releases
      </p>` : ''}

    <div id="releases-table-region">
      ${filtered.length === 0 ? renderEmpty(hasFilters) : renderReleasesTable(filtered)}
    </div>
  `;
}

export function renderReleasesTable(list) {
  return `
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Batch #</th>
            <th>Commodity</th>
            <th>Qty Released</th>
            <th>Destination</th>
            <th>Recipient</th>
            <th>Date &amp; Time</th>
            <th>Released By</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(r => {
            const { date, time } = formatReleaseDateParts(r.released_at);
            const qtyFormatted = Number(r.quantity || 0).toLocaleString();
            const unit = escapeHtml(r.batches?.commodities?.unit ?? '');
            const sku = escapeHtml(r.batches?.commodities?.commodity_code ?? '');

            return `
              <tr class="release-row" data-id="${r.id}" style="cursor: pointer;" title="Click to view supplier & release notes">
                <td style="white-space: nowrap;">
                  ${renderBatchCodeBadge(r.batches?.batch_number)}
                </td>
                <td>
                  <span style="font-weight: var(--font-weight-medium); color: var(--color-text);">
                    ${escapeHtml(r.batches?.commodities?.name ?? '—')}
                  </span>
                  ${sku ? `
                    <br>
                    <span style="display: inline-block; margin-top: 2px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 0.74rem; font-weight: var(--font-weight-bold); color: var(--color-primary); letter-spacing: 0.03em;">
                      ${sku}
                    </span>
                  ` : ''}
                </td>
                <td style="font-weight: var(--font-weight-bold); color: var(--color-primary); white-space: nowrap; font-variant-numeric: tabular-nums;">
                  ${qtyFormatted} ${unit}
                </td>
                <td style="white-space: nowrap;">
                  <span style="display: inline-flex; align-items: center; gap: 5px; font-weight: var(--font-weight-medium); color: var(--color-text);">
                    <span class="icon icon--sm" style="font-size: 14px; color: var(--color-primary);">location_on</span>
                    ${escapeHtml(r.barangay || '—')}
                  </span>
                </td>
                <td style="font-weight: var(--font-weight-medium); color: var(--color-text); white-space: nowrap;">
                  ${escapeHtml(r.recipient_name) || '—'}
                </td>
                <td style="white-space: nowrap; font-variant-numeric: tabular-nums;">
                  <div style="font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--color-text);">
                    ${escapeHtml(date)}
                  </div>
                  ${time ? `
                    <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 1px;">
                      ${escapeHtml(time)}
                    </div>
                  ` : ''}
                </td>
                <td style="font-size: var(--font-size-sm); color: var(--color-text-secondary); white-space: nowrap;">
                  ${escapeHtml(r.profiles?.full_name || 'Staff')}
                </td>
              </tr>
              <tr id="rn-${r.id}" class="release-note-row" style="display: none; background: var(--color-surface-alt);">
                <td colspan="7" style="padding: var(--space-3) var(--space-5); border-top: 1px solid var(--color-border-subtle); border-bottom: 1px solid var(--color-border-subtle);">
                  <div style="display: flex; flex-wrap: wrap; gap: var(--space-6); align-items: flex-start;">
                    <div style="display: flex; gap: var(--space-2); align-items: center; min-width: 220px;">
                      <span class="icon icon--sm" style="color: var(--color-primary); font-size: 16px;">business</span>
                      <div style="font-size: var(--font-size-sm); line-height: 1.4;">
                        <span style="font-weight: 600; color: var(--color-text-secondary); margin-right: 6px;">Supplier / Source:</span>
                        <span style="color: var(--color-text); font-weight: 500;">${r.batches?.supplier ? escapeHtml(r.batches.supplier) : '<em style="color: var(--color-text-muted); font-weight: 400;">Not specified</em>'}</span>
                      </div>
                    </div>
                    <div style="display: flex; gap: var(--space-2); align-items: flex-start; flex: 1; min-width: 260px;">
                      <span class="icon icon--sm" style="color: var(--color-text-muted); font-size: 16px; margin-top: 2px;">info</span>
                      <div style="font-size: var(--font-size-sm); line-height: 1.4; white-space: pre-wrap;"><span style="font-weight: 600; color: var(--color-text-secondary); margin-right: 6px;">Release Notes:</span><span style="color: var(--color-text-muted);">${r.notes ? escapeHtml(r.notes) : '<em>No notes provided.</em>'}</span></div>
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
    <div style="text-align: center; padding: var(--space-16) var(--space-8); color: var(--color-text-muted);">
      <p>${hasFilters ? 'No release records match the selected filters.' : 'No release records found.'}</p>
    </div>
  `;
}
