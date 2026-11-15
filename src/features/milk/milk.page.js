/**
 * Milk Bank — Main Page Controller
 * Coordinates the 2-section workspace, spreadsheet inline data entry,
 * individual + bulk saving, and Option B Virtual Freezer Map.
 */

import {
  fetchMilkBatches,
  fetchMilkDonations,
  fetchMilkDispatches,
  fetchMilkMetrics,
  createMilkDonation,
  createMilkDonationsBulk,
  deleteMilkDonation,
  getConfidentialDonors,
  saveConfidentialDonor,
  getNextDonorCode,
  fetchDonorLogEntries,
  addDonorLogEntry,
  createMilkBatch,
  createMilkBatchesBulk,
  dispenseMilk,
  updateBatchShelf,
  getNextBatchNumber,
  getFreezerShelves,
  addFreezerShelf,
  removeFreezerShelf,
  getFefoPriorityBatch,
  getFreezers,
  saveFreezers,
  getActiveFreezerId,
  setActiveFreezerId,
  addFreezer,
  renameFreezer,
  updateFreezerSettings,
  getFreezerCapacity,
  deleteFreezer,
  addShelfToFreezer,
  removeShelfFromFreezer,
  getBatchFreezerAndShelf,
  formatFreezerShelf,
  getShelfLoad,
  getFreezerShelfAllocations,
  getBatchActualShelfInfo,
  fetchMilkAuditLogs,
  addOneYearToDate,
  isMilkBatchExpired
} from './milk.service.js';

import {
  openEditBatchModal,
  openDeleteBatchModal
} from './milk.modal.js';

import {
  renderMilkPageSkeleton,
  renderMetrics,
  renderDonorLogSheet,
  renderDonationsSheet,
  renderBatchesSheet,
  renderDispatchesSheet,
  renderMilkAuditSheet
} from './milk.render.js';

import {
  showDonorLogPrintPreview,
  showMilkIntakePrintPreview,
  showMilkBatchesPrintPreview,
  showMilkDispensingPrintPreview,
  showMilkAuditPrintPreview,
  showMilkAnalyticsPrintPreview,
  exportDonorLogCSV,
  exportMilkIntakeCSV,
  exportMilkBatchesCSV,
  exportMilkDispensingCSV,
  exportMilkAuditCSV
} from './milk.pdf.js';
import {
  computeMilkAnalytics,
  renderMilkAnalyticsSheet,
  mountMilkAnalyticsCharts
} from './milk.analytics.js';
import { SystemDialog } from '../../shared/components/dialog.component.js';
import { getLocalDateString } from '../../shared/utils/date.utils.js';

// ── Themed Modal Helper with Blue Accents for Milk Bank Module ────────────────
const MilkModal = {
  alert: (message, title = 'Milk Bank Notice') => 
    SystemDialog.alert(message, title, { theme: 'blue', icon: 'info' }),
  confirm: (message, title = 'Confirm Action', confirmText = 'Confirm', isDanger = false) => 
    SystemDialog.confirm(message, title, confirmText, isDanger, { theme: 'blue', icon: isDanger ? 'warning' : 'help' }),
  prompt: (message, defaultValue = '', title = 'Storage Rack', confirmText = 'Save') =>
    SystemDialog.prompt(message, defaultValue, title, { theme: 'blue', icon: 'kitchen', confirmText })
};

// ── Controller State ──────────────────────────────────────────────────────────
let _profile = null;
let _activeTab = 'intake';         // 'intake' | 'batches' | 'dispense' | 'audit'
let _batchesSubView = 'table';    // 'table' | 'freezer' (Option B)

let _batches = [];
let _donations = [];
let _donorLogEntries = [];
let _dispatches = [];
let _auditLogs = [];
let _auditFilter = '';
let _auditSearch = '';
let _metrics = null;
let _shelves = [];
let _freezers = [];
let _activeFreezerId = null;
let _selectedBatch = null;
let _selectedShelf = null;

// In-memory draft rows waiting to be saved
let _draftDonations = [];
let _draftDonorLog = [];
let _draftBatches = [];
let _draftDispatches = [];

// Analytics & Distribution State (#88)
let _analyticsPeriod = 'all';
let _analyticsCustomStart = '';
let _analyticsCustomEnd = '';

/**
 * Main entry point called by router
 */
export async function renderMilkPage(profile) {
  _profile = profile;
  _activeTab = 'intake';
  _batchesSubView = 'table';
  _auditFilter = '';
  _auditSearch = '';
  _selectedBatch = null;
  _selectedShelf = null;
  _analyticsPeriod = 'all';
  _analyticsCustomStart = '';
  _analyticsCustomEnd = '';

  const content = document.getElementById('page-content');
  if (!content) return;

  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Milk Bank';

  content.innerHTML = renderMilkPageSkeleton();

  _bindTabHeaderEvents();
  _freezers = getFreezers();
  _activeFreezerId = getActiveFreezerId();
  _shelves = getFreezerShelves();
  await _loadData();
}

/**
 * Fetch all records and re-render workspace
 */
async function _loadData() {
  const [batchesRes, donationsRes, donorLogsRes, dispatchesRes, metrics, auditRes] = await Promise.all([
    fetchMilkBatches(),
    fetchMilkDonations(),
    fetchDonorLogEntries(),
    fetchMilkDispatches(),
    fetchMilkMetrics(),
    fetchMilkAuditLogs()
  ]);

  _batches = batchesRes.data || [];
  _donations = donationsRes.data || [];
  _donorLogEntries = donorLogsRes.data || [];
  _dispatches = dispatchesRes.data || [];
  _metrics = metrics;
  _auditLogs = auditRes.data || [];

  _updateMetricsView();
  _updateTabCounts();
  _renderActiveSheet();
}

function _updateMetricsView() {
  const container = document.getElementById('milk-metrics-container');
  if (container && _metrics) {
    container.innerHTML = renderMetrics(_metrics);
  }
}

function _updateTabCounts() {
  const donorLogCountEl = document.getElementById('count-donor-log');
  const batchCountEl = document.getElementById('count-batches');
  const donCountEl = document.getElementById('count-donations');
  const dispCountEl = document.getElementById('count-dispatches');
  const auditCountEl = document.getElementById('count-milk-audit');

  if (donorLogCountEl) donorLogCountEl.textContent = _donorLogEntries.length;
  if (batchCountEl) batchCountEl.textContent = _batches.length;
  if (donCountEl) donCountEl.textContent = _donations.length;
  if (dispCountEl) dispCountEl.textContent = _dispatches.length;
  if (auditCountEl) auditCountEl.textContent = _auditLogs.length;
}

/**
 * Render the active spreadsheet / view
 */
