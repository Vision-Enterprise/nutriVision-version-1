import { fetchReleases } from './releases.service.js';
import { formatDateTime } from '../../shared/utils/date.utils.js';
import { BARANGAYS } from '../../shared/constants/app.constants.js';

let _releases = [];
let _filterBarangay = 'all';
let _filterCommodity = 'all';

export async function renderReleasesPage(profile) {
  const contentContainer = document.getElementById('page-content');
  if (!contentContainer) return;
  try {
  contentContainer.innerHTML = `
    <div style="padding: var(--space-8); text-align: center;">
      <svg class="spinner" viewBox="0 0 24 24" style="width: 32px; height: 32px; color: var(--color-primary);">
        <circle class="path" cx="12" cy="12" r="10" fill="none" stroke-width="3"></circle>
      </svg>
      <p style="margin-top: var(--space-4); color: var(--color-text-muted);">Loading releases ledger...</p>
    </div>
  `;

  const { releases, error } = await fetchReleases();
  if (error) {
    contentContainer.innerHTML = `
      <div class="alert alert-error" style="margin: var(--space-4);">
        <span>${_escHtml(error)}</span>
      </div>`;
    return;
  }

  _releases = releases;

  // Extract unique commodities for filter
  const commodities = Array.from(new Set(_releases.map(r => r.batches?.commodities?.name).filter(Boolean))).sort();

  contentContainer.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-header__title">Releases Ledger</h1>
        <p class="page-header__subtitle">${_releases.length} total releases</p>
      </div>
    </div>

    <div style="display: flex; gap: var(--space-4); margin-bottom: var(--space-4); flex-wrap: wrap;">
      <select id="filter-commodity" class="form-input" style="max-width: 250px;">
        <option value="all">All Commodities</option>
        ${commodities.map(c => `<option value="${c}">${c}</option>`).join('')}
      </select>
      <select id="filter-barangay" class="form-input" style="max-width: 250px;">
        <option value="all">All Barangays</option>
        ${BARANGAYS ? BARANGAYS.map(b => `<option value="${b}">${b}</option>`).join('') : ''}
      </select>
    </div>

    <div id="releases-table-region">
      ${_renderTable(_releases)}
    </div>
  `;

  document.getElementById('filter-commodity').addEventListener('change', e => {
    _filterCommodity = e.target.value;
    _refreshTable();
  });
  document.getElementById('filter-barangay').addEventListener('change', e => {
    _filterBarangay = e.target.value;
    _refreshTable();
  });
  } catch (err) {
    contentContainer.innerHTML = '<div style="color:red; padding: 20px;"><h1>ERROR:</h1><pre>' + err.stack + '</pre></div>';
  }
}

function _refreshTable() {
  const region = document.getElementById('releases-table-region');
  if (!region) return;
  const filtered = _releases.filter(r => {
    const matchComm = _filterCommodity === 'all' || r.batches?.commodities?.name === _filterCommodity;
    const matchBrgy = _filterBarangay === 'all' || r.barangay === _filterBarangay;
    return matchComm && matchBrgy;
  });
  region.innerHTML = filtered.length === 0 ? _renderEmpty() : _renderTable(filtered);
}

function _renderTable(list) {
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
            <th>Released By</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(r => `
            <tr style="cursor: pointer;" onclick="const d = document.getElementById('rn-${r.id}'); d.style.display = d.style.display === 'none' ? 'table-row' : 'none';">
              <td style="color:var(--color-text-muted); font-size:var(--font-size-sm);">
                ${formatDateTime(r.released_at)}
              </td>
              <td style="font-weight:var(--font-weight-medium);">
                ${_escHtml(r.batches?.commodities?.name)}
              </td>
              <td>
                <code style="font-size:var(--font-size-xs); background:var(--color-surface-alt); padding:2px 8px; border-radius:var(--radius-sm);">
                  ${_escHtml(r.batches?.batch_number)}
                </code>
              </td>
              <td style="font-weight:bold; color:var(--color-primary);">
                ${r.quantity} ${_escHtml(r.batches?.commodities?.unit)}
              </td>
              <td>${_escHtml(r.barangay)}</td>
              <td style="font-size:var(--font-size-sm);">${_escHtml(r.profiles?.full_name)}</td>
            </tr>
            <tr id="rn-${r.id}" style="display:none; background:var(--color-surface-alt);">
              <td colspan="6" style="padding:var(--space-2) var(--space-4); border-bottom: 1px solid var(--color-border-subtle); color:var(--color-text-muted); font-size:var(--font-size-sm);">
                <strong>Notes:</strong> ${_escHtml(r.notes) || '<em>None</em>'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function _renderEmpty() {
  return `
    <div style="text-align:center; padding:var(--space-16) var(--space-8); color:var(--color-text-muted);">
      <p>No release records found.</p>
    </div>
  `;
}

function _escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
