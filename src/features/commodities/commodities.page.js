/**
 * Commodity Management Page (Controller)
 *
 * Coordinates state, user events, modals, and views for both Card Grid (#87)
 * and Table layouts.
 */

import {
  fetchCommodities,
  fetchCommodityStockSummaries,
  deleteCommodity,
  fetchActiveStockForCommodity,
} from './commodities.service.js';
import {
  renderCommoditiesLayout,
  renderCards,
  renderTable,
  renderEmpty,
  renderErrorAlert,
  escapeHtml,
} from './commodities.render.js';
import { openCommodityModal } from './commodities.modals.js';
import { openCommodityGraphModal } from './commodity-graph.modal.js';
import { getCategoryArtwork } from './commodity-image.utils.js';
import { SystemDialog } from '../../shared/components/dialog.component.js';

const VIEW_MODE_STORAGE_KEY = 'nutrivision_commodities_view_mode';

function getInitialViewMode() {
  try {
    return localStorage.getItem(VIEW_MODE_STORAGE_KEY) === 'table' ? 'table' : 'cards';
  } catch {
    return 'cards';
  }
}

function saveViewMode(mode) {
  try {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode === 'table' ? 'table' : 'cards');
  } catch {}
}

// ── State ───────────────────────────────────────────────────────────────────
let _commodities = [];
let _stockMap    = {};
let _profile     = null;
let _search      = '';
let _category    = 'all';
let _viewMode    = getInitialViewMode();

