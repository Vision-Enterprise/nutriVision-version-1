import { 
  fetchDepletedBatches, 
  fetchVoidedBatches, 
  restoreBatch 
} from './archive.service.js';
import { formatDate } from '../../shared/utils/date.utils.js';
import { RECORD_STATUS } from '../../shared/constants/app.constants.js';
import { SystemDialog } from '../../shared/components/dialog.component.js';

let _depletedBatches = [];
let _voidedBatches = [];
let _profile = null;
let _currentTab = 'historical'; // 'historical' or 'voided'
let _searchTerm = '';

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

  // Fetch both datasets concurrently
  const [depletedRes, voidedRes] = await Promise.all([
    fetchDepletedBatches(),
    fetchVoidedBatches()
  ]);

  _depletedBatches = depletedRes.batches || [];
  _voidedBatches = voidedRes.batches || [];

  _renderPage(content);
}

function _renderPage(content) {
  content.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Data Archive & Audit Log</h1>
      <p class="page-header__subtitle">Review depleted historical stock and audit voided entries.</p>
    </div>

    <!-- Tabs -->
    <div style="display: flex; gap: var(--space-6); border-bottom: 1px solid var(--color-border); margin-bottom: var(--space-6);">
      <button class="tab-btn ${_currentTab === 'historical' ? 'active' : ''}" data-tab="historical" style="background: none; border: none; padding: var(--space-3) var(--space-4); border-bottom: 3px solid ${_currentTab === 'historical' ? 'var(--color-primary)' : 'transparent'}; color: ${_currentTab === 'historical' ? 'var(--color-primary)' : 'var(--color-text-muted)'}; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: var(--space-2);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
        Historical Inventory (Depleted)
      </button>
      <button class="tab-btn ${_currentTab === 'voided' ? 'active' : ''}" data-tab="voided" style="background: none; border: none; padding: var(--space-3) var(--space-4); border-bottom: 3px solid ${_currentTab === 'voided' ? 'var(--color-primary)' : 'transparent'}; color: ${_currentTab === 'voided' ? 'var(--color-primary)' : 'var(--color-text-muted)'}; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: var(--space-2);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        Voided Records (Audit Trail)
      </button>
    </div>

    <!-- Content Area -->
    <div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden;">
      <!-- Toolbar -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-4); border-bottom: 1px solid var(--color-border-light);">
        <h2 style="font-size: var(--font-size-base); font-weight: 600; margin: 0;">
          ${_currentTab === 'historical' ? 'Past Distributions (Zero Stock)' : 'Audit Trail: Soft Deleted Entries'}
        </h2>
        <div style="position: relative; width: 300px;">
          <input type="text" id="archive-search" class="form-input" placeholder="${_currentTab === 'historical' ? 'Search batch code...' : 'Search reason or user...'}" value="${_escHtml(_searchTerm)}" style="padding-right: var(--space-8);">
        </div>
      </div>

      <!-- Table Container -->
      <div id="archive-table-container">
        ${_currentTab === 'historical' ? _renderHistoricalTable() : _renderVoidedTable()}
      </div>
    </div>
  `;

  _attachListeners();
}

function _renderHistoricalTable() {
  const filtered = _depletedBatches.filter(b => 
    !_searchTerm || 
    b.batch_number.toLowerCase().includes(_searchTerm.toLowerCase()) ||
    (b.commodities?.name || '').toLowerCase().includes(_searchTerm.toLowerCase())
  );

  if (filtered.length === 0) return _renderEmptyState('No depleted batches found.');

  return `
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Batch Code</th>
            <th>Commodity</th>
            <th>Total Units Dist.</th>
            <th>Date Depleted</th>
            <th>Status</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(b => `
            <tr>
              <td style="font-weight: 600;">${_escHtml(b.batch_number)}</td>
              <td>${_escHtml(b.commodities?.name || '-')}</td>
              <td>${b.totalDistributed.toLocaleString()}</td>
              <td>${formatDate(b.updated_at)}</td>
              <td>
                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: var(--color-surface-alt); border-radius: 4px; font-size: 12px; color: var(--color-text-muted);">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  Depleted
                </span>
              </td>
              <td style="text-align: right;">
                <button class="btn btn-ghost btn-sm ledger-btn" data-id="${b.id}" style="color: var(--color-primary);">Release Ledger</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function _renderVoidedTable() {
  const filtered = _voidedBatches.filter(b => 
    !_searchTerm || 
    b.batch_number.toLowerCase().includes(_searchTerm.toLowerCase()) ||
    (b.void_reason || '').toLowerCase().includes(_searchTerm.toLowerCase())
  );

  if (filtered.length === 0) return _renderEmptyState('No voided records found.');

  return `
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Batch Code</th>
            <th>Commodity</th>
            <th>Void Reason</th>
            <th>Voided By</th>
            <th>Date Voided</th>
            <th>Status</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(b => `
            <tr>
              <td style="font-weight: 600;">${_escHtml(b.batch_number)}</td>
              <td>${_escHtml(b.commodities?.name || '-')}</td>
              <td style="font-style: italic; color: var(--color-text-muted);">"${_escHtml(b.void_reason || 'No reason provided')}"</td>
              <td>${_escHtml(b.voided_by || 'Unknown')}</td>
              <td>${formatDate(b.deleted_at)}</td>
              <td>
                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: rgba(239, 68, 68, 0.1); color: var(--color-danger); border-radius: 4px; font-size: 12px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                  Voided
                </span>
              </td>
              <td style="text-align: right;">
                <button class="btn btn-ghost btn-sm restore-btn" data-id="${b.id}" aria-label="Restore record" title="Restore Record">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/></svg>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function _renderEmptyState(message) {
  return `
    <div style="padding: var(--space-8); text-align: center; color: var(--color-text-muted);">
      <p>${message}</p>
    </div>
  `;
}

function _attachListeners() {
  const content = document.getElementById('page-content');
  
  // Tab switching
  content.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      _currentTab = e.currentTarget.dataset.tab;
      _searchTerm = ''; // Reset search on tab switch
      _renderPage(content);
    });
  });

  // Search
  const searchInput = document.getElementById('archive-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      _searchTerm = e.target.value;
      const container = document.getElementById('archive-table-container');
      if (container) {
        container.innerHTML = _currentTab === 'historical' ? _renderHistoricalTable() : _renderVoidedTable();
      }
    });
  }

  // Ledger action
  content.addEventListener('click', (e) => {
    const ledgerBtn = e.target.closest('.ledger-btn');
    if (ledgerBtn) {
      const id = ledgerBtn.dataset.id;
      const batch = _depletedBatches.find(b => b.id === id);
      if (batch) _openLedgerModal(batch);
    }
  });

  // Restore action
  content.addEventListener('click', async (e) => {
    const restoreBtn = e.target.closest('.restore-btn');
    if (restoreBtn) {
      const id = restoreBtn.dataset.id;
      const batch = _voidedBatches.find(b => b.id === id);
      
      const confirmed = await SystemDialog.confirm(`Are you sure you want to restore batch "${batch.batch_number}"? It will become active again.`, 'Restore Batch', 'Restore');
      if (confirmed) {
        restoreBtn.disabled = true;
        const { error } = await restoreBatch(id, _profile);
        
        if (error) {
          await SystemDialog.alert(error);
          restoreBtn.disabled = false;
        } else {
          // Remove from local voided list
          _voidedBatches = _voidedBatches.filter(b => b.id !== id);
          const container = document.getElementById('archive-table-container');
          if (container) container.innerHTML = _renderVoidedTable();
          await SystemDialog.alert('Batch successfully restored.');
        }
      }
    }
  });
}

function _escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}



function _openLedgerModal(batch) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'ledger-modal-overlay';
  
  const releasesHTML = (batch.releases && batch.releases.length > 0)
    ? batch.releases.map(r => `
        <div style="background: var(--color-surface); border: 1px solid var(--color-border-subtle); border-radius: 8px; padding: var(--space-3); margin-bottom: var(--space-3);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2);">
            <div style="font-weight: 600; color: var(--color-primary);">${r.quantity} units</div>
            <div style="font-size: var(--font-size-sm); color: var(--color-text-muted);">${formatDate(r.created_at)}</div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); font-size: var(--font-size-sm);">
            <div>
              <span style="color: var(--color-text-muted); display: block; font-size: 11px; text-transform: uppercase;">Location / Barangay</span>
              <span style="font-weight: 500;">${_escHtml(r.barangay) || '-'}</span>
            </div>
            <div>
              <span style="color: var(--color-text-muted); display: block; font-size: 11px; text-transform: uppercase;">Released By (User ID)</span>
              <span style="font-weight: 500;">${_escHtml(r.released_by) || '-'}</span>
            </div>
          </div>
          ${r.notes ? `<div style="margin-top: var(--space-2); font-size: var(--font-size-sm); padding-top: var(--space-2); border-top: 1px dashed var(--color-border-subtle); color: var(--color-text-muted);">
            <strong style="color: var(--color-text);">Notes:</strong> ${_escHtml(r.notes)}
          </div>` : ''}
        </div>
      `).join('')
    : '<div style="color: var(--color-text-muted); padding: var(--space-4); text-align: center; border: 1px dashed var(--color-border-subtle); border-radius: 8px;">No releases found for this batch.</div>';

  overlay.innerHTML = `
    <div class="modal" style="max-width: 600px; width: 100%;">
      <div class="modal-header">
        <h2 class="modal-title">Release Ledger & Batch Details</h2>
        <button class="modal-close" aria-label="Close modal">&times;</button>
      </div>
      <div class="modal-body">
        
        <!-- Batch Core Details -->
        <div style="background: rgba(var(--color-primary-rgb), 0.05); padding: var(--space-3); border-radius: 8px; margin-bottom: var(--space-4);">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
            <div>
              <div style="font-size: 11px; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: 2px;">Batch Number</div>
              <div style="font-weight: 600; font-size: var(--font-size-lg);">${_escHtml(batch.batch_number)}</div>
              <div style="color: var(--color-primary); font-size: var(--font-size-sm); margin-top: 2px;">${_escHtml(batch.commodities?.name)}</div>
            </div>
            <div>
              <div style="font-size: 11px; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: 2px;">Initial Receiving Details</div>
              <div style="font-size: var(--font-size-sm);">
                <span style="color: var(--color-text-muted);">Supplier:</span> <span style="font-weight: 500;">${_escHtml(batch.supplier) || '-'}</span><br>
                <span style="color: var(--color-text-muted);">Received On:</span> <span style="font-weight: 500;">${formatDate(batch.created_at)}</span><br>
                <span style="color: var(--color-text-muted);">Received By (User ID):</span> <span style="font-weight: 500;">${_escHtml(batch.created_by) || '-'}</span>
              </div>
            </div>
          </div>
        </div>
        
        <h3 style="font-size: var(--font-size-sm); text-transform: uppercase; color: var(--color-text-muted); margin-bottom: var(--space-3);">Distribution History (${batch.totalDistributed || 0} Total Units)</h3>
        <div style="max-height: 350px; overflow-y: auto; padding-right: var(--space-2);">
          ${releasesHTML}
        </div>
        
      </div>
    </div>
  `;

  // Remove any existing ledger modal before appending a new one
  const existing = document.getElementById('ledger-modal-overlay');
  if (existing) {
    if (existing._escHandler) document.removeEventListener('keydown', existing._escHandler);
    existing.remove();
  }

  document.body.appendChild(overlay);

  function _closeLedger() {
    document.removeEventListener('keydown', escHandler);
    overlay.remove();
  }

  const closeBtn = overlay.querySelector('.modal-close');
  closeBtn.addEventListener('click', _closeLedger);

  const escHandler = (e) => { if (e.key === 'Escape') _closeLedger(); };
  overlay._escHandler = escHandler;
  document.addEventListener('keydown', escHandler);
}
