/**
 * Data Archive & Audit Page (Controller)
 *
 * Coordinates archive tabs (Historical vs Voided), live search,
 * ledger details inspection, and batch restoration.
 *
 * MVC Controller: delegates HTML to .render.js and modals to .modals.js.
 */

import { fetchDepletedBatches, fetchVoidedBatches } from './archive.service.js';
import { renderArchiveLayout, renderHistoricalTable, renderVoidedTable } from './archive.render.js';
import { openLedgerModal, handleRestoreBatch } from './archive.modals.js';

// ── State ───────────────────────────────────────────────────────────────────
let _depletedBatches = [];
let _voidedBatches   = [];
let _profile         = null;
let _currentTab      = 'historical';
let _searchTerm      = '';

// ── Entry Point ─────────────────────────────────────────────────────────────
export async function renderArchivePage(profile) {
  _profile = profile;
  
  const content = document.getElementById('page-content');
  if (!content) return;

  content.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Data Archive & Audit Log</h1>
      <p class="page-header__subtitle">Review depleted historical stock and audit voided entries.</p>
    </div>
    <div class="loading-overlay"><div class="spinner spinner-lg"></div></div>
  `;

  const [depletedRes, voidedRes] = await Promise.all([
    fetchDepletedBatches(),
    fetchVoidedBatches()
  ]);

  _depletedBatches = depletedRes.batches || [];
  _voidedBatches   = voidedRes.batches   || [];

  _renderMainView(content);
}

// ── View Coordination ───────────────────────────────────────────────────────
function _renderMainView(content) {
  const tableHtml = _currentTab === 'historical'
    ? renderHistoricalTable(_depletedBatches, _searchTerm)
    : renderVoidedTable(_voidedBatches, _searchTerm);

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
  container.innerHTML = _currentTab === 'historical'
    ? renderHistoricalTable(_depletedBatches, _searchTerm)
    : renderVoidedTable(_voidedBatches, _searchTerm);
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

  // Restore action
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
}
