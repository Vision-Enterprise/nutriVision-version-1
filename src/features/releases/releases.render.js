/**
 * Releases Ledger - View (Render)
 *
 * Pure HTML rendering functions for the Releases Ledger.
 */

import { formatDateTime } from '../../shared/utils/date.utils.js';
import { BARANGAYS } from '../../shared/constants/app.constants.js';

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function renderReleasesLayout({ releases, commodities, filtered, filterCommodity, filterBarangay }) {
  return `
    <div class="page-header">
      <div>
        <h1 class="page-header__title">Releases Ledger</h1>
        <p class="page-header__subtitle">${releases.length} total releases</p>
      </div>
    </div>

    <div style="display: flex; gap: var(--space-4); margin-bottom: var(--space-4); flex-wrap: wrap;">
      <select id="filter-commodity" class="form-input" style="max-width: 250px;">
        <option value="all">All Commodities</option>
        ${commodities.map(c => `<option value="${c}" ${filterCommodity === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
      <select id="filter-barangay" class="form-input" style="max-width: 250px;">
        <option value="all">All Barangays</option>
        ${BARANGAYS ? BARANGAYS.map(b => `<option value="${b}" ${filterBarangay === b ? 'selected' : ''}>${b}</option>`).join('') : ''}
      </select>
    </div>

    <div id="releases-table-region">
      ${filtered.length === 0 ? renderEmpty() : renderReleasesTable(filtered)}
    </div>
  `;
}

export function renderReleasesTable(list) {
  return `
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>Commodity</th>
            <th>Batch #</th>
            <th>Qty Released</th>
            <th>Destination</th>
            <th>Recipient</th>
            <th>Released By</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(r => `
            <tr class="release-row" data-id="${r.id}" style="cursor: pointer;">
              <td style="color:var(--color-text-muted); font-size:var(--font-size-sm);">
                ${formatDateTime(r.released_at)}
              </td>
              <td style="font-weight:var(--font-weight-medium);">
                ${escapeHtml(r.batches?.commodities?.name)}
              </td>
              <td>
                <code style="font-size:var(--font-size-xs); background:var(--color-surface-alt); padding:2px 8px; border-radius:var(--radius-sm);">
                  ${escapeHtml(r.batches?.batch_number)}
                </code>
              </td>
              <td style="font-weight:bold; color:var(--color-primary);">
                ${r.quantity} ${escapeHtml(r.batches?.commodities?.unit)}
              </td>
              <td>${escapeHtml(r.barangay)}</td>
              <td style="font-weight:var(--font-weight-medium);">${escapeHtml(r.recipient_name) || '-'}</td>
              <td style="font-size:var(--font-size-sm);">${escapeHtml(r.profiles?.full_name)}</td>
            </tr>
            <tr id="rn-${r.id}" class="release-note-row" style="display:none; background:var(--color-surface-alt);">
              <td colspan="7" style="padding:var(--space-2) var(--space-4); border-bottom: 1px solid var(--color-border-subtle); color:var(--color-text-muted); font-size:var(--font-size-sm);">
                <strong>Notes:</strong> ${escapeHtml(r.notes) || '<em>None</em>'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function renderEmpty() {
  return `
    <div style="text-align:center; padding:var(--space-16) var(--space-8); color:var(--color-text-muted);">
      <p>No release records found.</p>
    </div>
  `;
}
