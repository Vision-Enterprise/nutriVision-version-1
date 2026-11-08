/**
 * Data Archive & Audit Page (Controller)
 *
 * Coordinates archive filters (Expired Stock, Data Entry Errors, Depleted, and Archived Commodities),
 * live search, release ledger inspection, and record restorations.
 *
 * MVC Controller: delegates HTML to .render.js and modals to .modals.js.
 */

import { fetchDepletedBatches, fetchVoidedBatches, fetchArchivedCommodities, restoreCommodity } from './archive.service.js';
import { 
  renderArchiveLayout, 
  renderHistoricalTable, 
  renderVoidedTable, 
  renderArchivedCommoditiesTable,
  renderAllArchiveTable,
  parseVoidReason 
} from './archive.render.js';
import { openLedgerModal, handleRestoreBatch } from './archive.modals.js';
import { SystemDialog } from '../../shared/components/dialog.component.js';
import './archive.css';

// ── State ───────────────────────────────────────────────────────────────────
let _depletedBatches     = [];
let _voidedBatches       = [];
let _archivedCommodities = [];
let _profile             = null;
let _currentFilter       = 'all';
let _searchTerm          = '';

function _getCounts() {
  let expired = 0;
  let dataError = 0;
  let other = 0;

  _voidedBatches.forEach(b => {
    const parsed = parseVoidReason(b.void_reason);
    if (parsed.category === 'Expired Stock') expired++;
    else if (parsed.category === 'Data Entry Error') dataError++;
    else other++;
  });

  const depleted = _depletedBatches.length;
  const commodities = _archivedCommodities.length;
  const all = _voidedBatches.length + depleted + commodities;

  return { all, expired, dataError, other, depleted, commodities };
}

// ── Entry Point ─────────────────────────────────────────────────────────────
export async function renderArchivePage(profile) {
  _profile = profile;
  
  const content = document.getElementById('page-content');
  if (!content) return;

  content.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Archive</h1>
      <p class="page-header__subtitle">Review depleted batches, expired stock, voided entries, and archived commodities.</p>
    </div>
    <div class="loading-overlay"><div class="spinner spinner-lg"></div></div>
  `;

  const [depletedRes, voidedRes, commsRes] = await Promise.all([
    fetchDepletedBatches(),
    fetchVoidedBatches(),
    fetchArchivedCommodities()
  ]);

  _depletedBatches     = depletedRes.batches     || [];
  _voidedBatches       = voidedRes.batches       || [];
  _archivedCommodities = commsRes.commodities     || [];

  _renderMainView(content);
}

// ── View Coordination ───────────────────────────────────────────────────────
function _getTableHtml() {
  if (_currentFilter === 'all') {
    return renderAllArchiveTable({
      voidedBatches: _voidedBatches,
      depletedBatches: _depletedBatches,
      archivedCommodities: _archivedCommodities,
      searchTerm: _searchTerm
    });
  } else if (_currentFilter === 'expired') {
    return renderVoidedTable(_voidedBatches, _searchTerm, 'Expired Stock');
  } else if (_currentFilter === 'data-error') {
    return renderVoidedTable(_voidedBatches, _searchTerm, 'Data Entry Error');
  } else if (_currentFilter === 'other') {
    return renderVoidedTable(_voidedBatches, _searchTerm, 'Other');
  } else if (_currentFilter === 'depleted') {
    return renderHistoricalTable(_depletedBatches, _searchTerm);
  } else if (_currentFilter === 'commodities') {
    return renderArchivedCommoditiesTable(_archivedCommodities, _searchTerm);
  }
  return '';
}

function _renderMainView(content) {
  const counts = _getCounts();
  const tableHtml = _getTableHtml();

  content.innerHTML = renderArchiveLayout({
    currentFilter: _currentFilter,
    searchTerm: _searchTerm,
    counts,
    tableHtml
  });

  _attachListeners(content);
}

function _refreshTable() {
  const container = document.getElementById('archive-table-container');
  if (!container) return;
  container.innerHTML = _getTableHtml();
}

// ── Event Handlers ──────────────────────────────────────────────────────────
function _attachListeners(content) {
  // Pill button filters
  content.querySelectorAll('.archive-pill').forEach(btn => {
    btn.addEventListener('click', e => {
      const filter = e.currentTarget.dataset.filter;
      if (_currentFilter === filter) return;
      _currentFilter = filter;
      
      const select = document.getElementById('archive-filter-select');
      if (select) select.value = filter;

      content.querySelectorAll('.archive-pill').forEach(p => p.classList.toggle('active', p.dataset.filter === filter));
      _refreshTable();
    });
  });

  // Dropdown filter (Audit Logs style)
  const filterSelect = document.getElementById('archive-filter-select');
  if (filterSelect) {
    filterSelect.addEventListener('change', e => {
      _currentFilter = e.target.value;
      content.querySelectorAll('.archive-pill').forEach(p => p.classList.toggle('active', p.dataset.filter === _currentFilter));
      _refreshTable();
    });
  }

  // Search input
  const searchInput = document.getElementById('archive-search');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      _searchTerm = e.target.value;
      _refreshTable();
    });
  }

  // Ledger modal trigger (Depleted Batches)
  content.addEventListener('click', e => {
    const ledgerBtn = e.target.closest('.ledger-btn');
    if (ledgerBtn) {
      const batch = _depletedBatches.find(b => b.id === ledgerBtn.dataset.id);
      if (batch) openLedgerModal(batch);
    }
  });

  // Restore voided / expired batch
  content.addEventListener('click', async e => {
    const restoreBtn = e.target.closest('.restore-btn');
    if (restoreBtn) {
      const id = restoreBtn.dataset.id;
      const batch = _voidedBatches.find(b => b.id === id);
      if (!batch) return;

      await handleRestoreBatch({
        batch,
        profile: _profile,
        buttonEl: restoreBtn,
        onSuccess: (restoredId) => {
          _voidedBatches = _voidedBatches.filter(b => b.id !== restoredId);
          _renderMainView(content);
        }
      });
    }
  });

  // Restore archived commodity
  content.addEventListener('click', async e => {
    const restoreCommBtn = e.target.closest('.restore-commodity-btn');
    if (restoreCommBtn) {
      const id = restoreCommBtn.dataset.id;
      const name = restoreCommBtn.dataset.name;
      const confirmed = await SystemDialog.confirm(`Restore commodity "${name}" back to active inventory?`);
      if (!confirmed) return;

      restoreCommBtn.disabled = true;
      const { error } = await restoreCommodity(id, _profile);
      if (error) {
        await SystemDialog.alert(error);
        restoreCommBtn.disabled = false;
        return;
      }

      _archivedCommodities = _archivedCommodities.filter(c => c.id !== id);
      _renderMainView(content);
      await SystemDialog.alert(`Commodity "${name}" restored successfully.`);
    }
  });
}