function _renderActiveSheet() {
  const contentArea = document.getElementById('milk-tab-content');
  if (!contentArea) return;

  document.querySelectorAll('.milk-tab').forEach(t => {
    const isActive = t.dataset.tab === _activeTab;
    t.classList.toggle('milk-tab--active', isActive);
    t.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  const fefoBatch = getFefoPriorityBatch(_batches);

  if (_activeTab === 'donor-log') {
    contentArea.innerHTML = renderDonorLogSheet(_donorLogEntries, _draftDonorLog);
    _bindDonorLogSheetEvents();
    _setupCellBarSync();
  } else if (_activeTab === 'intake') {
    contentArea.innerHTML = renderDonationsSheet(_donations, _draftDonations);
    _bindDonationsSheetEvents();
    _setupCellBarSync();
  } else if (_activeTab === 'batches') {
    contentArea.innerHTML = renderBatchesSheet(
      _batches,
      _draftBatches,
      _batchesSubView,
      _shelves,
      fefoBatch,
      {
        freezers: _freezers,
        activeFreezerId: _activeFreezerId,
        selectedBatch: _selectedBatch,
        selectedShelf: _selectedShelf
      }
    );
    _bindBatchesSheetEvents();
    if (_batchesSubView === 'table') {
      _setupCellBarSync();
    }
  } else if (_activeTab === 'dispense') {
    const available = _batches.filter(b => (b.remaining_bags || 0) > 0 && !isMilkBatchExpired(b));
    contentArea.innerHTML = renderDispatchesSheet(_dispatches, _draftDispatches, available, fefoBatch, _freezers);
    _bindDispatchesSheetEvents();
    _setupCellBarSync();
  } else if (_activeTab === 'audit') {
    contentArea.innerHTML = renderMilkAuditSheet(_auditLogs, _auditFilter, _auditSearch);
    _bindAuditSheetEvents();
  } else if (_activeTab === 'analytics') {
    const analyticsData = computeMilkAnalytics({
      donorLogs: _donorLogEntries,
      donations: _donations,
      dispatches: _dispatches,
      batches: _batches,
      period: _analyticsPeriod,
      customStart: _analyticsCustomStart,
      customEnd: _analyticsCustomEnd,
    });
    contentArea.innerHTML = renderMilkAnalyticsSheet(analyticsData);
    _bindAnalyticsSheetEvents(analyticsData);
    setTimeout(() => {
      mountMilkAnalyticsCharts(analyticsData);
    }, 40);
  }

  _bindHorizontalScrollSupport();
}

function _bindHorizontalScrollSupport() {
  document.querySelectorAll('.table-responsive').forEach(container => {
    container.addEventListener('wheel', (e) => {
      if (e.shiftKey) {
        container.scrollLeft += e.deltaY;
      }
    }, { passive: true });
  });
}

function _bindAuditSheetEvents() {
  const searchInp = document.getElementById('milk-audit-search');
  const filterSel = document.getElementById('milk-audit-filter');

  searchInp?.addEventListener('input', (e) => {
    _auditSearch = e.target.value;
    _renderActiveSheet();
    const reSearchInp = document.getElementById('milk-audit-search');
    if (reSearchInp) {
      reSearchInp.focus();
      reSearchInp.selectionStart = reSearchInp.selectionEnd = reSearchInp.value.length;
    }
  });

  filterSel?.addEventListener('change', (e) => {
    _auditFilter = e.target.value;
    _renderActiveSheet();
  });

  const getFilteredAuditRows = () => {
    let filtered = _auditLogs || [];
    if (_auditFilter) {
      filtered = filtered.filter(l => l.action === _auditFilter);
    }
    if (_auditSearch) {
      const q = _auditSearch.toLowerCase();
      filtered = filtered.filter(l =>
        (l.description || '').toLowerCase().includes(q) ||
        (l.action || '').toLowerCase().includes(q) ||
        (l.profiles?.full_name || '').toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  document.getElementById('btn-export-milk-audit-csv')?.addEventListener('click', () => {
    exportMilkAuditCSV(getFilteredAuditRows());
  });

  document.getElementById('btn-export-milk-audit-pdf')?.addEventListener('click', () => {
    showMilkAuditPrintPreview(getFilteredAuditRows(), {
      filterAction: _auditFilter,
      searchQuery: _auditSearch,
    });
  });
}

function _bindAnalyticsSheetEvents(analyticsData) {
  const periodSel = document.getElementById('milk-analytics-period');
  const customDatesWrap = document.getElementById('milk-analytics-custom-dates');
  const startInp = document.getElementById('milk-analytics-start');
  const endInp = document.getElementById('milk-analytics-end');
  const applyBtn = document.getElementById('milk-analytics-apply-btn');
  const exportBtn = document.getElementById('btn-export-milk-awards-pdf');

  periodSel?.addEventListener('change', (e) => {
    _analyticsPeriod = e.target.value;
    if (_analyticsPeriod === 'custom') {
      if (customDatesWrap) customDatesWrap.style.display = 'flex';
    } else {
      if (customDatesWrap) customDatesWrap.style.display = 'none';
      _renderActiveSheet();
    }
  });

  applyBtn?.addEventListener('click', () => {
    _analyticsCustomStart = startInp?.value || '';
    _analyticsCustomEnd = endInp?.value || '';
    _renderActiveSheet();
  });

  exportBtn?.addEventListener('click', () => {
    showMilkAnalyticsPrintPreview(analyticsData, _profile);
  });
}

/**
 * Tab Navigation Events
 */
function _bindTabHeaderEvents() {
  const tabs = document.querySelectorAll('.milk-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('milk-tab--active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('milk-tab--active');
      tab.setAttribute('aria-selected', 'true');

      _activeTab = tab.dataset.tab;
      _renderActiveSheet();
    });
  });
}

/**
 * Smoothly scroll ledger to bottom to reveal newly appended draft row with comfortable breathing room
 */
function _scrollToBottomDraft() {
  setTimeout(() => {
    const tableWrap = document.querySelector('.table-responsive');
    if (tableWrap) {
      tableWrap.scrollTop = tableWrap.scrollHeight;
    }
    const draftRows = document.querySelectorAll('.grid-row--draft');
    const latestDraftRow = draftRows.length > 0 ? draftRows[draftRows.length - 1] : null;
    const draftInputs = latestDraftRow
      ? latestDraftRow.querySelectorAll('input:not([disabled])')
      : document.querySelectorAll('.grid-row--draft input:not([disabled])');

    if (draftInputs.length > 0) {
      const firstInDraft = draftInputs[0];
      firstInDraft.focus({ preventScroll: true });
      firstInDraft.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 70);
}

// ════════════════════════════════════════════════════════════════════════════
// SHEET 1: Log of Milk Received (FM.002.00) Events
// ════════════════════════════════════════════════════════════════════════════
function _bindDonationsSheetEvents() {
  const today = getLocalDateString();

  // Add new draft row at bottom of ledger (physical ledger style)
  document.getElementById('btn-add-donation-row')?.addEventListener('click', () => {
    _draftDonations.push({
      donor_code: '',
      expression_date_notes: today,
      expression_time: '08:00',
      transport_date: today,
      transport_date_end: '',
      transport_time: '12:00',
      condition_at_collection: 'ok',
      arrival_date: today,
      arrival_date_end: '',
      arrival_time: '12:30',
      condition_at_arrival: 'ok',
      transport_condition: ''
    });
    _renderActiveSheet();
    _scrollToBottomDraft();
  });

  // Confidential Donor ID lookup / registration
  document.querySelectorAll('.js-open-donor-lookup').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('tr');
      const codeInput = row?.querySelector('.js-donor-code');
      if (codeInput) _openConfidentialDonorLookupModal(codeInput);
    });
  });

  // Clear invalid outline on input
  document.querySelectorAll('.milk-sheet-table input, .milk-sheet-table select').forEach(el => {
    el.addEventListener('input', () => el.classList.remove('cell-invalid'));
    el.addEventListener('change', () => el.classList.remove('cell-invalid'));
  });

  // Export Excel / CSV and PDF preview
  document.getElementById('btn-export-intake-csv')?.addEventListener('click', () => {
    exportMilkIntakeCSV(_donations);
  });
  document.getElementById('btn-export-intake-pdf')?.addEventListener('click', () => {
    showMilkIntakePrintPreview(_donations);
  });

  // Save single draft row with validation
  document.querySelectorAll('.js-save-single-donation').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = parseInt(btn.dataset.draftIdx, 10);
      const row = btn.closest('tr');
      const data = _collectDonationRowData(row);

      if (!await _validateDonationData(data, row)) {
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Saving…';

      const { error } = await createMilkDonation({
        ...data,
        profileId: _profile?.id,
        profileName: _profile?.full_name || 'Nutrition Staff'
      });

      if (error) {
        await MilkModal.alert('Error saving row: ' + error, 'Save Failed');
        btn.disabled = false;
        btn.innerHTML = '<span class="icon" style="font-size:16px;">check</span> Save';
      } else {
        _draftDonations.splice(idx, 1);
        await _loadData();
      }
    });
  });

  // Live highlight when Condition @ Donor or Arrival is marked compromised + auto-sync Transport -> Arrival dates
  document.querySelectorAll('.grid-row--draft').forEach(row => {
    const condCol = row.querySelector('.js-donor-cond-col');
    const condArr = row.querySelector('.js-donor-cond-arr');
    const transCond = row.querySelector('.js-donor-trans-cond');
    const syncCompromised = () => {
      const isComp = condCol?.value === 'compromised' || condArr?.value === 'compromised';
      row.classList.toggle('grid-row--compromised', isComp);
      if (transCond) transCond.placeholder = isComp ? 'Reason required *' : 'e.g. cooler box (opt)';
    };
    condCol?.addEventListener('change', syncCompromised);
    condArr?.addEventListener('change', syncCompromised);

    const transStart = row.querySelector('.js-donor-trans-date');
    const transEnd = row.querySelector('.js-donor-trans-date-end');
    const arrStart = row.querySelector('.js-donor-arrival-date');
    const arrEnd = row.querySelector('.js-donor-arrival-date-end');
    let arrStartEdited = false;
    let arrEndEdited = false;
    arrStart?.addEventListener('change', () => { arrStartEdited = true; });
    arrEnd?.addEventListener('change', () => { arrEndEdited = true; });
    transStart?.addEventListener('change', () => {
      if (arrStart && !arrStartEdited) arrStart.value = transStart.value;
    });
    transEnd?.addEventListener('change', () => {
      if (arrEnd && !arrEndEdited) arrEnd.value = transEnd.value;
    });
  });

  // Discard single draft row
  document.querySelectorAll('.js-discard-single-donation').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.draftIdx, 10);
      _draftDonations.splice(idx, 1);
      _renderActiveSheet();
    });
  });

  // Bulk save all pending draft rows
  document.getElementById('btn-save-all-donations')?.addEventListener('click', async () => {
    if (_draftDonations.length === 0) return;

    const rows = document.querySelectorAll('.grid-row--draft');
    const validRows = [];

    for (const row of rows) {
      const data = _collectDonationRowData(row);
      if (!await _validateDonationData(data, row)) {
        return;
      }
      validRows.push(data);
    }

    const btn = document.getElementById('btn-save-all-donations');
    btn.disabled = true;
    btn.textContent = 'Saving all…';

    const { error } = await createMilkDonationsBulk(validRows, _profile?.id, _profile?.full_name);
    if (error) {
      await MilkModal.alert('Bulk save error: ' + error, 'Bulk Save Failed');
      btn.disabled = false;
      btn.textContent = `Save All Pending (${_draftDonations.length})`;
    } else {
      _draftDonations = [];
      await _loadData();
    }
  });
}

function _collectDonationRowData(row) {
  const today = getLocalDateString();
  return {
    donor_code:              row.querySelector('.js-donor-code')?.value?.trim() || '',
    expression_date_notes:   row.querySelector('.js-donor-exp-date')?.value || today,
    expression_time:         row.querySelector('.js-donor-exp-time')?.value || '08:00',
    transport_date:          row.querySelector('.js-donor-trans-date')?.value || today,
    transport_date_end:      row.querySelector('.js-donor-trans-date-end')?.value || '',
    transport_time:          row.querySelector('.js-donor-trans-time')?.value || '12:00',
    condition_at_collection: row.querySelector('.js-donor-cond-col')?.value || 'ok',
    arrival_date:            row.querySelector('.js-donor-arrival-date')?.value || today,
    arrival_date_end:        row.querySelector('.js-donor-arrival-date-end')?.value || '',
    arrival_time:            row.querySelector('.js-donor-arrival-time')?.value || '12:30',
    condition_at_arrival:    row.querySelector('.js-donor-cond-arr')?.value || 'ok',
    transport_condition:     row.querySelector('.js-donor-trans-cond')?.value?.trim() || ''
  };
}

async function _validateDonationData(data, row) {
  row.querySelectorAll('.cell-invalid').forEach(el => el.classList.remove('cell-invalid'));

  if (!data.donor_code) {
    const input = row.querySelector('.js-donor-code');
    input?.classList.add('cell-invalid');
    input?.focus();
    await MilkModal.alert('Please enter a confidential Donor Code (e.g. DNR-26-001).', 'Validation Required');
    return false;
  }

  const isCompromised = data.condition_at_collection === 'compromised' || data.condition_at_arrival === 'compromised';
  if (isCompromised) {
    if (!data.transport_condition) {
      const input = row.querySelector('.js-donor-trans-cond');
      input?.classList.add('cell-invalid');
      input?.focus();
      await MilkModal.alert('Milk is marked Compromised. Please enter the reason in Conditions of Transport (e.g. "Thawed in transit", "Broken seal").', 'Reason Required');
      return false;
    }
    const ok = await MilkModal.confirm(
      `Milk for "${data.donor_code}" is marked Compromised. Saving will quarantine/reject this intake and exclude it from pasteurization. Continue?`,
      'Quarantine Compromised Milk'
    );
    if (!ok) return false;
  }

  if (data.transport_date_end && data.transport_date && data.transport_date_end < data.transport_date) {
    const input = row.querySelector('.js-donor-trans-date-end');
    input?.classList.add('cell-invalid');
    input?.focus();
    await MilkModal.alert(`Transport end date (${data.transport_date_end}) cannot be earlier than start date (${data.transport_date}).`, 'Invalid Date Range');
    return false;
  }

  if (data.arrival_date_end && data.arrival_date && data.arrival_date_end < data.arrival_date) {
    const input = row.querySelector('.js-donor-arrival-date-end');
    input?.classList.add('cell-invalid');
    input?.focus();
    await MilkModal.alert(`Arrival end date (${data.arrival_date_end}) cannot be earlier than start date (${data.arrival_date}).`, 'Invalid Date Range');
    return false;
  }

  if (data.expression_date_notes && data.arrival_date) {
    if (data.arrival_date < data.expression_date_notes) {
      const input = row.querySelector('.js-donor-arrival-date');
      input?.classList.add('cell-invalid');
      input?.focus();
      await MilkModal.alert(`Arrival date (${data.arrival_date}) cannot be earlier than milk expression date (${data.expression_date_notes}).`, 'Invalid Date Sequence');
      return false;
    }
  }

  return true;
}