// ── Entry Point ─────────────────────────────────────────────────────────────
export async function renderCommoditiesPage(profile) {
  _profile  = profile;
  _search   = '';
  _category = 'all';
  _viewMode = getInitialViewMode();

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

  _commodities = commodities || [];
  const { stockMap } = await fetchCommodityStockSummaries(_commodities);
  _stockMap = stockMap || {};

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
    viewMode: _viewMode,
    stockMap: _stockMap,
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

function _refreshList() {
  const region = document.getElementById('commodity-table-region');
  if (!region) return;
  const filtered = _applyFilters();
  const hasFilter = Boolean(_search || _category !== 'all');

  const countEl = document.querySelector('[data-count-label]');
  if (countEl) {
    countEl.style.display = hasFilter ? 'block' : 'none';
    countEl.textContent = `Showing ${filtered.length} of ${_commodities.length} commodities`;
  }

  if (filtered.length === 0) {
    region.innerHTML = renderEmpty(hasFilter);
  } else if (_viewMode === 'table') {
    region.innerHTML = renderTable(filtered, _stockMap);
  } else {
    region.innerHTML = renderCards(filtered, _stockMap);
  }
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
        _syncCategoryDropdown();
        _refreshList();
        _updateSubtitle();
      }
    });
  });

  document.getElementById('commodity-search')?.addEventListener('input', e => {
    _search = e.target.value;
    _refreshList();
  });

  document.getElementById('commodity-category-filter')?.addEventListener('change', e => {
    _category = e.target.value;
    _refreshList();
  });

  content.querySelectorAll('.commodity-view-toggle__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const nextMode = btn.dataset.viewMode === 'table' ? 'table' : 'cards';
      if (nextMode === _viewMode) return;
      _viewMode = nextMode;
      saveViewMode(_viewMode);

      content.querySelectorAll('.commodity-view-toggle__btn').forEach(b => {
        const active = b.dataset.viewMode === _viewMode;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      _refreshList();
    });
  });

  const region = document.getElementById('commodity-table-region');

  // Graceful fallback to category artwork if an uploaded/external image fails to load
  region?.addEventListener('error', e => {
    const img = e.target;
    if (!img || img.tagName !== 'IMG') return;
    const cardEl = img.closest('[data-commodity-id]');
    const comm = cardEl ? _commodities.find(c => c.id === cardEl.dataset.commodityId) : null;
    const art = getCategoryArtwork(comm || {});
    const mediaHost = img.closest('.commodity-card__media, .commodity-table-thumb');
    if (mediaHost) {
      mediaHost.classList.remove('commodity-card__media--has-photo');
      mediaHost.removeAttribute('data-preview-id');
      mediaHost.style.background = art.bgGradient;
      img.replaceWith((() => {
        const wrap = document.createElement('div');
        wrap.className = 'commodity-card__artwork';
        wrap.innerHTML = art.svgHtml;
        return wrap;
      })());
    }
  }, true);

  region?.addEventListener('click', async e => {
    const graphBtn   = e.target.closest('.graph-commodity-btn');
    const editBtn    = e.target.closest('.edit-commodity-btn');
    const deleteBtn  = e.target.closest('.delete-commodity-btn');
    const previewBox = e.target.closest('.commodity-card__media[data-preview-id]');

    if (graphBtn) {
      e.stopPropagation();
      openCommodityGraphModal(graphBtn.dataset.id);
      return;
    }

    if (editBtn) {
      e.stopPropagation();
      const commodity = _commodities.find(c => c.id === editBtn.dataset.id);
      if (commodity) _openEditModal(commodity);
      return;
    }

    if (deleteBtn) {
      e.stopPropagation();
      const commodity = _commodities.find(c => c.id === deleteBtn.dataset.id);
      if (commodity) _handleDelete(commodity);
      return;
    }

    if (previewBox) {
      const commodity = _commodities.find(c => c.id === previewBox.dataset.previewId);
      if (commodity?.image_url) {
        _openPhotoPreviewModal(commodity);
      }
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

function _openEditModal(commodity) {
  openCommodityModal({
    mode: 'edit',
    commodity,
    commodities: _commodities,
    profile: _profile,
    onSuccess: async (updatedCommodity) => {
      const idx = _commodities.findIndex(c => c.id === updatedCommodity.id);
      if (idx !== -1) _commodities[idx] = updatedCommodity;
      _commodities.sort((a, b) => a.name.localeCompare(b.name));
      const { stockMap } = await fetchCommodityStockSummaries(_commodities);
      _stockMap = stockMap || {};
      _syncCategoryDropdown();
      _refreshList();
      _updateSubtitle();
    }
  });
}

function _syncCategoryDropdown() {
  const catSelect = document.getElementById('commodity-category-filter');
  if (!catSelect) return;
  const dynamicCats = Array.from(new Set(_commodities.map(c => c.category).filter(Boolean))).sort();
  const existingValues = new Set(Array.from(catSelect.options).map(o => o.value));
  dynamicCats.forEach(cat => {
    if (!existingValues.has(cat)) {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      catSelect.appendChild(opt);
    }
  });
}

function _openPhotoPreviewModal(commodity) {
  document.getElementById('commodity-photo-lightbox')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'commodity-photo-lightbox';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', `${commodity.name} photo preview`);

  overlay.innerHTML = `
    <div class="modal" style="max-width: 560px; width: 100%; overflow: hidden;">
      <div class="modal-header">
        <div>
          <h2 class="modal-title" style="margin-bottom:2px;">${escapeHtml(commodity.name)}</h2>
          <code class="code-badge">${escapeHtml(commodity.commodity_code)}</code>
        </div>
        <button type="button" class="modal-close" id="lightbox-close-btn" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="modal-body" style="padding: var(--space-4); display:flex; align-items:center; justify-content:center; background:#f8fafc;">
        <img src="${escapeHtml(commodity.image_url)}"
             alt="${escapeHtml(commodity.name)}"
             style="max-width:100%; max-height:65vh; border-radius:8px; object-fit:contain; box-shadow:0 4px 16px rgba(15,23,42,0.10);" />
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" id="lightbox-dismiss-btn">Close</button>
        <button type="button" class="btn btn-secondary" id="lightbox-edit-btn">
          <span class="icon" style="font-size:15px;" aria-hidden="true">edit</span>
          Change Photo
        </button>
      </div>
    </div>
  `;

  const close = () => {
    document.removeEventListener('keydown', onEsc);
    overlay.remove();
  };
  const onEsc = e => { if (e.key === 'Escape') close(); };

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#lightbox-close-btn')?.addEventListener('click', close);
  overlay.querySelector('#lightbox-dismiss-btn')?.addEventListener('click', close);
  overlay.querySelector('#lightbox-edit-btn')?.addEventListener('click', () => {
    close();
    _openEditModal(commodity);
  });

  document.addEventListener('keydown', onEsc);
  document.body.appendChild(overlay);
}

async function _handleDelete(commodity) {
  const stockCheck = await fetchActiveStockForCommodity(commodity.id);
  if (stockCheck.error) {
    await SystemDialog.alert(stockCheck.error);
    return;
  }

  if (stockCheck.activeBatchCount > 0) {
    const unitLabel = commodity.unit || 'units';
    const previewCodes = stockCheck.batchNumbers.slice(0, 4).join(', ');
    const moreText = stockCheck.batchNumbers.length > 4 ? ` (+${stockCheck.batchNumbers.length - 4} more)` : '';
    await SystemDialog.alert(
      `Cannot archive "${commodity.name}" (${commodity.commodity_code}).\n\n` +
      `This commodity still has ${stockCheck.activeBatchCount} active batch${stockCheck.activeBatchCount !== 1 ? 'es' : ''} ` +
      `with ${stockCheck.totalUnits.toLocaleString()} ${unitLabel} in stock` +
      `${previewCodes ? `:\n• ${previewCodes}${moreText}` : '.'}\n\n` +
      `Please distribute, dispose, or void its active batches first so physical stock is never hidden.`
    );
    return;
  }

  const confirmed = await SystemDialog.confirm(
    `Archive "${commodity.name}" (${commodity.commodity_code})?\n\n` +
    `Verified 0 active batches in stock. This will move the commodity to Archived Commodities while preserving all historical batch records.`
  );
  if (!confirmed) return;

  const { error } = await deleteCommodity(
    commodity.id,
    commodity.name,
    commodity.commodity_code,
    _profile,
    commodity.unit || 'units'
  );

  if (error) {
    await SystemDialog.alert(error);
    return;
  }

  // Database archive successful: remove from active list
  _commodities = _commodities.filter(c => c.id !== commodity.id);
  delete _stockMap[commodity.id];
  _refreshList();
  _updateSubtitle();
}
