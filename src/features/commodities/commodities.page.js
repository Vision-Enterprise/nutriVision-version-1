/**
 * Commodity Management Page (Controller)
 *
 * Coordinates state, user events, modals, and views.
 * MVC Controller: delegates HTML rendering to .render.js and modal flows to .modals.js.
 */

import { fetchCommodities } from './commodities.service.js';
import { renderCommoditiesLayout, renderTable, renderEmpty, renderErrorAlert } from './commodities.render.js';
import { openCommodityModal } from './commodities.modals.js';
import { SystemDialog } from '../../shared/components/dialog.component.js';

// ── State ───────────────────────────────────────────────────────────────────
let _commodities = [];
let _profile     = null;
let _search      = '';
let _category    = 'all';

// ── Entry Point ─────────────────────────────────────────────────────────────
export async function renderCommoditiesPage(profile) {
  _profile  = profile;
  _search   = '';
  _category = 'all';

  const content = document.getElementById('page-content');
  if (!content) return;

  // Loading indicator
  content.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Commodity Management</h1>
      <p class="page-header__subtitle">Manage registered nutrition commodity types</p>
    </div>
    <div class="loading-overlay">
      <div class="spinner spinner-lg"></div>
    </div>
  `;

  const { commodities, error } = await fetchCommodities();

  if (error) {
    content.innerHTML = `
      <div class="page-header">
        <h1 class="page-header__title">Commodity Management</h1>
        <p class="page-header__subtitle">Manage registered nutrition commodity types</p>
      </div>
      ${renderErrorAlert(error)}
    `;
    return;
  }

  let deletedIds = [];
  try {
    deletedIds = JSON.parse(sessionStorage.getItem('nutrivision_deleted_commodities') || '[]');
  } catch {}

  _commodities = (commodities || []).filter(c => !deletedIds.includes(c.id));
  _renderMainView(content);
}

// ── Page View Coordination ──────────────────────────────────────────────────
function _renderMainView(content) {
  const filtered = _applyFilters();

  content.innerHTML = renderCommoditiesLayout({
    commodities: _commodities,
    filtered,
    search: _search,
    category: _category,
  });

  _attachPageListeners(content);
}

function _applyFilters() {
  const q = _search.toLowerCase();
  return _commodities.filter(c => {
    const matchSearch = !q
      || c.name.toLowerCase().includes(q)
      || c.commodity_code.toLowerCase().includes(q);
    const matchCategory = _category === 'all' || c.category === _category;
    return matchSearch && matchCategory;
  });
}

function _refreshTable() {
  const region = document.getElementById('commodity-table-region');
  if (!region) return;
  const filtered = _applyFilters();

  const countEl = document.querySelector('[data-count-label]');
  if (countEl) countEl.textContent = `Showing ${filtered.length} of ${_commodities.length} commodities`;

  region.innerHTML = filtered.length === 0 ? renderEmpty(Boolean(_search || _category !== 'all')) : renderTable(filtered);
}

function _updateSubtitle() {
  const subtitle = document.querySelector('.page-header__subtitle');
  if (subtitle) {
    subtitle.textContent = `${_commodities.length} commodity type${_commodities.length !== 1 ? 's' : ''} registered`;
  }
}

// ── Event Handlers ──────────────────────────────────────────────────────────
function _attachPageListeners(content) {
  document.getElementById('add-commodity-btn')?.addEventListener('click', () => {
    openCommodityModal({
      mode: 'add',
      commodity: null,
      commodities: _commodities,
      profile: _profile,
      onSuccess: (savedCommodity) => {
        _commodities.unshift(savedCommodity);
        _commodities.sort((a, b) => a.name.localeCompare(b.name));
        _refreshTable();
        _updateSubtitle();
      }
    });
  });

  document.getElementById('commodity-search')?.addEventListener('input', e => {
    _search = e.target.value;
    _refreshTable();
  });

  document.getElementById('commodity-category-filter')?.addEventListener('change', e => {
    _category = e.target.value;
    _refreshTable();
  });

  document.getElementById('commodity-table-region')?.addEventListener('click', async e => {
    const editBtn   = e.target.closest('.edit-commodity-btn');
    const deleteBtn = e.target.closest('.delete-commodity-btn');

    if (editBtn) {
      const commodity = _commodities.find(c => c.id === editBtn.dataset.id);
      if (commodity) {
        openCommodityModal({
          mode: 'edit',
          commodity,
          commodities: _commodities,
          profile: _profile,
          onSuccess: (updatedCommodity) => {
            const idx = _commodities.findIndex(c => c.id === updatedCommodity.id);
            if (idx !== -1) _commodities[idx] = updatedCommodity;
            _commodities.sort((a, b) => a.name.localeCompare(b.name));
            _refreshTable();
            _updateSubtitle();
          }
        });
      }
      return;
    }

    if (deleteBtn) {
      const commodity = _commodities.find(c => c.id === deleteBtn.dataset.id);
      if (commodity) _handleDelete(commodity);
      return;
    }

    const row = e.target.closest('.commodity-row');
    if (row) {
      const descRow = document.getElementById('desc-' + row.dataset.commodityId);
      if (descRow) {
        descRow.style.display = descRow.style.display === 'none' ? 'table-row' : 'none';
      }
    }
  });
}

async function _handleDelete(commodity) {
  const confirmed = await SystemDialog.confirm(
    `Delete "${commodity.name}" (${commodity.commodity_code})?\n\nThis will remove it from the active inventory list.`
  );
  if (!confirmed) return;

  // Frontend-only deletion: remove from memory and session store
  _commodities = _commodities.filter(c => c.id !== commodity.id);

  try {
    const deletedIds = JSON.parse(sessionStorage.getItem('nutrivision_deleted_commodities') || '[]');
    if (!deletedIds.includes(commodity.id)) {
      deletedIds.push(commodity.id);
      sessionStorage.setItem('nutrivision_deleted_commodities', JSON.stringify(deletedIds));
    }
  } catch {}

  _refreshTable();
  _updateSubtitle();
}
