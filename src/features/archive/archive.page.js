/**
 * Data Archive & Audit Page (Controller)
 *
 * Coordinates archive tabs (Historical, Voided, and Archived Commodities),
 * live search, ledger details inspection, and restoration.
 *
 * MVC Controller: delegates HTML to .render.js and modals to .modals.js.
 */

import { fetchDepletedBatches, fetchVoidedBatches, fetchArchivedCommodities, restoreCommodity } from './archive.service.js';
import { renderArchiveLayout, renderHistoricalTable, renderVoidedTable, renderArchivedCommoditiesTable } from './archive.render.js';
import { openLedgerModal, handleRestoreBatch } from './archive.modals.js';
import { SystemDialog } from '../../shared/components/dialog.component.js';

// ── State ───────────────────────────────────────────────────────────────────
let _depletedBatches     = [];
let _voidedBatches       = [];
let _archivedCommodities = [];
let _profile             = null;
let _currentTab          = 'historical';
let _searchTerm          = '';

// ── Entry Point ─────────────────────────────────────────────────────────────
export async function renderArchivePage(profile) {
  _profile = profile;
  
  const content = document.getElementById('page-content');
  if (!content) return;

  content.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Data Archive & Audit Log</h1>
      <p class="page-header__subtitle">Review depleted historical stock, audit voided batches, and manage archived commodities.</p>
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
function _renderMainView(content) {
  let tableHtml = '';
  if (_currentTab === 'historical') {
    tableHtml = renderHistoricalTable(_depletedBatches, _searchTerm);
  } else if (_currentTab === 'voided') {
    tableHtml = renderVoidedTable(_voidedBatches, _searchTerm);
  } else if (_currentTab === 'commodities') {
    tableHtml = renderArchivedCommoditiesTable(_archivedCommodities, _searchTerm);
  }

  content.innerHTML = renderArchiveLayout({
    currentTab: _currentTab,
    searchTerm: _searchTerm,
    tableHtml
  });

  _attachListeners(content);
}

function _refreshTable() {
  const container = document.getElementById('archive-table-container');
  if (!container) return;

  if (_currentTab === 'historical') {
    container.innerHTML = renderHistoricalTable(_depletedBatches, _searchTerm);
  } else if (_currentTab === 'voided') {
    container.innerHTML = renderVoidedTable(_voidedBatches, _searchTerm);
  } else if (_currentTab === 'commodities') {
    container.innerHTML = renderArchivedCommoditiesTable(_archivedCommodities, _searchTerm);
  }
}

// ── Event Handlers ──────────────────────────────────────────────────────────
function _attachListeners(content) {
  // Tab switching
  content.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      _currentTab = e.currentTarget.dataset.tab;
      _searchTerm = '';
      _renderMainView(content);
    });
  });

  // Search input
  document.getElementById('archive-search')?.addEventListener('input', e => {
    _searchTerm = e.target.value;
    _refreshTable();
  });

  // Ledger modal trigger
  content.addEventListener('click', e => {
    const ledgerBtn = e.target.closest('.ledger-btn');
    if (ledgerBtn) {
      const batch = _depletedBatches.find(b => b.id === ledgerBtn.dataset.id);
      if (batch) openLedgerModal(batch);
    }
  });

  // Restore voided batch
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
          _refreshTable();
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
      _refreshTable();
      await SystemDialog.alert(`Commodity "${name}" restored successfully.`);
    }
  });
}