function _openConfidentialDonorLookupModal(targetInput, onPicked = null) {
  document.getElementById('milk-donor-lookup-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'milk-donor-lookup-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:8000;background:rgba(0,0,0,0.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:24px;';

  const nextCode = getNextDonorCode();
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  overlay.innerHTML = `
    <div role="dialog" aria-modal="true" aria-labelledby="donor-lookup-title"
         style="background:var(--color-surface,#ffffff);border-radius:var(--radius-xl,16px);box-shadow:0 24px 60px rgba(0,0,0,0.22);width:100%;max-width:540px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--color-border,#e2e8f0);">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 24px;border-bottom:1px solid var(--color-border,#e2e8f0);background:#f8fafc;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:40px;height:40px;border-radius:10px;background:#e0f2fe;color:#0284c7;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <span class="icon" aria-hidden="true">badge</span>
          </div>
          <div>
            <h3 id="donor-lookup-title" style="margin:0;font-size:17px;font-weight:700;color:var(--color-text,#0f172a);">Confidential Donor Registry</h3>
            <p style="font-size:12px;color:var(--color-text-muted,#64748b);margin:3px 0 0;">
              Names stay confidential here; only the Donor Code is logged in Milk Received.
            </p>
          </div>
        </div>
        <button type="button" id="donor-lookup-close" aria-label="Close"
                style="background:none;border:none;cursor:pointer;color:var(--color-text-muted,#64748b);padding:6px;border-radius:8px;display:flex;align-items:center;justify-content:center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div style="padding:20px 24px;overflow-y:auto;display:flex;flex-direction:column;gap:14px;">
        <div>
          <input type="search" id="donor-lookup-search" class="form-input" placeholder="Search existing donor by name, barangay, or code..." style="width:100%;" />
        </div>
        <div id="donor-lookup-list" style="max-height:175px;overflow-y:auto;border:1px solid var(--color-border,#e2e8f0);border-radius:10px;padding:8px;display:flex;flex-direction:column;gap:6px;background:#f8fafc;"></div>

        <div style="border-top:1px dashed var(--color-border,#e2e8f0);padding-top:14px;">
          <div style="font-size:12.5px;font-weight:700;margin-bottom:10px;color:var(--color-text,#0f172a);">+ Register New Confidential Donor</div>
          <div id="donor-dup-warning" style="display:none;margin-bottom:10px;padding:8px 12px;border-radius:8px;background:rgba(217,119,6,0.12);color:#b45309;font-size:12px;border:1px solid rgba(217,119,6,0.3);"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <input type="text" id="new-donor-name" class="form-input" placeholder="Mother's Full Name *" />
            <input type="text" id="new-donor-brgy" class="form-input" placeholder="Barangay (prevents name mix-up) *" />
            <input type="text" id="new-donor-contact" class="form-input" placeholder="Contact # (optional)" />
            <input type="text" id="new-donor-code" class="form-input" value="${esc(nextCode)}" placeholder="Donor Code" style="font-family:monospace;font-weight:600;color:#0284c7;" />
          </div>
          <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px;">
            <button type="button" id="btn-register-donor-cancel" class="btn btn-secondary btn-sm">Cancel</button>
            <button type="button" id="btn-register-donor-save" class="btn btn-sm" style="background:#0284c7;border-color:#0284c7;color:#ffffff;font-weight:600;">Issue Code &amp; Select</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#donor-lookup-close')?.addEventListener('click', close);
  overlay.querySelector('#btn-register-donor-cancel')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  const listEl = overlay.querySelector('#donor-lookup-list');
  const searchEl = overlay.querySelector('#donor-lookup-search');
  const nameEl = overlay.querySelector('#new-donor-name');
  const brgyEl = overlay.querySelector('#new-donor-brgy');
  const contactEl = overlay.querySelector('#new-donor-contact');
  const codeEl = overlay.querySelector('#new-donor-code');
  const dupWarn = overlay.querySelector('#donor-dup-warning');

  function renderList(q = '') {
    const donors = getConfidentialDonors();
    const term = q.trim().toLowerCase();
    const matches = donors.filter(d =>
      !term ||
      d.donor_code.toLowerCase().includes(term) ||
      d.full_name.toLowerCase().includes(term) ||
      (d.barangay || '').toLowerCase().includes(term)
    );
    if (!matches.length) {
      listEl.innerHTML = `<div style="font-size:12px; color:var(--color-text-muted); padding:10px; text-align:center;">No matching donor profiles yet. Register below.</div>`;
      return;
    }
    listEl.innerHTML = matches.map(d => `
      <button type="button" class="js-pick-donor" data-code="${esc(d.donor_code)}"
              style="display:flex; justify-content:space-between; align-items:center; width:100%; text-align:left; padding:7px 10px; border:1px solid var(--color-border); border-radius:6px; background:var(--color-surface); cursor:pointer;">
        <div>
          <strong style="font-size:12.5px; color:var(--color-text);">${esc(d.full_name)}</strong>
          <span style="font-size:11.5px; color:var(--color-text-muted); margin-left:6px;">${esc(d.barangay || 'No Brgy')}</span>
        </div>
        <code style="font-size:11.5px; font-weight:700; color:#0284c7;">${esc(d.donor_code)}</code>
      </button>
    `).join('');

    listEl.querySelectorAll('.js-pick-donor').forEach(btn => {
      btn.addEventListener('click', () => {
        const pickedCode = btn.dataset.code || '';
        targetInput.value = pickedCode;
        targetInput.classList.remove('cell-invalid');
        if (onPicked) {
          const donorObj = getConfidentialDonors().find(d => d.donor_code === pickedCode);
          onPicked(donorObj || { donor_code: pickedCode });
        }
        close();
      });
    });
  }

  renderList();
  searchEl?.addEventListener('input', () => renderList(searchEl.value));

  nameEl?.addEventListener('input', () => {
    const val = nameEl.value.trim().toLowerCase();
    if (!val) { dupWarn.style.display = 'none'; return; }
    const sameNames = getConfidentialDonors().filter(d => d.full_name.toLowerCase() === val);
    if (sameNames.length > 0) {
      const summary = sameNames.map(d => `${d.donor_code} (${d.barangay || 'No Brgy'})`).join(', ');
      dupWarn.textContent = `Notice: "${nameEl.value.trim()}" already exists (${summary}). Select above if same mother, or enter Barangay to issue a separate unique Donor Code.`;
      dupWarn.style.display = 'block';
    } else {
      dupWarn.style.display = 'none';
    }
  });

  overlay.querySelector('#btn-register-donor-save')?.addEventListener('click', () => {
    const fullName = nameEl?.value?.trim();
    const barangay = brgyEl?.value?.trim();
    if (!fullName || !barangay) {
      dupWarn.textContent = 'Please enter both Mother\'s Full Name and Barangay.';
      dupWarn.style.display = 'block';
      return;
    }
    const saved = saveConfidentialDonor({
      full_name: fullName,
      barangay,
      contact: contactEl?.value?.trim() || '',
      donor_code: codeEl?.value?.trim() || '',
    });
    targetInput.value = saved.donor_code;
    targetInput.classList.remove('cell-invalid');
    if (onPicked) onPicked(saved);
    close();
  });
}

// ════════════════════════════════════════════════════════════════════════════
// SHEET 0: Donor Log (Form MH.MNAO.FM.004.00)
// ════════════════════════════════════════════════════════════════════════════
async function _resolveDonorCodeWithDuplicateCheck({ donor_code, donor_name, barangay }) {
  const donors = getConfidentialDonors();
  const normName = donor_name.trim().toLowerCase();
  const normBrgy = barangay.trim().toLowerCase();

  const sameNameMatches = donors.filter(d => (d.full_name || '').trim().toLowerCase() === normName);
  if (sameNameMatches.length === 0) return donor_code;

  const exactMatch = sameNameMatches.find(d => (d.barangay || '').trim().toLowerCase() === normBrgy);
  if (exactMatch) {
    return exactMatch.donor_code;
  }

  const first = sameNameMatches[0];
  const summary = sameNameMatches.map(d => `${d.donor_code} (${d.barangay || 'No Brgy'})`).join(', ');
  const reuse = await MilkModal.confirm(
    `A donor named "${donor_name}" already exists in the registry (${summary}).\n\nIs this the SAME mother returning? Click OK to reuse ${first.donor_code}, or Cancel to issue a separate Donor Code (${donor_code}).`,
    'Possible Duplicate Donor'
  );
  return reuse ? first.donor_code : donor_code;
}

function _queueIntakeDraftFromDonorLog(entry) {
  const safeDate = (entry.donation_date && entry.expression_date && entry.donation_date < entry.expression_date)
    ? entry.expression_date
    : (entry.donation_date || '');
  _draftDonations.push({
    donor_code: entry.donor_code || '',
    expression_date_notes: entry.expression_date || '',
    expression_time: entry.expression_time || '08:00',
    transport_date: safeDate,
    transport_date_end: '',
    transport_time: entry.donation_time || '09:00',
    condition_at_collection: 'ok',
    arrival_date: safeDate,
    arrival_date_end: '',
    arrival_time: entry.donation_time || '09:00',
    condition_at_arrival: 'ok',
    transport_condition: '',
  });
}

function _bindDonorLogSheetEvents() {
  const today = getLocalDateString();

  document.getElementById('btn-export-donor-log-csv')?.addEventListener('click', () => {
    exportDonorLogCSV(_donorLogEntries);
  });
  document.getElementById('btn-export-donor-log-pdf')?.addEventListener('click', () => {
    showDonorLogPrintPreview(_donorLogEntries);
  });

  document.getElementById('btn-add-donor-log-row')?.addEventListener('click', () => {
    _draftDonorLog.push({
      donor_code: getNextDonorCode(),
      donor_name: '',
      barangay: '',
      contact: '',
      donation_date: today,
      donation_time: '09:00',
      expression_date: today,
      expression_time: '08:00',
      volume_ml: '',
    });
    _renderActiveSheet();
    _scrollToBottomDraft();
  });

  // Auto-fill existing donor_code when Name + Barangay match an existing confidential donor
  document.querySelectorAll('tr[data-dl-draft-idx]').forEach(row => {
    const nameIn = row.querySelector('.js-dl-name');
    const brgyIn = row.querySelector('.js-dl-brgy');
    const codeIn = row.querySelector('.js-dl-code');
    const contactIn = row.querySelector('.js-dl-contact');
    const tryAutoFill = () => {
      const n = nameIn?.value?.trim().toLowerCase();
      const b = brgyIn?.value?.trim().toLowerCase();
      if (!n || !b || !codeIn) return;
      const match = getConfidentialDonors().find(
        d => (d.full_name || '').trim().toLowerCase() === n && (d.barangay || '').trim().toLowerCase() === b
      );
      if (match) {
        codeIn.value = match.donor_code;
        if (contactIn && !contactIn.value && match.contact) contactIn.value = match.contact;
      }
    };
    nameIn?.addEventListener('blur', tryAutoFill);
    brgyIn?.addEventListener('change', tryAutoFill);
  });

  document.querySelectorAll('.js-save-dl-row').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.dlDraftIdx, 10);
      const row = btn.closest('tr');
      let donor_code = row.querySelector('.js-dl-code')?.value?.trim() || '';
      const donor_name = row.querySelector('.js-dl-name')?.value?.trim() || '';
      const barangay = row.querySelector('.js-dl-brgy')?.value?.trim() || '';
      const contact = row.querySelector('.js-dl-contact')?.value?.trim() || '';
      const donation_date = row.querySelector('.js-dl-don-date')?.value || today;
      const donation_time = row.querySelector('.js-dl-don-time')?.value || '09:00';
      const expression_date = row.querySelector('.js-dl-exp-date')?.value || today;
      const expression_time = row.querySelector('.js-dl-exp-time')?.value || '08:00';
      const volume_ml = row.querySelector('.js-dl-vol')?.value || '';

      if (!donor_name) {
        row.querySelector('.js-dl-name')?.classList.add('cell-invalid');
        await MilkModal.alert("Please enter the Donor's Name.", 'Validation Required');
        return;
      }
      if (!barangay) {
        row.querySelector('.js-dl-brgy')?.classList.add('cell-invalid');
        await MilkModal.alert('Please enter the Barangay (prevents name mix-ups).', 'Validation Required');
        return;
      }
      if (!volume_ml || parseInt(volume_ml, 10) <= 0) {
        row.querySelector('.js-dl-vol')?.classList.add('cell-invalid');
        await MilkModal.alert('Please enter the Volume Donated (mL).', 'Validation Required');
        return;
      }

      donor_code = await _resolveDonorCodeWithDuplicateCheck({ donor_code, donor_name, barangay });

      const savedEntry = await addDonorLogEntry({
        donor_code,
        donor_name,
        barangay,
        contact,
        donation_date,
        donation_time,
        expression_date,
        expression_time,
        volume_ml,
        staff_name: _profile?.full_name || 'Nutrition Staff',
      }, _profile);
      _queueIntakeDraftFromDonorLog(savedEntry);
      _draftDonorLog.splice(idx, 1);
      const donorLogsRes = await fetchDonorLogEntries();
      _donorLogEntries = donorLogsRes.data || [];
      _updateTabCounts();
      _renderActiveSheet();
    });
  });

  document.getElementById('btn-save-all-donor-log')?.addEventListener('click', async () => {
    const rows = Array.from(document.querySelectorAll('tr[data-dl-draft-idx]'));
    if (!rows.length) return;
    let savedCount = 0;
    const failedIndices = new Set();

    for (const row of rows) {
      const idx = parseInt(row.dataset.dlDraftIdx, 10);
      let donor_code = row.querySelector('.js-dl-code')?.value?.trim() || '';
      const donor_name = row.querySelector('.js-dl-name')?.value?.trim() || '';
      const barangay = row.querySelector('.js-dl-brgy')?.value?.trim() || '';
      const contact = row.querySelector('.js-dl-contact')?.value?.trim() || '';
      const donation_date = row.querySelector('.js-dl-don-date')?.value || today;
      const donation_time = row.querySelector('.js-dl-don-time')?.value || '09:00';
      const expression_date = row.querySelector('.js-dl-exp-date')?.value || today;
      const expression_time = row.querySelector('.js-dl-exp-time')?.value || '08:00';
      const volume_ml = row.querySelector('.js-dl-vol')?.value || '';

      if (!donor_name || !barangay || !volume_ml || parseInt(volume_ml, 10) <= 0) {
        if (!donor_name) row.querySelector('.js-dl-name')?.classList.add('cell-invalid');
        if (!barangay) row.querySelector('.js-dl-brgy')?.classList.add('cell-invalid');
        if (!volume_ml || parseInt(volume_ml, 10) <= 0) row.querySelector('.js-dl-vol')?.classList.add('cell-invalid');
        failedIndices.add(idx);
        continue;
      }

      donor_code = await _resolveDonorCodeWithDuplicateCheck({ donor_code, donor_name, barangay });

      const savedEntry = await addDonorLogEntry({
        donor_code,
        donor_name,
        barangay,
        contact,
        donation_date,
        donation_time,
        expression_date,
        expression_time,
        volume_ml,
        staff_name: _profile?.full_name || 'Nutrition Staff',
      }, _profile);
      _queueIntakeDraftFromDonorLog(savedEntry);
      savedCount++;
    }

    _draftDonorLog = _draftDonorLog.filter((_, i) => failedIndices.has(i));
    const donorLogsRes = await fetchDonorLogEntries();
    _donorLogEntries = donorLogsRes.data || [];
    _updateTabCounts();
    _renderActiveSheet();

    if (failedIndices.size > 0) {
      await MilkModal.alert(
        `Saved ${savedCount} entry row(s). ${failedIndices.size} row(s) highlighted in red still need Donor's Name, Barangay, and Volume (mL).`,
        'Partial Save'
      );
    }
  });

  document.querySelectorAll('.js-discard-dl-row').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.dlDraftIdx, 10);
      _draftDonorLog.splice(idx, 1);
      _renderActiveSheet();
    });
  });
}

