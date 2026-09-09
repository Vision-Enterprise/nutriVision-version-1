/**
 * Batch Management Page (Controller)
 *
 * Coordinates state, table rendering, filters, single edit, void, release,
 * and the full-screen bulk workspace.
 *
 * MVC Controller: delegates HTML to .render.js, modals to .modals.js,
 * and bulk intake to .workspace.js.
 */

import { fetchBatches, fetchActiveCommodities } from './batches.service.js';
import { getExpirationStatus } from '../../shared/utils/date.utils.js';
import { renderBatchesLayout, renderTable, renderEmpty, renderErrorAlert } from './batches.render.js';
import { openEditBatchModal, openVoidBatchModal, openReleaseBatchModal } from './batches.modals.js';
import { openFullScreenWorkspace } from './batches.workspace.js';
import { openBulkReleaseWorkspace } from '../bulk-release/bulk-release.page.js';

// ── State ───────────────────────────────────────────────────────────────────
let _batches      = [];
let _commodities  = [];
let _profile      = null;
let _filterComm   = 'all';
let _filterStatus = 'all';

// ── Entry Point ─────────────────────────────────────────────────────────────
export async function renderBatchesPage(profile) {
  _profile      = profile;
  _filterComm   = 'all';
  _filterStatus = 'all';

  const content = document.getElementById('page-content');
  if (!content) return;

  content.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Batch Management</h1>
      <p class="page-header__subtitle">Track commodity deliveries and expiration dates</p>
    </div>
    <div class="loading-overlay"><div class="spinner spinner-lg"></div></div>
  `;

  const [batchRes, commRes] = await Promise.all([
    fetchBatches(),
    fetchActiveCommodities(),
  ]);

  if (batchRes.error) {
    content.innerHTML = `
      <div class="page-header">
        <h1 class="page-header__title">Batch Management</h1>
        <p class="page-header__subtitle">Track commodity deliveries and expiration dates</p>
      </div>
      ${renderErrorAlert(batchRes.error)}
    `;
    return;
  }

  _batches     = batchRes.batches;
  _commodities = commRes.commodities;

  _renderMainView(content);

  // Auto-open workspace if action=add is in the hash
  if (window.location.hash.includes('action=add')) {
    // Clean up the hash to prevent re-opening on refresh
    window.history.replaceState(null, '', '#/batches');
    
    // Give the DOM a tiny bit of time to render the button
    setTimeout(() => {
      document.getElementById('add-batch-btn')?.click();
    }, 50);
  }
}

// ── View Coordination ───────────────────────────────────────────────────────
function _renderMainView(content) {
  const filtered = _applyFilters();

  content.innerHTML = renderBatchesLayout({
    batches: _batches,
    commodities: _commodities,
    filtered,
    filterComm: _filterComm,
    filterStatus: _filterStatus
  });

  _attachPageListeners();
}

function _applyFilters() {
  return _batches.filter(b => {
    const matchComm   = _filterComm === 'all' || b.commodity_id === _filterComm;
    const matchStatus = _filterStatus === 'all'
      || getExpirationStatus(b.expiration_date) === _filterStatus;
    return matchComm && matchStatus;
  });
}

function _refreshTable() {
  const region = document.getElementById('batch-table-region');
  if (!region) return;
  const filtered = _applyFilters();
  region.innerHTML = filtered.length === 0 
    ? renderEmpty(Boolean(_filterComm !== 'all' || _filterStatus !== 'all')) 
    : renderTable(filtered);
}

function _updateSubtitle() {
  const subtitle = document.querySelector('.page-header__subtitle');
  if (subtitle) {
    subtitle.textContent = `${_batches.length} batch${_batches.length !== 1 ? 'es' : ''} on record`;
  }
}

// ── Event Handlers ──────────────────────────────────────────────────────────
function _attachPageListeners() {
  document.getElementById('add-batch-btn')?.addEventListener('click', () => {
    openFullScreenWorkspace({
      commodities: _commodities,
      profile: _profile,
      onSaveComplete: async () => {
        const reloadRes = await fetchBatches();
        if (!reloadRes.error) {
          _batches = reloadRes.batches;
          _refreshTable();
          _updateSubtitle();
        } else {
          window.location.reload();
        }
      }
    });
  });

  document.getElementById('bulk-release-btn')?.addEventListener('click', () => {
    openBulkReleaseWorkspace({
      profile: _profile,
      onClose: async (results) => {
        // Always reload batches after bulk release (or cancel)
        const reloadRes = await fetchBatches();
        if (!reloadRes.error) {
          _batches = reloadRes.batches;
        }
        // Re-render the full batches view
        const content = document.getElementById('page-content');
        if (content) _renderMainView(content);
      }
    });
  });

  document.getElementById('filter-commodity')?.addEventListener('change', e => {
    _filterComm = e.target.value;
    _refreshTable();
  });

  document.getElementById('filter-status')?.addEventListener('change', e => {
    _filterStatus = e.target.value;
    _refreshTable();
  });

  document.getElementById('batch-table-region')?.addEventListener('click', e => {
    const releaseBtn = e.target.closest('.release-batch-btn');
    const editBtn    = e.target.closest('.edit-batch-btn');
    const deleteBtn  = e.target.closest('.delete-batch-btn');

    if (releaseBtn) {
      const batch = _batches.find(b => b.id === releaseBtn.dataset.id);
      if (batch) {
        openReleaseBatchModal({
          batch,
          profile: _profile,
          onSuccess: (updatedBatch) => {
            const idx = _batches.findIndex(b => b.id === updatedBatch.id);
            if (idx !== -1) {
              if (updatedBatch.record_status === 'Depleted') {
                _batches.splice(idx, 1);
              } else {
                _batches[idx] = updatedBatch;
              }
            }
            _refreshTable();
            _updateSubtitle();
          }
        });
      }
      return;
    }

    if (editBtn) {
      const batch = _batches.find(b => b.id === editBtn.dataset.id);
      if (batch) {
        openEditBatchModal({
          batch,
          commodities: _commodities,
          profile: _profile,
          onSuccess: (updatedBatch) => {
            const idx = _batches.findIndex(b => b.id === updatedBatch.id);
            if (idx !== -1) _batches[idx] = updatedBatch;
            _batches.sort((a, b) => a.expiration_date.localeCompare(b.expiration_date));
            _refreshTable();
            _updateSubtitle();
          }
        });
      }
      return;
    }

    if (deleteBtn) {
      const batch = _batches.find(b => b.id === deleteBtn.dataset.id);
      if (batch) {
        openVoidBatchModal({
          batch,
          profile: _profile,
          onSuccess: (voidedId) => {
            _batches = _batches.filter(b => b.id !== voidedId);
            _refreshTable();
            _updateSubtitle();
          }
        });
      }
      return;
    }

    const row = e.target.closest('.batch-row');
    if (row) {
      const descRow = document.getElementById('desc-' + row.dataset.batchId);
      if (descRow) {
        descRow.style.display = descRow.style.display === 'none' ? 'table-row' : 'none';
      }
    }
  });
}
