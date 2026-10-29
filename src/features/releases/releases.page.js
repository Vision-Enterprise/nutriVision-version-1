/**
 * Releases Ledger Page (Controller)
 *
 * Coordinates releases ledger state, filters (barangay/commodity/search),
 * and row expansion for supplier & release notes.
 *
 * MVC Controller: delegates HTML template strings to .render.js.
 */

import { fetchReleases } from './releases.service.js';
import { renderReleasesLayout, renderReleasesTable, renderEmpty, escapeHtml } from './releases.render.js';

let _releases = [];
let _filterBarangay = 'all';
let _filterCommodity = 'all';
let _searchTerm = '';

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
          <span>${escapeHtml(error)}</span>
        </div>`;
      return;
    }

    _releases = releases;
    _renderMainView(contentContainer);
  } catch (err) {
    contentContainer.innerHTML = '<div style="color:red; padding: 20px;"><h1>ERROR:</h1><pre>' + err.stack + '</pre></div>';
  }
}

function _renderMainView(container) {
  const commodities = Array.from(new Set(_releases.map(r => r.batches?.commodities?.name).filter(Boolean))).sort();
  const filtered = _applyFilters();

  container.innerHTML = renderReleasesLayout({
    releases: _releases,
    commodities,
    filtered,
    filterCommodity: _filterCommodity,
    filterBarangay: _filterBarangay,
    searchTerm: _searchTerm,
  });

  _attachEventListeners();
}

function _applyFilters() {
  const q = _searchTerm.trim().toLowerCase();

  return _releases.filter(r => {
    const matchComm = _filterCommodity === 'all' || r.batches?.commodities?.name === _filterCommodity;
    const matchBrgy = _filterBarangay === 'all' || r.barangay === _filterBarangay;
    const matchSearch = !q || [
      r.batches?.batch_number,
      r.batches?.commodities?.name,
      r.batches?.commodities?.commodity_code,
      r.barangay,
      r.recipient_name,
      r.profiles?.full_name,
      r.batches?.supplier,
      r.notes,
    ].some(val => String(val ?? '').toLowerCase().includes(q));

    return matchComm && matchBrgy && matchSearch;
  });
}

function _refreshTable() {
  const region = document.getElementById('releases-table-region');
  if (!region) return;
  const filtered = _applyFilters();
  const hasFilters = _filterCommodity !== 'all' || _filterBarangay !== 'all' || Boolean(_searchTerm.trim());
  region.innerHTML = filtered.length === 0 ? renderEmpty(hasFilters) : renderReleasesTable(filtered);
}

function _attachEventListeners() {
  document.getElementById('filter-commodity')?.addEventListener('change', e => {
    _filterCommodity = e.target.value;
    _refreshTable();
  });

  document.getElementById('filter-barangay')?.addEventListener('change', e => {
    _filterBarangay = e.target.value;
    _refreshTable();
  });

  document.getElementById('release-search')?.addEventListener('input', e => {
    _searchTerm = e.target.value;
    _refreshTable();
  });

  document.getElementById('releases-table-region')?.addEventListener('click', e => {
    const row = e.target.closest('.release-row');
    if (row) {
      const noteRow = document.getElementById('rn-' + row.dataset.id);
      if (noteRow) {
        noteRow.style.display = noteRow.style.display === 'none' ? 'table-row' : 'none';
      }
    }
  });
}