// ════════════════════════════════════════════════════════════════════════════
// SHEET 2: Pasteurized Batches (BM-XXX) & Virtual Freezer Events
// ════════════════════════════════════════════════════════════════════════════
function _bindBatchesSheetEvents() {
  // Option B view toggles
  document.getElementById('btn-subview-table')?.addEventListener('click', () => {
    _batchesSubView = 'table';
    _renderActiveSheet();
  });

  document.getElementById('btn-subview-freezer')?.addEventListener('click', () => {
    _batchesSubView = 'freezer';
    _renderActiveSheet();
  });

  // Enforce numeric only on all batch bags quantity inputs
  document.querySelectorAll('.js-batch-bags').forEach(inp => _enforceNumericOnly(inp));

  // Clear invalid outline on input
  document.querySelectorAll('.milk-sheet-table input, .milk-sheet-table select').forEach(el => {
    el.addEventListener('input', () => el.classList.remove('cell-invalid'));
    el.addEventListener('change', () => el.classList.remove('cell-invalid'));
  });

  // Table View: Export Batches Excel / CSV and PDF
  document.getElementById('btn-export-batches-csv')?.addEventListener('click', () => {
    exportMilkBatchesCSV(_batches);
  });
  document.getElementById('btn-export-batches-pdf')?.addEventListener('click', () => {
    showMilkBatchesPrintPreview(_batches);
  });

  // Table View: Add batch row at bottom of ledger (pre-selects recommended shelf, user can change anytime)
  document.getElementById('btn-add-batch-row')?.addEventListener('click', async () => {
    const nextBatch = await getNextBatchNumber();
    const today = getLocalDateString();

    const activeFreezer = _freezers.find(f => f.id === _activeFreezerId) || _freezers[0];
    const fName = activeFreezer ? activeFreezer.name : 'Upright Freezer A';
    const allocations = getFreezerShelfAllocations(fName, _batches, _freezers, null);
    const recShelf = allocations.find(a => a.usedBags < 20)?.shelfName
      || (activeFreezer && activeFreezer.shelves && activeFreezer.shelves[0])
      || 'Shelf 1';

    _draftBatches.push({
      batch_number: nextBatch,
      date_pasteurized: today,
      expiry_date: addOneYearToDate(today),
      freezer_shelf: formatFreezerShelf(fName, recShelf),
      total_bags: ''
    });
    _renderActiveSheet();
    _scrollToBottomDraft();
  });

  // Sync draft batch fields & auto-recalculate 1-year expiry when Date Pasteurized changes
  document.querySelectorAll('.grid-row--draft').forEach(row => {
    const idx = parseInt(row.dataset.draftIdx, 10);
    const batchNoInp  = row.querySelector('.js-batch-no');
    const datePastInp = row.querySelector('.js-batch-date-past');
    const expiryInp   = row.querySelector('.js-batch-expiry');
    const bagsInp     = row.querySelector('.js-batch-bags');

    batchNoInp?.addEventListener('input', () => {
      if (_draftBatches[idx]) _draftBatches[idx].batch_number = batchNoInp.value;
    });
    bagsInp?.addEventListener('input', () => {
      if (_draftBatches[idx]) _draftBatches[idx].total_bags = bagsInp.value;
    });
    expiryInp?.addEventListener('change', () => {
      if (_draftBatches[idx]) _draftBatches[idx].expiry_date = expiryInp.value;
    });
    datePastInp?.addEventListener('change', () => {
      const nextDate = datePastInp.value;
      if (_draftBatches[idx]) _draftBatches[idx].date_pasteurized = nextDate;
      if (nextDate && expiryInp) {
        const autoExp = addOneYearToDate(nextDate);
        expiryInp.value = autoExp;
        if (_draftBatches[idx]) _draftBatches[idx].expiry_date = autoExp;
      }
    });
  });

  // Dynamic freezer selection for draft rows: update Shelf dropdown options & recommend best shelf
  document.querySelectorAll('.js-draft-freezer').forEach(sel => {
    sel.addEventListener('change', () => {
      const idx = parseInt(sel.dataset.draftIdx, 10);
      const chosenFreezerName = sel.value;
      const targetFreezer = _freezers.find(f => f.name.toLowerCase() === chosenFreezerName.toLowerCase()) || _freezers[0];
      const allocations = getFreezerShelfAllocations(targetFreezer.name, _batches, _freezers, null);
      const availableShelf = allocations.find(a => a.usedBags < 20);
      const recShelfName = availableShelf ? availableShelf.shelfName : (allocations[0]?.shelfName || 'Shelf 1');
      if (_draftBatches[idx]) {
        _draftBatches[idx].freezer_shelf = formatFreezerShelf(targetFreezer.name, recShelfName);
      }
      const row = sel.closest('tr');
      const shelfSel = row?.querySelector('.js-draft-shelf');
      if (shelfSel) {
        shelfSel.innerHTML = allocations.map(a => {
          const free = Math.max(0, 20 - a.usedBags);
          const isSel = a.shelfName.toLowerCase() === recShelfName.toLowerCase();
          const isRec = a.shelfName.toLowerCase() === recShelfName.toLowerCase() && free > 0;
          const capLabel = a.usedBags >= 20 ? ' (20/20 · Full)' : (a.usedBags === 0 ? ' (0/20 · Empty)' : ` (${a.usedBags}/20 · ${free} free)`);
          const recTag = isRec ? ' ★ Recommended' : '';
          return `<option value="${a.shelfName}" ${isSel ? 'selected' : ''}>${a.shelfName}${capLabel}${recTag}</option>`;
        }).join('');
      }
    });
  });

  // Dynamic shelf selection for draft rows: respect user's explicit shelf choice
  document.querySelectorAll('.js-draft-shelf').forEach(sel => {
    sel.addEventListener('change', () => {
      const idx = parseInt(sel.dataset.draftIdx, 10);
      const row = sel.closest('tr');
      const freezerName = row?.querySelector('.js-draft-freezer')?.value || (_freezers[0]?.name || 'Upright Freezer A');
      const chosenShelfName = sel.value || 'Shelf 1';
      if (_draftBatches[idx]) {
        _draftBatches[idx].freezer_shelf = formatFreezerShelf(freezerName, chosenShelfName);
      }
    });
  });

  // Save single batch row with strict validation & user-chosen shelf (+ capacity guidance)
  document.querySelectorAll('.js-save-single-batch').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.draftIdx, 10);
      const row = btn.closest('tr');
      const data = _collectBatchRowData(row);

      const otherDrafts = _draftBatches.filter((_, i) => i !== idx);
      if (!(await _validateBatchData(data, row, _batches, otherDrafts))) {
        return;
      }

      const targetFreezer = _freezers.find(f => f.name.toLowerCase() === data.freezerName.toLowerCase()) || _freezers[0];
      const numBags = parseInt(data.total_bags, 10) || 0;

      // If all configured shelves in freezer are completely full (20/20 each)
      if (data.isFreezerFull) {
        const nextShelfNum = (targetFreezer.shelves ? targetFreezer.shelves.length : 6) + 1;
        const newShelfName = `Shelf ${nextShelfNum}`;
        const confirmed = await MilkModal.confirm(
          `"${data.freezerName}" is completely full (all shelves have 20 bags).\n\nWould you like to automatically add "${newShelfName}" to this freezer, or put this batch on another freezer?`,
          'Freezer Full',
          'Add Shelf & Save',
          false
        );
        if (!confirmed) {
          return;
        }
        addShelfToFreezer(targetFreezer.id, newShelfName);
        _shelves = getFreezerShelves();
        data.shelfName = newShelfName;
        data.freezer_shelf = formatFreezerShelf(data.freezerName, newShelfName);
      } else if (data.chosenShelfUsed + numBags > 20) {
        const freeOnChosen = Math.max(0, 20 - data.chosenShelfUsed);
        const overflow = (data.chosenShelfUsed + numBags) - 20;
        const recHint = (data.recommendedShelf && data.recommendedShelf.toLowerCase() !== data.shelfName.toLowerCase())
          ? `\n\nTip: "${data.recommendedShelf}" is recommended (${data.recommendedShelfFree} bag slots free).`
          : '';
        const confirmed = await MilkModal.confirm(
          `"${data.shelfName}" in ${data.freezerName} currently has ${data.chosenShelfUsed}/20 bags (${freeOnChosen} free).\n\nPlacing ${numBags} bag(s) on "${data.shelfName}" will roll ${overflow} excess bag(s) onto the next shelf.${recHint}\n\nProceed with "${data.shelfName}"?`,
          'Shelf Capacity Guidance',
          `Save on ${data.shelfName}`,
          false
        );
        if (!confirmed) {
          return;
        }
      }

      btn.disabled = true;
      btn.textContent = 'Saving…';

      const { error } = await createMilkBatch({
        ...data,
        profileId: _profile?.id,
        profileName: _profile?.full_name || 'Nutrition Staff'
      });

      if (error) {
        await MilkModal.alert('Error saving batch: ' + error, 'Save Failed');
        btn.disabled = false;
        btn.innerHTML = '<span class="icon" style="font-size:16px;">check</span> Save';
      } else {
        _draftBatches.splice(idx, 1);
        await _loadData();
      }
    });
  });

  // Discard single batch row
  document.querySelectorAll('.js-discard-single-batch').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.draftIdx, 10);
      _draftBatches.splice(idx, 1);
      _renderActiveSheet();
    });
  });

  // Bulk save all pending batches with strict validation
  document.getElementById('btn-save-all-batches')?.addEventListener('click', async () => {
    if (_draftBatches.length === 0) return;

    const rows = document.querySelectorAll('.grid-row--draft');
    const validRows = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const data = _collectBatchRowData(row);
      const otherDrafts = validRows;
      if (!(await _validateBatchData(data, row, _batches, otherDrafts))) {
        return;
      }
      validRows.push(data);
    }

    const btn = document.getElementById('btn-save-all-batches');
    btn.disabled = true;
    btn.textContent = 'Saving all…';

    const { error } = await createMilkBatchesBulk(validRows, _profile?.id, _profile?.full_name || 'Nutrition Staff');
    if (error) {
      await MilkModal.alert('Bulk batch save error: ' + error, 'Bulk Save Failed');
      btn.disabled = false;
      btn.textContent = `Save All Pending (${_draftBatches.length})`;
    } else {
      _draftBatches = [];
      await _loadData();
    }
  });

  // Dynamic Freezer select inline update on saved rows (auto-assigns to next available shelf in target freezer)
  document.querySelectorAll('.js-update-freezer').forEach(select => {
    select.addEventListener('change', async () => {
      const batchId = select.dataset.batchId;
      const newFreezerName = select.value;
      const batch = _batches.find(b => b.id === batchId);
      const prevLoc = getBatchFreezerAndShelf(batch, _freezers);

      const targetFreezer = _freezers.find(f => f.name.toLowerCase() === newFreezerName.toLowerCase()) || _freezers[0];
      const allocations = getFreezerShelfAllocations(targetFreezer.name, _batches, _freezers, batchId);
      const availableShelf = allocations.find(a => a.usedBags < 20);
      const newShelf = availableShelf ? availableShelf.shelfName : `Shelf ${allocations.length + 1}`;

      const combinedLocation = formatFreezerShelf(newFreezerName, newShelf);

      // Instantly update batch in memory so UI reflects immediately
      if (batch) {
        batch.freezer_shelf = combinedLocation;
      }

      select.disabled = true;
      const { error } = await updateBatchShelf(batchId, combinedLocation, batch?.batch_number, _profile);
      select.disabled = false;

      if (error) {
        await MilkModal.alert('Failed to update freezer location: ' + error, 'Freezer Update Failed');
        if (batch) batch.freezer_shelf = `${prevLoc.freezerName} / ${prevLoc.shelfName}`;
      } else {
        fetchMilkAuditLogs().then(res => {
          if (res.data) {
            _auditLogs = res.data;
            _updateTabCounts();
          }
        });
      }
      _renderActiveSheet();
    });
  });

  // Dynamic Shelf select inline update on saved rows (user-chosen shelf)
  document.querySelectorAll('.js-update-shelf').forEach(select => {
    select.addEventListener('change', async () => {
      const batchId = select.dataset.batchId;
      const newShelfName = select.value;
      const batch = _batches.find(b => b.id === batchId);
      if (!batch) return;
      const prevLoc = getBatchFreezerAndShelf(batch, _freezers);
      const combinedLocation = formatFreezerShelf(prevLoc.freezerName, newShelfName);

      batch.freezer_shelf = combinedLocation;
      select.disabled = true;
      const { error } = await updateBatchShelf(batchId, combinedLocation, batch?.batch_number, _profile);
      select.disabled = false;

      if (error) {
        await MilkModal.alert('Failed to update shelf location: ' + error, 'Shelf Update Failed');
        batch.freezer_shelf = `${prevLoc.freezerName} / ${prevLoc.shelfName}`;
      } else {
        fetchMilkAuditLogs().then(res => {
          if (res.data) {
            _auditLogs = res.data;
            _updateTabCounts();
          }
        });
      }
      _renderActiveSheet();
    });
  });

  // Quick Dispense: Jumps directly to Beneficiary Dispensing Ledger with batch preselected (NO MODAL)
  const jumpToDispense = (batchId) => {
    const targetBatch = _batches.find(b => b.id === batchId);
    if (targetBatch && isMilkBatchExpired(targetBatch)) {
      MilkModal.alert(
        `Batch "${targetBatch.batch_number}" is expired (${targetBatch.expiry_date}) and cannot be dispensed to infants.`,
        'Expired Batch Blocked'
      );
      return;
    }

    _activeTab = 'dispense';
    const defaultQty = targetBatch ? (targetBatch.remaining_bags || 1) : 1;
    _draftDispatches.push({
      dispensed_date: getLocalDateString(),
      recipient_name: '',
      barangay: '',
      batch_id: batchId || '',
      bags_dispensed: defaultQty
    });

    // Update active tab header UI
    document.querySelectorAll('.milk-tab').forEach(t => {
      const isTarget = t.dataset.tab === 'dispense';
      t.classList.toggle('milk-tab--active', isTarget);
      t.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    _renderActiveSheet();
    _scrollToBottomDraft();
  };

  const dispenseFromShelf = (shelfName) => {
    if (!shelfName) return;
    const activeFreezer = _freezers.find(f => f.id === _activeFreezerId) || _freezers[0];
    const allocations = getFreezerShelfAllocations(activeFreezer ? activeFreezer.name : '', _batches, _freezers, null);
    const targetShelf = allocations.find(s => s.shelfName.toLowerCase() === shelfName.toLowerCase());

    if (!targetShelf || !targetShelf.batches || targetShelf.batches.length === 0) {
      MilkModal.alert(`No active batches to dispense on ${shelfName}.`, 'Shelf Empty');
      return;
    }

    // Push non-expired rows sequentially in shelf order at bottom of ledger
    const validBatches = targetShelf.batches.filter(
      item => item.batch && item.bags > 0 && !isMilkBatchExpired(item.batch)
    );
    if (validBatches.length === 0) {
      MilkModal.alert(
        `All batches currently stored on ${shelfName} are expired and blocked from infant dispensing.`,
        'Expired Batches Blocked'
      );
      return;
    }

    _activeTab = 'dispense';
    const today = getLocalDateString();

    validBatches.forEach(item => {
      _draftDispatches.push({
        dispensed_date: today,
        recipient_name: '',
        barangay: '',
        batch_id: item.batch.id,
        bags_dispensed: item.bags
      });
    });

    // Update active tab header UI
    document.querySelectorAll('.milk-tab').forEach(t => {
      const isTarget = t.dataset.tab === 'dispense';
      t.classList.toggle('milk-tab--active', isTarget);
      t.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    _renderActiveSheet();
    _scrollToBottomDraft();
  };

  document.querySelectorAll('.js-quick-dispense-btn').forEach(btn => {
    btn.addEventListener('click', () => jumpToDispense(btn.dataset.batchId));
  });

  document.querySelectorAll('.js-freezer-dispense').forEach(btn => {
    btn.addEventListener('click', () => jumpToDispense(btn.dataset.batchId));
  });

  document.querySelectorAll('.js-dispense-shelf-btn').forEach(btn => {
    btn.addEventListener('click', () => dispenseFromShelf(btn.dataset.shelfName));
  });

  // ── Digital Twin Freezer Events ───────────────────────────────────────────
  if (_batchesSubView === 'freezer') {
    // Top bar: Add New Batch -> switch to table view and add new draft row at bottom of ledger
    document.getElementById('btn-freezer-add-batch')?.addEventListener('click', async () => {
      _batchesSubView = 'table';
      const nextBatch = await getNextBatchNumber();
      const today = getLocalDateString();

      const activeFreezer = _freezers.find(f => f.id === _activeFreezerId) || _freezers[0];
      const fName = activeFreezer ? activeFreezer.name : 'Upright Freezer A';
      const allocations = getFreezerShelfAllocations(fName, _batches, _freezers, null);
      const recShelf = allocations.find(a => a.usedBags < 20)?.shelfName
        || (activeFreezer && activeFreezer.shelves && activeFreezer.shelves[0])
        || 'Shelf 1';

      _draftBatches.push({
        batch_number: nextBatch,
        date_pasteurized: today,
        expiry_date: addOneYearToDate(today),
        freezer_shelf: formatFreezerShelf(fName, recShelf),
        total_bags: ''
      });
      _renderActiveSheet();
      _scrollToBottomDraft();
    });

    // Freezer Tabs: Switch between freezers
    document.querySelectorAll('.js-switch-freezer').forEach(tabBtn => {
      tabBtn.addEventListener('click', (e) => {
        if (e.target.closest('.js-rename-freezer') || e.target.closest('.js-delete-freezer')) return;
        const fId = tabBtn.dataset.freezerId;
        if (fId && fId !== _activeFreezerId) {
          _activeFreezerId = fId;
          setActiveFreezerId(fId);
          _shelves = getFreezerShelves();
          _selectedBatch = null;
          _selectedShelf = null;
          _renderActiveSheet();
        }
      });
    });

    // Freezer Tabs: Add New Freezer button
    document.getElementById('btn-add-freezer')?.addEventListener('click', async () => {
      const defaultName = `Freezer ${String.fromCharCode(65 + _freezers.length)}`;
      const name = await MilkModal.prompt(
        'Enter a name for the new cold-chain freezer unit:',
        defaultName,
        'Add New Freezer',
        'Create Freezer'
      );
      if (name && name.trim()) {
        _freezers = addFreezer(name.trim(), _profile);
        _activeFreezerId = getActiveFreezerId();
        _shelves = getFreezerShelves();
        _selectedBatch = null;
        _selectedShelf = null;
        await _loadData();
      }
    });

    // Freezer Settings (Name + Max Bags per Shelf)
    document.querySelectorAll('.js-rename-freezer').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const fId = btn.dataset.freezerId || _activeFreezerId;
        const targetFreezer = _freezers.find(f => f.id === fId);
        if (!targetFreezer) return;

        document.getElementById('milk-freezer-settings-overlay')?.remove();
        const overlay = document.createElement('div');
        overlay.id = 'milk-freezer-settings-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:8000;background:rgba(0,0,0,0.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:24px;';
        const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const currentCap = getFreezerCapacity(targetFreezer);

        overlay.innerHTML = `
          <div role="dialog" aria-modal="true" aria-labelledby="freezer-settings-title"
               style="background:var(--color-surface,#fff);border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,0.22);width:100%;max-width:440px;overflow:hidden;border:1px solid var(--color-border,#e2e8f0);">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--color-border,#e2e8f0);background:#f8fafc;">
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:36px;height:36px;border-radius:10px;background:#e0f2fe;color:#0284c7;display:flex;align-items:center;justify-content:center;">
                  <span class="icon" aria-hidden="true">settings</span>
                </div>
                <div>
                  <h3 id="freezer-settings-title" style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">Freezer Settings</h3>
                  <div style="font-size:12px;color:#64748b;">Customize freezer name &amp; shelf capacity</div>
                </div>
              </div>
              <button type="button" id="fs-close" aria-label="Close" style="background:none;border:none;cursor:pointer;color:#64748b;padding:4px;border-radius:8px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style="padding:20px 22px;display:flex;flex-direction:column;gap:14px;">
              <div>
                <label for="fs-name" style="display:block;font-size:12.5px;font-weight:600;color:#334155;margin-bottom:6px;">Freezer Name</label>
                <input type="text" id="fs-name" class="form-input" value="${esc(targetFreezer.name)}" style="width:100%;" />
              </div>
              <div>
                <label for="fs-cap" style="display:block;font-size:12.5px;font-weight:600;color:#334155;margin-bottom:6px;">Max Bags per Shelf</label>
                <input type="number" id="fs-cap" class="form-input" min="1" max="500" step="1" value="${currentCap}" style="width:100%;" />
                <div style="font-size:11.5px;color:#64748b;margin-top:4px;">Default is 20 bags/shelf. Excess bags automatically roll over to adjacent shelves.</div>
              </div>
              <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:6px;">
                <button type="button" id="fs-cancel" class="btn btn-secondary btn-sm" style="border-radius:9999px;">Cancel</button>
                <button type="button" id="fs-save" class="btn btn-sm" style="background:#0284c7;border-color:#0284c7;color:#fff;font-weight:600;border-radius:9999px;padding:6px 16px;">Save Settings</button>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(overlay);
        const close = () => overlay.remove();
        overlay.querySelector('#fs-close')?.addEventListener('click', close);
        overlay.querySelector('#fs-cancel')?.addEventListener('click', close);
        overlay.addEventListener('click', (ev) => { if (ev.target === overlay) close(); });
        overlay.querySelector('#fs-save')?.addEventListener('click', async () => {
          const nextName = overlay.querySelector('#fs-name')?.value?.trim();
          const nextCap = parseInt(overlay.querySelector('#fs-cap')?.value, 10);
          if (!nextName || !Number.isFinite(nextCap) || nextCap < 1) {
            await MilkModal.alert('Please enter a valid freezer name and capacity (>= 1).', 'Invalid Settings');
            return;
          }
          _freezers = updateFreezerSettings(fId, { name: nextName, shelf_capacity: nextCap }, _profile);
          close();
          await _loadData();
        });
      });
    });

    // Delete Freezer (with confirmation warning popup)
    document.querySelectorAll('.js-delete-freezer').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const fId = btn.dataset.freezerId;
        const targetFreezer = _freezers.find(f => f.id === fId);
        if (!targetFreezer) return;

        if (_freezers.length <= 1) {
          await MilkModal.alert('Cannot delete the last remaining cold-chain freezer.', 'Action Restricted');
          return;
        }

        // Check if this freezer has active batches
        const batchesInThisFreezer = _batches.filter(b => {
          if ((b.remaining_bags || 0) <= 0) return false;
          const loc = getBatchFreezerAndShelf(b, _freezers);
          return loc.freezerId === fId || loc.freezerName.toLowerCase() === targetFreezer.name.toLowerCase();
        });

        let confirmMsg = `Are you sure you want to delete freezer "${targetFreezer.name}"?`;
        if (batchesInThisFreezer.length > 0) {
          confirmMsg = `WARNING: Freezer "${targetFreezer.name}" currently contains ${batchesInThisFreezer.length} active pasteurized batch(es). Deleting this freezer unit will require reallocating stored stock. Are you sure you want to proceed?`;
        }

        const confirmed = await MilkModal.confirm(
          confirmMsg,
          'Delete Cold-Chain Freezer',
          'Delete Freezer',
          true
        );

        if (confirmed) {
          _freezers = deleteFreezer(fId, _profile);
          _activeFreezerId = getActiveFreezerId();
          _shelves = getFreezerShelves();
          _selectedBatch = null;
          _selectedShelf = null;
          await _loadData();
        }
      });
    });

    // Shelf click: select shelf and update system status + details card
    document.querySelectorAll('.js-freezer-shelf').forEach(shelfEl => {
      shelfEl.addEventListener('click', (e) => {
        if (e.target.closest('.js-freezer-batch-box')) return;
        const shelfName = shelfEl.dataset.shelfName;
        if (_selectedShelf === shelfName && !_selectedBatch) {
          _selectedShelf = null;
        } else {
          _selectedShelf = shelfName;
          _selectedBatch = null;
        }
        _renderActiveSheet();
      });
    });

    // Batch Box click: select batch and update system status + details card
    document.querySelectorAll('.js-freezer-batch-box').forEach(boxEl => {
      boxEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const batchId = boxEl.dataset.batchId;
        const found = _batches.find(b => b.id === batchId);
        if (found) {
          _selectedBatch = found;
          _selectedShelf = found.freezer_shelf;
          _renderActiveSheet();
        }
      });
    });

    // ── Drag and Drop: Rearrange batches across shelves in Virtual Freezer ──
    document.querySelectorAll('.js-freezer-batch-box').forEach(boxEl => {
      boxEl.addEventListener('dragstart', (e) => {
        const batchId = boxEl.dataset.batchId;
        e.dataTransfer.setData('text/plain', batchId);
        e.dataTransfer.effectAllowed = 'move';
        boxEl.classList.add('batch-box--dragging');
      });

      boxEl.addEventListener('dragend', () => {
        boxEl.classList.remove('batch-box--dragging');
        document.querySelectorAll('.js-freezer-shelf').forEach(s => s.classList.remove('digital-twin-shelf--drag-over'));
      });
    });

    document.querySelectorAll('.js-freezer-shelf').forEach(shelfEl => {
      shelfEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        shelfEl.classList.add('digital-twin-shelf--drag-over');
      });

      shelfEl.addEventListener('dragleave', (e) => {
        if (!shelfEl.contains(e.relatedTarget)) {
          shelfEl.classList.remove('digital-twin-shelf--drag-over');
        }
      });

      shelfEl.addEventListener('drop', async (e) => {
        e.preventDefault();
        shelfEl.classList.remove('digital-twin-shelf--drag-over');

        const batchId = e.dataTransfer.getData('text/plain');
        if (!batchId) return;

        const targetShelfName = shelfEl.dataset.shelfName;
        const targetBatch = _batches.find(b => b.id === batchId);
        if (!targetBatch) return;

        const activeFreezer = _freezers.find(f => f.id === _activeFreezerId) || _freezers[0];
        const currentLoc = getBatchFreezerAndShelf(targetBatch, _freezers);

        // If dropped onto the exact same starting shelf in the same freezer, do nothing
        if (currentLoc.freezerName.toLowerCase() === activeFreezer.name.toLowerCase() &&
            currentLoc.shelfName.toLowerCase() === targetShelfName.toLowerCase()) {
          return;
        }

        const newLocation = formatFreezerShelf(activeFreezer.name, targetShelfName);

        // Check if target shelf has capacity or will roll over
        const targetLoad = getShelfLoad(activeFreezer.name, targetShelfName, _batches, _freezers, batchId);
        const batchBags = targetBatch.remaining_bags || 0;

        if (targetLoad >= 20 || targetLoad + batchBags > 20) {
          const msg = targetLoad >= 20
            ? `"${targetShelfName}" in ${activeFreezer.name} is full (${targetLoad}/20 bags).\n\nMoving batch "${targetBatch.batch_number}" (${batchBags} bags) here will roll excess bags over to adjacent shelves.\n\nDo you want to proceed?`
            : `"${targetShelfName}" in ${activeFreezer.name} currently has ${targetLoad}/20 bags.\n\nAdding batch "${targetBatch.batch_number}" (${batchBags} bags) will exceed the 20-bag shelf limit by ${targetLoad + batchBags - 20} bag(s), rolling excess bags over to the next shelf.\n\nDo you want to proceed?`;

          const confirmed = await MilkModal.confirm(msg, 'Shelf Reallocation', 'Move Batch', false);
          if (!confirmed) return;
        }

        // Instantly update batch location in memory
        targetBatch.freezer_shelf = newLocation;
        _renderActiveSheet();

        // Persist to Supabase and log audit trail
        const { error } = await updateBatchShelf(batchId, newLocation, targetBatch.batch_number, _profile);
        if (error) {
          await MilkModal.alert('Failed to save batch move: ' + error, 'Move Failed');
          await _loadData();
        } else {
          fetchMilkAuditLogs().then(res => {
            if (res.data) {
              _auditLogs = res.data;
              _updateTabCounts();
            }
          });
        }
      });
    });

    // Edit Batch (from Detail Card)
    document.querySelectorAll('.js-freezer-edit-batch').forEach(btn => {
      btn.addEventListener('click', () => {
        const batchId = btn.dataset.batchId;
        const batch = _batches.find(b => b.id === batchId);
        if (batch) {
          openEditBatchModal({
            batch,
            shelves: _shelves,
            freezers: _freezers,
            batches: _batches,
            profile: _profile,
            onSave: async () => {
              await _loadData();
              _selectedBatch = _batches.find(b => b.id === batchId) || null;
              _renderActiveSheet();
            }
          });
        }
      });
    });

    // Delete Batch (from Detail Card)
    document.querySelectorAll('.js-freezer-delete-batch').forEach(btn => {
      btn.addEventListener('click', () => {
        const batchId = btn.dataset.batchId;
        const batch = _batches.find(b => b.id === batchId);
        if (batch) {
          openDeleteBatchModal({
            batch,
            profile: _profile,
            onDelete: async () => {
              _selectedBatch = null;
              await _loadData();
            }
          });
        }
      });
    });

    // Dispense Bags (from Detail Card) -> jumps directly to ledger
    document.querySelectorAll('.js-freezer-dispense-batch').forEach(btn => {
      btn.addEventListener('click', () => {
        const batchId = btn.dataset.batchId;
        jumpToDispense(batchId);
      });
    });

    // Add Shelf to current freezer
    document.getElementById('btn-freezer-add-shelf')?.addEventListener('click', async () => {
      const nextNum = _shelves.length + 1;
      const name = await MilkModal.prompt(
        'Enter name for the new shelf:',
        `Shelf ${nextNum}`,
        'Add Shelf',
        'Add Shelf'
      );
      if (name && name.trim()) {
        _shelves = addShelfToFreezer(_activeFreezerId, name.trim());
        _freezers = getFreezers();
        _renderActiveSheet();
      }
    });

    // Remove Last Shelf from current freezer
    document.getElementById('btn-freezer-remove-shelf')?.addEventListener('click', async () => {
      const lastShelf = _shelves[_shelves.length - 1];
      const confirmed = await MilkModal.confirm(
        `Remove "${lastShelf}"? (Active batches on this shelf should be relocated first)`,
        'Remove Shelf',
        'Remove Shelf',
        true
      );
      if (confirmed) {
        _shelves = removeShelfFromFreezer(_activeFreezerId);
        _freezers = getFreezers();
        if (_selectedShelf === lastShelf) _selectedShelf = null;
        _renderActiveSheet();
      }
    });
  }
}

function _collectBatchRowData(row) {
  const freezerName = row.querySelector('.js-draft-freezer')?.value || (_freezers[0]?.name || 'Upright Freezer A');
  const targetFreezer = _freezers.find(f => f.name.toLowerCase() === freezerName.toLowerCase()) || _freezers[0];
  const allocations = getFreezerShelfAllocations(targetFreezer?.name || freezerName, _batches, _freezers, null);
  const availableShelf = allocations.find(a => a.usedBags < 20);
  const chosenShelf = row.querySelector('.js-draft-shelf')?.value;
  const shelfName = chosenShelf || (availableShelf ? availableShelf.shelfName : `Shelf ${allocations.length + 1}`);
  const chosenAlloc = allocations.find(a => a.shelfName.toLowerCase() === shelfName.toLowerCase());

  return {
    batch_number:         row.querySelector('.js-batch-no')?.value?.trim() || '',
    date_pasteurized:     row.querySelector('.js-batch-date-past')?.value || '',
    expiry_date:          row.querySelector('.js-batch-expiry')?.value || '',
    freezer_shelf:        formatFreezerShelf(freezerName, shelfName),
    total_bags:           row.querySelector('.js-batch-bags')?.value?.trim() || '',
    freezerName,
    shelfName,
    chosenShelfUsed:      chosenAlloc ? chosenAlloc.usedBags : 0,
    recommendedShelf:     availableShelf ? availableShelf.shelfName : null,
    recommendedShelfFree: availableShelf ? Math.max(0, 20 - availableShelf.usedBags) : 0,
    isFreezerFull:        !availableShelf
  };
}

// ════════════════════════════════════════════════════════════════════════════
// SHEET 3: Dispensing Ledger Events
// ════════════════════════════════════════════════════════════════════════════
function _bindDispatchesSheetEvents() {
  // Enforce numeric only on all dispense bags quantity inputs
  document.querySelectorAll('.js-dispense-bags').forEach(inp => {
    _enforceNumericOnly(inp);
    inp.addEventListener('input', () => {
      const row = inp.closest('tr');
      const batchSelect = row?.querySelector('.js-dispense-batch');
      const batch = _batches.find(b => b.id === batchSelect?.value);
      const max = batch ? (batch.remaining_bags || 1) : 9999;
      let val = parseInt(inp.value, 10);
      if (!isNaN(val) && val > max) {
        inp.value = max;
      }
    });
  });

  // Batch dropdown change in draft row: default quantity to remaining bags & update max
  document.querySelectorAll('.js-dispense-batch').forEach(sel => {
    sel.addEventListener('change', () => {
      const row = sel.closest('tr');
      const idx = parseInt(sel.dataset.draftIdx, 10);
      const batchId = sel.value;
      const batch = _batches.find(b => b.id === batchId);
      const bagsInput = row?.querySelector('.js-dispense-bags');
      if (batch && bagsInput) {
        const avail = batch.remaining_bags || 1;
        bagsInput.max = avail;
        bagsInput.value = avail; // Defaults to its full amount!
        bagsInput.title = `Maximum available for ${batch.batch_number}: ${avail} bag(s)`;
        if (_draftDispatches[idx]) {
          _draftDispatches[idx].batch_id = batchId;
          _draftDispatches[idx].bags_dispensed = avail;
        }
      }
    });
  });

  // Clear invalid outline on input
  document.querySelectorAll('.milk-sheet-table input, .milk-sheet-table select').forEach(el => {
    el.addEventListener('input', () => el.classList.remove('cell-invalid'));
    el.addEventListener('change', () => el.classList.remove('cell-invalid'));
  });

  // Export Dispensing Ledger Excel / CSV and PDF
  document.getElementById('btn-export-dispenses-csv')?.addEventListener('click', () => {
    exportMilkDispensingCSV(_dispatches);
  });
  document.getElementById('btn-export-dispenses-pdf')?.addEventListener('click', () => {
    showMilkDispensingPrintPreview(_dispatches, _batches);
  });

  document.getElementById('btn-add-dispatch-row')?.addEventListener('click', () => {
    const available = _batches.filter(b => (b.remaining_bags || 0) > 0 && !isMilkBatchExpired(b));
    const fefo = getFefoPriorityBatch(_batches) || available[0];
    const defaultQty = fefo ? (fefo.remaining_bags || 1) : 1;
    _draftDispatches.push({
      dispensed_date: getLocalDateString(),
      recipient_name: '',
      barangay: '',
      batch_id: fefo ? fefo.id : '',
      bags_dispensed: defaultQty
    });
    _renderActiveSheet();
    _scrollToBottomDraft();
  });

  // Save single dispatch row with strict validation
  document.querySelectorAll('.js-save-single-dispatch').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.draftIdx, 10);
      const row = btn.closest('tr');
      const data = _collectDispatchRowData(row);

      const available = _batches.filter(b => (b.remaining_bags || 0) > 0 && !isMilkBatchExpired(b));
      if (!(await _validateDispatchData(data, row, available))) {
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Issuing…';

      const { error } = await dispenseMilk({
        ...data,
        profileId: _profile?.id,
        profileName: _profile?.full_name || 'Nutrition Staff'
      });

      if (error) {
        await MilkModal.alert('Error issuing milk: ' + error, 'Dispense Failed');
        btn.disabled = false;
        btn.innerHTML = '<span class="icon" style="font-size:16px;">check</span> Issue';
      } else {
        _draftDispatches.splice(idx, 1);
        await _loadData();
      }
    });
  });

  // Discard single dispatch row
  document.querySelectorAll('.js-discard-single-dispatch').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.draftIdx, 10);
      _draftDispatches.splice(idx, 1);
      _renderActiveSheet();
    });
  });

  // Bulk save all pending dispatches with strict validation
  document.getElementById('btn-save-all-dispatches')?.addEventListener('click', async () => {
    if (_draftDispatches.length === 0) return;

    const rows = document.querySelectorAll('.grid-row--draft');
    const validRows = [];
    const available = _batches.filter(b => (b.remaining_bags || 0) > 0 && !isMilkBatchExpired(b));

    for (const row of rows) {
      const data = _collectDispatchRowData(row);
      if (!(await _validateDispatchData(data, row, available))) {
        return;
      }
      validRows.push(data);
    }

    const btn = document.getElementById('btn-save-all-dispatches');
    btn.disabled = true;
    btn.textContent = 'Processing all…';

    for (const item of validRows) {
      const { error } = await dispenseMilk({
        ...item,
        profileId: _profile?.id,
        profileName: _profile?.full_name || 'Nutrition Staff'
      });
      if (error) {
        await MilkModal.alert(`Error dispensing for ${item.recipient_name}: ${error}`, 'Dispense Failed');
        btn.disabled = false;
        btn.textContent = `Save All Pending (${_draftDispatches.length})`;
        return;
      }
    }

    _draftDispatches = [];
    await _loadData();
  });
}

function _collectDispatchRowData(row) {
  return {
    dispensed_date: row.querySelector('.js-dispense-date')?.value || getLocalDateString(),
    recipient_name: row.querySelector('.js-dispense-recipient')?.value?.trim() || '',
    barangay:       row.querySelector('.js-dispense-brgy')?.value || '',
    batch_id:       row.querySelector('.js-dispense-batch')?.value || '',
    bags_dispensed: row.querySelector('.js-dispense-bags')?.value?.trim() || '1'
  };
}

async function _validateBatchData(data, row, existingBatches = [], otherDraftBatches = []) {
  row.querySelectorAll('.cell-invalid').forEach(el => el.classList.remove('cell-invalid'));

  // 1. Batch Number
  if (!data.batch_number || !data.batch_number.trim()) {
    const input = row.querySelector('.js-batch-no');
    input?.classList.add('cell-invalid');
    input?.focus();
    await MilkModal.alert('Please enter a Batch Number (e.g. BM-096).', 'Validation Required');
    return false;
  }

  const cleanBatchNo = data.batch_number.trim().toUpperCase();

  // Duplicate check in database
  const dupInDb = existingBatches.find(b => b.batch_number && b.batch_number.toUpperCase() === cleanBatchNo);
  if (dupInDb) {
    const input = row.querySelector('.js-batch-no');
    input?.classList.add('cell-invalid');
    input?.focus();
    await MilkModal.alert(`Batch Number "${cleanBatchNo}" already exists in the database. Every pasteurized batch must have a unique identifier.`, 'Duplicate Batch Number');
    return false;
  }

  // Duplicate check in pending draft rows
  const dupInDraft = otherDraftBatches.find(b => b.batch_number && b.batch_number.toUpperCase() === cleanBatchNo);
  if (dupInDraft) {
    const input = row.querySelector('.js-batch-no');
    input?.classList.add('cell-invalid');
    input?.focus();
    await MilkModal.alert(`Batch Number "${cleanBatchNo}" is duplicated across pending rows. Please use unique batch numbers.`, 'Duplicate Batch Number');
    return false;
  }

  // 2. Quantity (Bags) - STRICT NUMBER ONLY (Integer >= 1)
  const bagsNum = Number(data.total_bags);
  if (!data.total_bags || isNaN(bagsNum) || !Number.isInteger(bagsNum) || bagsNum <= 0) {
    const input = row.querySelector('.js-batch-bags');
    input?.classList.add('cell-invalid');
    input?.focus();
    await MilkModal.alert('Quantity (Total Bags) must be a whole positive number (minimum 1 bag).', 'Invalid Quantity');
    return false;
  }

  // 3. Dates
  if (!data.date_pasteurized) {
    const input = row.querySelector('.js-batch-date-past');
    input?.classList.add('cell-invalid');
    input?.focus();
    await MilkModal.alert('Please select a Date Pasteurized.', 'Missing Date');
    return false;
  }

  if (!data.expiry_date) {
    const input = row.querySelector('.js-batch-expiry');
    input?.classList.add('cell-invalid');
    input?.focus();
    await MilkModal.alert('Please select an Expiration Date.', 'Missing Expiration Date');
    return false;
  }

  if (data.expiry_date <= data.date_pasteurized) {
    const input = row.querySelector('.js-batch-expiry');
    input?.classList.add('cell-invalid');
    input?.focus();
    await MilkModal.alert(`Expiration date (${data.expiry_date}) must be strictly after the date pasteurized (${data.date_pasteurized}).`, 'Invalid Expiration Date');
    return false;
  }

  return true;
}

async function _validateDispatchData(data, row, availableBatches = []) {
  row.querySelectorAll('.cell-invalid').forEach(el => el.classList.remove('cell-invalid'));

  // 1. Recipient
  if (!data.recipient_name || !data.recipient_name.trim()) {
    const input = row.querySelector('.js-dispense-recipient');
    input?.classList.add('cell-invalid');
    input?.focus();
    await MilkModal.alert('Please enter Recipient Infant / Mother name.', 'Validation Required');
    return false;
  }

  // 2. Batch Selected
  if (!data.batch_id) {
    const select = row.querySelector('.js-dispense-batch');
    select?.classList.add('cell-invalid');
    select?.focus();
    await MilkModal.alert('Please select a pasteurized batch to dispense from.', 'Select Batch');
    return false;
  }

  const selectedBatch = availableBatches.find(b => b.id === data.batch_id);
  if (!selectedBatch) {
    const rawMatch = _batches.find(b => b.id === data.batch_id);
    if (rawMatch && isMilkBatchExpired(rawMatch)) {
      await MilkModal.alert(
        `Batch "${rawMatch.batch_number}" is expired (${rawMatch.expiry_date}) and cannot be dispensed.`,
        'Expired Batch Blocked'
      );
      return false;
    }
    await MilkModal.alert('Selected batch is not available in stock.', 'Out of Stock');
    return false;
  }

  // 3. Quantity (Bags Dispensed) - STRICT NUMBER ONLY (Integer >= 1, cannot be 0)
  const bagsNum = Number(data.bags_dispensed);
  if (!data.bags_dispensed || isNaN(bagsNum) || !Number.isInteger(bagsNum) || bagsNum <= 0) {
    const input = row.querySelector('.js-dispense-bags');
    input?.classList.add('cell-invalid');
    input?.focus();
    await MilkModal.alert('Quantity to dispense cannot be zero or empty. It must be a whole positive number (minimum 1 bag).', 'Invalid Quantity');
    return false;
  }

  // 4. Stock Availability Check - cannot exceed batch amount
  const maxAvail = selectedBatch.remaining_bags || 0;
  if (bagsNum > maxAvail) {
    const input = row.querySelector('.js-dispense-bags');
    input?.classList.add('cell-invalid');
    if (input) input.value = maxAvail;
    input?.focus();
    await MilkModal.alert(`Cannot dispense ${bagsNum} bag(s). The limit for Batch "${selectedBatch.batch_number}" is ${maxAvail} bag(s) currently available.`, 'Quantity Exceeds Batch Limit');
    return false;
  }

  return true;
}

function _enforceNumericOnly(input) {
  if (!input || input._hasNumericEnforced) return;
  input._hasNumericEnforced = true;

  input.addEventListener('keydown', (e) => {
    // Navigation / editing keys allowed
    if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
      return;
    }
    // Allow Ctrl/Cmd hotkeys
    if (e.ctrlKey || e.metaKey) return;

    // Block non-digit keys: 'e', 'E', '+', '-', '.', ',', etc.
    if (['e', 'E', '+', '-', '.', ','].includes(e.key) || !/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  });

  input.addEventListener('input', () => {
    const clean = input.value.replace(/[^\d]/g, '');
    if (input.value !== clean) {
      input.value = clean;
    }
    if (parseInt(clean, 10) > 0) {
      input.classList.remove('cell-invalid');
    }
  });
}

// ════════════════════════════════════════════════════════════════════════════
// Upper Cell Content & Editor Bar — Real-Time Two-Way Sync (No FX)
// ════════════════════════════════════════════════════════════════════════════
let _activeTargetCell = null;
let _isSyncingCell = false;
let _sheetZoom = 100;

function _applySheetZoom(table) {
  if (!table) return;
  table.style.zoom = `${_sheetZoom}%`;
  const label = document.getElementById('btn-milk-zoom-reset');
  if (label) label.textContent = `${_sheetZoom}%`;
}

function _setupCellBarSync() {
  const barInput = document.getElementById('milk-cell-input');
  const badgeText = document.getElementById('milk-cell-badge-text');
  const statusEl = document.getElementById('milk-cell-status');
  const table = document.querySelector('.milk-sheet-table');
  if (!barInput || !table) return;

  _applySheetZoom(table);
  document.getElementById('btn-milk-zoom-out')?.addEventListener('click', () => {
    _sheetZoom = Math.max(70, _sheetZoom - 10);
    _applySheetZoom(table);
  });
  document.getElementById('btn-milk-zoom-in')?.addEventListener('click', () => {
    _sheetZoom = Math.min(130, _sheetZoom + 10);
    _applySheetZoom(table);
  });
  document.getElementById('btn-milk-zoom-reset')?.addEventListener('click', () => {
    _sheetZoom = 100;
    _applySheetZoom(table);
  });

  // Live toolbar search + filter across all sheet tables
  const applySheetFilters = () => {
    const q = (document.getElementById('milk-sheet-search')?.value || '').trim().toLowerCase();
    const f = (document.getElementById('milk-sheet-filter')?.value || '').trim().toLowerCase();
    table.querySelectorAll('tbody tr:not(.grid-row--draft)').forEach(tr => {
      if (tr.querySelector('.milk-sheet-empty')) return;
      const text = (tr.textContent || '').toLowerCase();
      const inputs = Array.from(tr.querySelectorAll('input, select')).map(el => el.value || '').join(' ').toLowerCase();
      const rowFilterVal = (tr.dataset.filterBrgy || tr.dataset.filterStatus || '').toLowerCase();
      const matchSearch = !q || text.includes(q) || inputs.includes(q);
      const matchFilter = !f || rowFilterVal === f;
      tr.style.display = (matchSearch && matchFilter) ? '' : 'none';
    });
  };
  document.getElementById('milk-sheet-search')?.addEventListener('input', applySheetFilters);
  document.getElementById('milk-sheet-filter')?.addEventListener('change', applySheetFilters);

  _activeTargetCell = null;
  _isSyncingCell = false;

  function setActiveTarget(element) {
    if (!element) return;

    // Clear previous cell & row active outlines
    document.querySelectorAll('.cell-active-excel').forEach(el => el.classList.remove('cell-active-excel'));
    document.querySelectorAll('.row-active-excel').forEach(el => el.classList.remove('row-active-excel'));

    _activeTargetCell = element;
    const tr = element.closest('tr');
    if (tr) tr.classList.add('row-active-excel');

    const td = element.tagName === 'TD' ? element : element.closest('td');
    if (td) td.classList.add('cell-active-excel');
    if (element !== td) element.classList.add('cell-active-excel');

    // 1. Determine Row indicator
    let rowLabel = 'Row';
    if (tr) {
      if (tr.classList.contains('grid-row--draft')) {
        const draftIdx = tr.getAttribute('data-draft-idx');
        rowLabel = draftIdx !== null ? `Draft #${parseInt(draftIdx, 10) + 1}` : 'Draft';
      } else {
        const firstTd = tr.querySelector('td');
        const numText = firstTd ? firstTd.textContent.trim() : '';
        rowLabel = numText ? `Row ${numText}` : `Row ${tr.rowIndex || ''}`;
      }
    }

    // 2. Determine Column Name
    let colName = 'Cell';
    if (element.getAttribute('aria-label')) {
      colName = element.getAttribute('aria-label');
    } else if (element.getAttribute('placeholder')) {
      colName = element.getAttribute('placeholder');
    } else if (td && tr) {
      const colIdx = Array.from(tr.children).indexOf(td);
      const thHeaders = Array.from(table.querySelectorAll('thead th'));
      if (colIdx >= 0 && colIdx < thHeaders.length) {
        colName = thHeaders[colIdx]?.innerText.split('\n')[0].trim() || 'Cell';
      }
    }

    // Update Badge Text
    if (badgeText) {
      badgeText.textContent = `${rowLabel} • ${colName}`;
    }

    // 3. Handle Input (Draft) vs Static Text (Saved)
    const isInput = element.tagName === 'INPUT' || element.tagName === 'SELECT';

    if (!_isSyncingCell) {
      if (isInput) {
        barInput.value = element.value || '';
        barInput.removeAttribute('readonly');
        barInput.style.opacity = '1';
        barInput.placeholder = `Editing ${colName} (${rowLabel})...`;
        if (statusEl) {
          statusEl.textContent = 'Editable';
          statusEl.className = 'milk-cell-status milk-cell-status--draft';
          statusEl.style.display = 'inline-block';
        }
      } else {
        // Saved row cell
        const rawText = (element.innerText || '').trim();
        barInput.value = rawText;
        barInput.setAttribute('readonly', 'true');
        barInput.style.opacity = '0.95';
        barInput.placeholder = `Inspecting ${colName}...`;
        if (statusEl) {
          statusEl.textContent = 'Saved Record';
          statusEl.className = 'milk-cell-status milk-cell-status--saved';
          statusEl.style.display = 'inline-block';
        }
      }
    }
  }

  // Focus and click inside table
  table.addEventListener('focusin', (e) => {
    const target = e.target.closest('input, select, td');
    if (target && !target.closest('.grid-actions-cell') && !target.closest('button')) {
      setActiveTarget(target);
    }
  });

  table.addEventListener('click', (e) => {
    const target = e.target.closest('input, select, td');
    if (target && !target.closest('.grid-actions-cell') && !target.closest('button')) {
      setActiveTarget(target);
    }
  });

  // Table input live sync into upper bar
  table.addEventListener('input', (e) => {
    if (_activeTargetCell && e.target === _activeTargetCell && !_isSyncingCell) {
      _isSyncingCell = true;
      barInput.value = _activeTargetCell.value;
      _isSyncingCell = false;
    }
  });

  table.addEventListener('change', (e) => {
    if (_activeTargetCell && e.target === _activeTargetCell && !_isSyncingCell) {
      _isSyncingCell = true;
      barInput.value = _activeTargetCell.value;
      _isSyncingCell = false;
    }
  });

  // Upper bar focus auto-picks first draft cell if available
  barInput.addEventListener('focus', () => {
    if (!_activeTargetCell || !document.body.contains(_activeTargetCell)) {
      const firstInput = table.querySelector('.grid-row--draft input:not([disabled])');
      if (firstInput) {
        firstInput.focus();
        setActiveTarget(firstInput);
      }
    }
  });

  // Upper bar live sync into active table cell input
  barInput.addEventListener('input', () => {
    if (_isSyncingCell) return;
    if (!_activeTargetCell || !document.body.contains(_activeTargetCell)) {
      const firstInput = table.querySelector('.grid-row--draft input:not([disabled])');
      if (firstInput) setActiveTarget(firstInput);
    }
    if (_activeTargetCell && (_activeTargetCell.tagName === 'INPUT' || _activeTargetCell.tagName === 'SELECT')) {
      _isSyncingCell = true;
      if (_activeTargetCell.classList.contains('js-batch-bags') || _activeTargetCell.classList.contains('js-dispense-bags')) {
        const cleanDigits = barInput.value.replace(/[^\d]/g, '');
        if (barInput.value !== cleanDigits) {
          barInput.value = cleanDigits;
        }
      }
      if (_activeTargetCell.tagName === 'SELECT') {
        const val = barInput.value.toLowerCase().trim();
        const match = Array.from(_activeTargetCell.options).find(
          o => o.value.toLowerCase() === val || o.text.toLowerCase().includes(val)
        );
        if (match) {
          _activeTargetCell.value = match.value;
        }
      } else {
        _activeTargetCell.value = barInput.value;
      }
      _activeTargetCell.dispatchEvent(new Event('input', { bubbles: true }));
      _activeTargetCell.dispatchEvent(new Event('change', { bubbles: true }));
      _isSyncingCell = false;
    }
  });

  // Pressing Enter in upper bar moves to next input in current row
  barInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (_activeTargetCell) {
        _activeTargetCell.dispatchEvent(new Event('change', { bubbles: true }));
        const currentTr = _activeTargetCell.closest('tr');
        if (currentTr) {
          const inputs = Array.from(currentTr.querySelectorAll('input:not([disabled]):not([readonly]), select:not([disabled])'));
          const currentIdx = inputs.indexOf(_activeTargetCell);
          if (currentIdx >= 0 && currentIdx < inputs.length - 1) {
            const nextInput = inputs[currentIdx + 1];
            nextInput.focus();
            setActiveTarget(nextInput);
          } else {
            const saveBtn = currentTr.querySelector('.btn-grid-save');
            if (saveBtn) saveBtn.focus();
          }
        }
      }
    } else if (e.key === 'Escape') {
      if (_activeTargetCell && typeof _activeTargetCell.focus === 'function') {
        _activeTargetCell.focus();
      }
    }
  });
}

