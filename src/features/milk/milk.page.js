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
  deleteFreezer,
  addShelfToFreezer,
  removeShelfFromFreezer,
  getBatchFreezerAndShelf,
  formatFreezerShelf,
  getShelfLoad,
  getFreezerShelfAllocations,
  getBatchActualShelfInfo,
  fetchMilkAuditLogs
} from './milk.service.js';

import {
  openEditBatchModal,
  openDeleteBatchModal
} from './milk.modal.js';

import {
  renderMilkPageSkeleton,
  renderMetrics,
  renderDonationsSheet,
  renderBatchesSheet,
  renderDispatchesSheet,
  renderMilkAuditSheet
} from './milk.render.js';

import { showMilkIntakePrintPreview } from './milk.pdf.js';
import { SystemDialog } from '../../shared/components/dialog.component.js';

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
let _draftBatches = [];
let _draftDispatches = [];

/**
 * Main entry point called by router
 */
export async function renderMilkPage(profile) {
  _profile = profile;

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
  const [batchesRes, donationsRes, dispatchesRes, metrics, auditRes] = await Promise.all([
    fetchMilkBatches(),
    fetchMilkDonations(),
    fetchMilkDispatches(),
    fetchMilkMetrics(),
    fetchMilkAuditLogs()
  ]);

  _batches = batchesRes.data || [];
  _donations = donationsRes.data || [];
  _dispatches = dispatchesRes.data || [];
  _metrics = metrics;
  _auditLogs = auditRes.data || [];

  // Auto-reconcile batches whose physical starting shelf drifted from saved shelf (e.g. target shelf was full)
  for (const b of _batches) {
    if ((b.remaining_bags || 0) > 0) {
      const actual = getBatchActualShelfInfo(b, _batches, _freezers);
      const parsed = getBatchFreezerAndShelf(b, _freezers);
      if (actual.startingShelf && actual.startingShelf.toLowerCase() !== parsed.shelfName.toLowerCase()) {
        const updatedCombined = formatFreezerShelf(actual.freezerName, actual.startingShelf);
        b.freezer_shelf = updatedCombined;
        updateBatchShelf(b.id, updatedCombined, b.batch_number, _profile).catch(console.error);
      }
    }
  }

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
  const batchCountEl = document.getElementById('count-batches');
  const donCountEl = document.getElementById('count-donations');
  const dispCountEl = document.getElementById('count-dispatches');
  const auditCountEl = document.getElementById('count-milk-audit');

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

  const fefoBatch = getFefoPriorityBatch(_batches);

  if (_activeTab === 'intake') {
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
    const available = _batches.filter(b => (b.remaining_bags || 0) > 0);
    contentArea.innerHTML = renderDispatchesSheet(_dispatches, _draftDispatches, available, fefoBatch, _freezers);
    _bindDispatchesSheetEvents();
    _setupCellBarSync();
  } else if (_activeTab === 'audit') {
    contentArea.innerHTML = renderMilkAuditSheet(_auditLogs, _auditFilter, _auditSearch);
    _bindAuditSheetEvents();
  }
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

// ════════════════════════════════════════════════════════════════════════════
// SHEET 1: Log of Milk Received (FM.002.00) Events
// ════════════════════════════════════════════════════════════════════════════
function _bindDonationsSheetEvents() {
  const today = new Date().toISOString().split('T')[0];

  // Add new draft row with default native date and time values
  document.getElementById('btn-add-donation-row')?.addEventListener('click', () => {
    _draftDonations.unshift({
      donor_code: '',
      expression_date_notes: today,
      expression_time: '08:00',
      transport_date: today,
      transport_time: '12:00',
      condition_at_collection: 'ok',
      arrival_date: today,
      arrival_time: '12:30',
      condition_at_arrival: 'ok',
      transport_condition: ''
    });
    _renderActiveSheet();
  });

  // Clear invalid outline on input
  document.querySelectorAll('.milk-sheet-table input, .milk-sheet-table select').forEach(el => {
    el.addEventListener('input', () => el.classList.remove('cell-invalid'));
    el.addEventListener('change', () => el.classList.remove('cell-invalid'));
  });

  // Export PDF preview
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
  const today = new Date().toISOString().split('T')[0];
  return {
    donor_code:              row.querySelector('.js-donor-code')?.value?.trim() || '',
    expression_date_notes:   row.querySelector('.js-donor-exp-date')?.value || today,
    expression_time:         row.querySelector('.js-donor-exp-time')?.value || '08:00',
    transport_date:          row.querySelector('.js-donor-trans-date')?.value || today,
    transport_time:          row.querySelector('.js-donor-trans-time')?.value || '12:00',
    condition_at_collection: row.querySelector('.js-donor-cond-col')?.value || 'ok',
    arrival_date:            row.querySelector('.js-donor-arrival-date')?.value || today,
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
    await MilkModal.alert('Please enter a Donor Name or Donor Code (e.g. 24-672-760).', 'Validation Required');
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

  // Table View: Add batch row
  document.getElementById('btn-add-batch-row')?.addEventListener('click', async () => {
    const nextBatch = await getNextBatchNumber();
    const today = new Date().toISOString().split('T')[0];
    const sixMonths = new Date();
    sixMonths.setMonth(sixMonths.getMonth() + 6);

    const activeFreezer = _freezers.find(f => f.id === _activeFreezerId) || _freezers[0];
    const defaultShelf = (activeFreezer && activeFreezer.shelves && activeFreezer.shelves[0]) || 'Shelf 1';

    _draftBatches.unshift({
      batch_number: nextBatch,
      date_pasteurized: today,
      expiry_date: sixMonths.toISOString().split('T')[0],
      freezer_shelf: formatFreezerShelf(activeFreezer ? activeFreezer.name : 'Upright Freezer A', defaultShelf),
      total_bags: ''
    });
    _renderActiveSheet();
  });

  // Dynamic dropdown pairing for draft rows
  document.querySelectorAll('.js-draft-freezer').forEach(sel => {
    sel.addEventListener('change', () => {
      const idx = parseInt(sel.dataset.draftIdx, 10);
      const chosenFreezerName = sel.value;
      const targetFreezer = _freezers.find(f => f.name.toLowerCase() === chosenFreezerName.toLowerCase()) || _freezers[0];
      const shelfSel = sel.closest('tr')?.querySelector('.js-draft-shelf');
      if (shelfSel && targetFreezer) {
        const shelves = (targetFreezer.shelves && targetFreezer.shelves.length > 0)
          ? targetFreezer.shelves
          : ['Shelf 1', 'Shelf 2', 'Shelf 3', 'Shelf 4'];
        const allocations = getFreezerShelfAllocations(targetFreezer.name, _batches, _freezers, null);
        shelfSel.innerHTML = shelves.map(s => {
          const alloc = allocations.find(a => a.shelfName.toLowerCase() === s.toLowerCase());
          const used = alloc ? alloc.usedBags : 0;
          let badge = `${used}/20 bags`;
          if (used >= 20) badge = '20/20 Full';
          else if (used === 0) badge = '0/20 Empty';
          return `<option value="${escapeHtml(s)}">${escapeHtml(s)} (${badge})</option>`;
        }).join('');
        if (_draftBatches[idx]) {
          _draftBatches[idx].freezer_shelf = formatFreezerShelf(targetFreezer.name, shelves[0]);
        }
      }
    });
  });

  document.querySelectorAll('.js-draft-shelf').forEach(sel => {
    sel.addEventListener('change', () => {
      const idx = parseInt(sel.dataset.draftIdx, 10);
      const freezerSel = sel.closest('tr')?.querySelector('.js-draft-freezer');
      const freezerName = freezerSel?.value || (_freezers[0]?.name || 'Upright Freezer A');
      if (_draftBatches[idx]) {
        _draftBatches[idx].freezer_shelf = formatFreezerShelf(freezerName, sel.value);
      }
    });
  });

  // Save single batch row with strict validation
  document.querySelectorAll('.js-save-single-batch').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.draftIdx, 10);
      const row = btn.closest('tr');
      const data = _collectBatchRowData(row);

      const otherDrafts = _draftBatches.filter((_, i) => i !== idx);
      if (!(await _validateBatchData(data, row, _batches, otherDrafts))) {
        return;
      }

      // Check shelf capacity before saving new batch
      const loc = getBatchFreezerAndShelf(data, _freezers);
      const bagsNum = parseInt(data.total_bags, 10) || 0;
      const targetLoad = getShelfLoad(loc.freezerName, loc.shelfName, _batches, _freezers, null);

      if (targetLoad >= 20 || targetLoad + bagsNum > 20) {
        const msg = targetLoad >= 20
          ? `"${loc.shelfName}" in ${loc.freezerName} is already full (${targetLoad}/20 bags).\n\nLogging batch "${data.batch_number}" (${bagsNum} bags) here will automatically roll excess bags over to the next shelf.\n\nDo you want to proceed?`
          : `"${loc.shelfName}" in ${loc.freezerName} currently has ${targetLoad}/20 bags.\n\nAdding batch "${data.batch_number}" (${bagsNum} bags) will exceed the 20-bag shelf limit by ${targetLoad + bagsNum - 20} bag(s), rolling excess bags over to the next shelf.\n\nDo you want to proceed?`;
        
        const confirmed = await MilkModal.confirm(msg, 'Shelf Capacity Notice', 'Proceed & Save', false);
        if (!confirmed) {
          return;
        }

        // If target shelf is already 100% full, assign to the first shelf that actually has space
        if (targetLoad >= 20) {
          const allocations = getFreezerShelfAllocations(loc.freezerName, _batches, _freezers, null);
          const availableShelf = allocations.find(a => a.usedBags < 20);
          const actualStartShelf = availableShelf ? availableShelf.shelfName : `Shelf ${allocations.length + 1}`;
          data.freezer_shelf = formatFreezerShelf(loc.freezerName, actualStartShelf);
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

  // Dynamic Freezer select inline update on saved rows
  document.querySelectorAll('.js-update-freezer').forEach(select => {
    select.addEventListener('change', async () => {
      const batchId = select.dataset.batchId;
      const newFreezerName = select.value;
      const row = select.closest('tr');
      const shelfSelect = row?.querySelector('.js-update-shelf');

      const batch = _batches.find(b => b.id === batchId);
      const prevLoc = getBatchFreezerAndShelf(batch, _freezers);

      const targetFreezer = _freezers.find(f => f.name.toLowerCase() === newFreezerName.toLowerCase()) || _freezers[0];
      const shelves = (targetFreezer.shelves && targetFreezer.shelves.length > 0)
        ? targetFreezer.shelves
        : ['Shelf 1', 'Shelf 2', 'Shelf 3', 'Shelf 4'];

      // Populate companion shelf dropdown with new freezer's shelves & occupancy
      if (shelfSelect) {
        const allocations = getFreezerShelfAllocations(targetFreezer.name, _batches, _freezers, batchId);
        shelfSelect.innerHTML = shelves.map(s => {
          const alloc = allocations.find(a => a.shelfName.toLowerCase() === s.toLowerCase());
          const used = alloc ? alloc.usedBags : 0;
          let badge = `${used}/20 bags`;
          if (used >= 20) badge = '20/20 Full';
          else if (used === 0) badge = '0/20 Empty';
          return `<option value="${escapeHtml(s)}">${escapeHtml(s)} (${badge})</option>`;
        }).join('');
      }

      const newShelf = (shelfSelect && shelfSelect.value) ? shelfSelect.value : shelves[0];
      const batchBags = batch ? (batch.remaining_bags || 0) : 0;
      const targetLoad = getShelfLoad(targetFreezer.name, newShelf, _batches, _freezers, batchId);

      if (targetLoad >= 20 || targetLoad + batchBags > 20) {
        const msg = targetLoad >= 20
          ? `"${newShelf}" in ${targetFreezer.name} is already full (${targetLoad}/20 bags).\n\nMoving batch "${batch?.batch_number || 'Batch'}" (${batchBags} bags) here will automatically roll excess bags over to the next shelf.\n\nDo you want to proceed?`
          : `"${newShelf}" in ${targetFreezer.name} currently has ${targetLoad}/20 bags.\n\nAdding batch "${batch?.batch_number || 'Batch'}" (${batchBags} bags) will exceed the 20-bag shelf limit by ${targetLoad + batchBags - 20} bag(s), rolling excess bags over to the next shelf.\n\nDo you want to proceed?`;

        const confirmed = await MilkModal.confirm(msg, 'Shelf Capacity Notice', 'Proceed & Roll Over', false);
        if (!confirmed) {
          select.value = prevLoc.freezerName;
          _renderActiveSheet();
          return;
        }
      }

      const combinedLocation = formatFreezerShelf(newFreezerName, newShelf);

      // Instantly update batch in memory so switching to Virtual Freezer reflects immediately with zero reload!
      if (batch) {
        batch.freezer_shelf = combinedLocation;
      }

      select.disabled = true;
      if (shelfSelect) shelfSelect.disabled = true;

      const { error } = await updateBatchShelf(batchId, combinedLocation, batch?.batch_number, _profile);
      select.disabled = false;
      if (shelfSelect) shelfSelect.disabled = false;

      if (error) {
        await MilkModal.alert('Failed to update freezer location: ' + error, 'Freezer Update Failed');
      } else {
        // Refresh audit logs in background and re-render sheet to update shelf badges
        fetchMilkAuditLogs().then(res => {
          if (res.data) {
            _auditLogs = res.data;
            _updateTabCounts();
          }
        });
        _renderActiveSheet();
      }
    });
  });

  // Shelf select inline update on saved rows
  document.querySelectorAll('.js-update-shelf').forEach(select => {
    select.addEventListener('change', async () => {
      const batchId = select.dataset.batchId;
      let effectiveShelf = select.value;
      const row = select.closest('tr');
      const freezerSelect = row?.querySelector('.js-update-freezer');
      const currentFreezerName = freezerSelect?.value || (_freezers[0]?.name || 'Upright Freezer A');

      const batch = _batches.find(b => b.id === batchId);
      const prevLoc = getBatchFreezerAndShelf(batch, _freezers);

      // Check capacity of target shelf
      const batchBags = batch ? (batch.remaining_bags || 0) : 0;
      const targetLoad = getShelfLoad(currentFreezerName, effectiveShelf, _batches, _freezers, batchId);

      if (targetLoad >= 20 || targetLoad + batchBags > 20) {
        const msg = targetLoad >= 20
          ? `"${effectiveShelf}" in ${currentFreezerName} is already full (${targetLoad}/20 bags).\n\nMoving batch "${batch?.batch_number || 'Batch'}" (${batchBags} bags) here will automatically roll excess bags over to the next shelf.\n\nDo you want to proceed?`
          : `"${effectiveShelf}" in ${currentFreezerName} currently has ${targetLoad}/20 bags.\n\nAdding batch "${batch?.batch_number || 'Batch'}" (${batchBags} bags) will exceed the 20-bag shelf limit by ${targetLoad + batchBags - 20} bag(s), rolling excess bags over to the next shelf.\n\nDo you want to proceed?`;

        const confirmed = await MilkModal.confirm(msg, 'Shelf Capacity Notice', 'Proceed & Roll Over', false);
        if (!confirmed) {
          select.value = prevLoc.shelfName;
          return;
        }

        // If target shelf is already 100% full, move to first shelf that actually has space
        if (targetLoad >= 20) {
          const allocations = getFreezerShelfAllocations(currentFreezerName, _batches, _freezers, batchId);
          const availableShelf = allocations.find(a => a.usedBags < 20);
          effectiveShelf = availableShelf ? availableShelf.shelfName : `Shelf ${allocations.length + 1}`;
        }
      }

      const combinedLocation = formatFreezerShelf(currentFreezerName, effectiveShelf);

      // Instantly update batch in memory so switching to Virtual Freezer reflects immediately with zero reload!
      if (batch) {
        batch.freezer_shelf = combinedLocation;
      }

      select.disabled = true;
      const { error } = await updateBatchShelf(batchId, combinedLocation, batch?.batch_number, _profile);
      select.disabled = false;

      if (error) {
        await MilkModal.alert('Failed to update shelf: ' + error, 'Shelf Update Failed');
      } else {
        // Refresh audit logs in background and re-render sheet to update shelf badges
        fetchMilkAuditLogs().then(res => {
          if (res.data) {
            _auditLogs = res.data;
            _updateTabCounts();
          }
        });
        _renderActiveSheet();
      }
    });
  });

  // Quick Dispense: Jumps directly to Beneficiary Dispensing Ledger with batch preselected (NO MODAL)
  const jumpToDispense = (batchId) => {
    _activeTab = 'dispense';
    const targetBatch = _batches.find(b => b.id === batchId);
    const defaultQty = targetBatch ? (targetBatch.remaining_bags || 1) : 1;
    _draftDispatches.unshift({
      dispensed_date: new Date().toISOString().split('T')[0],
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

    // Auto-focus on recipient input for instant entry
    setTimeout(() => {
      const recipientInput = document.querySelector('.grid-row--draft .js-dispense-recipient');
      if (recipientInput) recipientInput.focus();
    }, 80);
  };

  document.querySelectorAll('.js-quick-dispense-btn').forEach(btn => {
    btn.addEventListener('click', () => jumpToDispense(btn.dataset.batchId));
  });

  document.querySelectorAll('.js-freezer-dispense').forEach(btn => {
    btn.addEventListener('click', () => jumpToDispense(btn.dataset.batchId));
  });

  // ── Digital Twin Freezer Events ───────────────────────────────────────────
  if (_batchesSubView === 'freezer') {
    // Top bar: Add New Batch -> switch to table view and add new draft row
    document.getElementById('btn-freezer-add-batch')?.addEventListener('click', async () => {
      _batchesSubView = 'table';
      const nextBatch = await getNextBatchNumber();
      const today = new Date().toISOString().split('T')[0];
      const sixMonths = new Date();
      sixMonths.setMonth(sixMonths.getMonth() + 6);

      const activeFreezer = _freezers.find(f => f.id === _activeFreezerId) || _freezers[0];
      const defaultShelf = (activeFreezer && activeFreezer.shelves && activeFreezer.shelves[0]) || 'Shelf 1';

      _draftBatches.unshift({
        batch_number: nextBatch,
        date_pasteurized: today,
        expiry_date: sixMonths.toISOString().split('T')[0],
        freezer_shelf: formatFreezerShelf(activeFreezer ? activeFreezer.name : 'Upright Freezer A', defaultShelf),
        total_bags: ''
      });
      _renderActiveSheet();
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

    // Rename Freezer (works for both current and any tab)
    document.querySelectorAll('.js-rename-freezer').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const fId = btn.dataset.freezerId || _activeFreezerId;
        const targetFreezer = _freezers.find(f => f.id === fId);
        const newName = await MilkModal.prompt(
          'Enter new name for this cold-chain freezer:',
          targetFreezer ? targetFreezer.name : '',
          'Rename Freezer',
          'Save Name'
        );
        if (newName && newName.trim() && targetFreezer && newName.trim() !== targetFreezer.name) {
          _freezers = renameFreezer(fId, newName.trim(), _profile);
          await _loadData();
        }
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
  const shelfName = row.querySelector('.js-draft-shelf')?.value || 'Shelf 1';
  return {
    batch_number:     row.querySelector('.js-batch-no')?.value?.trim() || '',
    date_pasteurized: row.querySelector('.js-batch-date-past')?.value || '',
    expiry_date:      row.querySelector('.js-batch-expiry')?.value || '',
    freezer_shelf:    formatFreezerShelf(freezerName, shelfName),
    total_bags:       row.querySelector('.js-batch-bags')?.value?.trim() || ''
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

  document.getElementById('btn-add-dispatch-row')?.addEventListener('click', () => {
    const available = _batches.filter(b => (b.remaining_bags || 0) > 0);
    const fefo = getFefoPriorityBatch(_batches) || available[0];
    const defaultQty = fefo ? (fefo.remaining_bags || 1) : 1;
    _draftDispatches.unshift({
      dispensed_date: new Date().toISOString().split('T')[0],
      recipient_name: '',
      barangay: '',
      batch_id: fefo ? fefo.id : '',
      bags_dispensed: defaultQty
    });
    _renderActiveSheet();
  });

  // Save single dispatch row with strict validation
  document.querySelectorAll('.js-save-single-dispatch').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.draftIdx, 10);
      const row = btn.closest('tr');
      const data = _collectDispatchRowData(row);

      const available = _batches.filter(b => (b.remaining_bags || 0) > 0);
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
    const available = _batches.filter(b => (b.remaining_bags || 0) > 0);

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
    dispensed_date: row.querySelector('.js-dispense-date')?.value || new Date().toISOString().split('T')[0],
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

function _setupCellBarSync() {
  const barInput = document.getElementById('milk-cell-input');
  const badgeText = document.getElementById('milk-cell-badge-text');
  const statusEl = document.getElementById('milk-cell-status');
  const table = document.querySelector('.milk-sheet-table');
  if (!barInput || !table) return;

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

