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
  getFefoPriorityBatch
} from './milk.service.js';

import {
  renderMilkPageSkeleton,
  renderMetrics,
  renderDonationsSheet,
  renderBatchesSheet,
  renderDispatchesSheet
} from './milk.render.js';

import { showMilkIntakePrintPreview } from './milk.pdf.js';

// ── Controller State ──────────────────────────────────────────────────────────
let _profile = null;
let _activeTab = 'intake';         // 'intake' | 'batches' | 'dispense'
let _batchesSubView = 'table';    // 'table' | 'freezer' (Option B)

let _batches = [];
let _donations = [];
let _dispatches = [];
let _metrics = null;
let _shelves = [];

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
  _shelves = getFreezerShelves();
  await _loadData();
}

/**
 * Fetch all records and re-render workspace
 */
async function _loadData() {
  const [batchesRes, donationsRes, dispatchesRes, metrics] = await Promise.all([
    fetchMilkBatches(),
    fetchMilkDonations(),
    fetchMilkDispatches(),
    fetchMilkMetrics()
  ]);

  _batches = batchesRes.data || [];
  _donations = donationsRes.data || [];
  _dispatches = dispatchesRes.data || [];
  _metrics = metrics;

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

  if (batchCountEl) batchCountEl.textContent = _batches.length;
  if (donCountEl) donCountEl.textContent = _donations.length;
  if (dispCountEl) dispCountEl.textContent = _dispatches.length;
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
  } else if (_activeTab === 'batches') {
    contentArea.innerHTML = renderBatchesSheet(_batches, _draftBatches, _batchesSubView, _shelves, fefoBatch);
    _bindBatchesSheetEvents();
  } else if (_activeTab === 'dispense') {
    const available = _batches.filter(b => (b.remaining_bags || 0) > 0);
    contentArea.innerHTML = renderDispatchesSheet(_dispatches, _draftDispatches, available, fefoBatch);
    _bindDispatchesSheetEvents();
  }
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
  // Add new draft row
  document.getElementById('btn-add-donation-row')?.addEventListener('click', () => {
    _draftDonations.unshift({
      donor_code: '',
      bags_count: '',
      volume_ml: '',
      expression_date_notes: '@see donor log',
      transport_date: new Date().toISOString().split('T')[0],
      transport_time: '12:00 PM',
      condition_at_collection: 'ok',
      arrival_date: new Date().toISOString().split('T')[0],
      arrival_time: '12:30 PM',
      condition_at_arrival: 'ok'
    });
    _renderActiveSheet();
  });

  // Export PDF preview
  document.getElementById('btn-export-intake-pdf')?.addEventListener('click', () => {
    showMilkIntakePrintPreview(_donations);
  });

  // Save single draft row
  document.querySelectorAll('.js-save-single-donation').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = parseInt(btn.dataset.draftIdx, 10);
      const row = btn.closest('tr');
      const data = _collectDonationRowData(row);

      if (!data.donor_code || !data.bags_count) {
        alert('Please enter both Donor Code and Bags Received.');
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
        alert('Error saving row: ' + error);
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

    // Harvest current inputs from DOM
    const rows = document.querySelectorAll('.grid-row--draft');
    const validRows = [];

    for (const row of rows) {
      const data = _collectDonationRowData(row);
      if (!data.donor_code || !data.bags_count) {
        alert('Each pending row must have a Donor Code and Bags count.');
        return;
      }
      validRows.push(data);
    }

    const btn = document.getElementById('btn-save-all-donations');
    btn.disabled = true;
    btn.textContent = 'Saving all…';

    const { error } = await createMilkDonationsBulk(validRows, _profile?.id, _profile?.full_name);
    if (error) {
      alert('Bulk save error: ' + error);
      btn.disabled = false;
      btn.textContent = `Save All Pending (${_draftDonations.length})`;
    } else {
      _draftDonations = [];
      await _loadData();
    }
  });
}

function _collectDonationRowData(row) {
  return {
    donor_code:              row.querySelector('.js-donor-code')?.value || '',
    bags_count:              row.querySelector('.js-donor-bags')?.value || '',
    volume_ml:               row.querySelector('.js-donor-volume')?.value || '',
    expression_date_notes:   row.querySelector('.js-donor-expression')?.value || '@see donor log',
    transport_date:          row.querySelector('.js-donor-transport-date')?.value || '',
    condition_at_collection: row.querySelector('.js-donor-cond-col')?.value || 'ok',
    arrival_date:            row.querySelector('.js-donor-arrival-date')?.value || '',
    condition_at_arrival:    row.querySelector('.js-donor-cond-arr')?.value || 'ok'
  };
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

  // Table View: Add batch row
  document.getElementById('btn-add-batch-row')?.addEventListener('click', async () => {
    const nextBatch = await getNextBatchNumber();
    const today = new Date().toISOString().split('T')[0];
    const sixMonths = new Date();
    sixMonths.setMonth(sixMonths.getMonth() + 6);

    _draftBatches.unshift({
      batch_number: nextBatch,
      date_pasteurized: today,
      expiry_date: sixMonths.toISOString().split('T')[0],
      freezer_shelf: _shelves[0] || 'Shelf 1',
      total_bags: ''
    });
    _renderActiveSheet();
  });

  // Save single batch row
  document.querySelectorAll('.js-save-single-batch').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.draftIdx, 10);
      const row = btn.closest('tr');
      const data = _collectBatchRowData(row);

      if (!data.batch_number || !data.total_bags || !data.expiry_date) {
        alert('Please fill in Batch Number, Bags, and Expiration Date.');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Saving…';

      const { error } = await createMilkBatch({
        ...data,
        profileId: _profile?.id
      });

      if (error) {
        alert('Error saving batch: ' + error);
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

  // Bulk save all pending batches
  document.getElementById('btn-save-all-batches')?.addEventListener('click', async () => {
    if (_draftBatches.length === 0) return;

    const rows = document.querySelectorAll('.grid-row--draft');
    const validRows = [];

    for (const row of rows) {
      const data = _collectBatchRowData(row);
      if (!data.batch_number || !data.total_bags || !data.expiry_date) {
        alert('Each batch row must have a Batch Number, Total Bags, and Expiry Date.');
        return;
      }
      validRows.push(data);
    }

    const btn = document.getElementById('btn-save-all-batches');
    btn.disabled = true;
    btn.textContent = 'Saving all…';

    const { error } = await createMilkBatchesBulk(validRows, _profile?.id);
    if (error) {
      alert('Bulk batch save error: ' + error);
      btn.disabled = false;
      btn.textContent = `Save All Pending (${_draftBatches.length})`;
    } else {
      _draftBatches = [];
      await _loadData();
    }
  });

  // Shelf select inline update
  document.querySelectorAll('.js-update-shelf').forEach(select => {
    select.addEventListener('change', async () => {
      const batchId = select.dataset.batchId;
      const newShelf = select.value;
      select.disabled = true;

      const { error } = await updateBatchShelf(batchId, newShelf);
      select.disabled = false;
      if (error) {
        alert('Failed to update shelf: ' + error);
      }
    });
  });

  // Quick Dispense buttons (from table or freezer map)
  const jumpToDispense = (batchId) => {
    _activeTab = 'dispense';
    _draftDispatches.unshift({
      dispensed_date: new Date().toISOString().split('T')[0],
      recipient_name: '',
      barangay: '',
      batch_id: batchId,
      bags_dispensed: 1,
      indication: ''
    });

    // Update active tab header UI
    document.querySelectorAll('.milk-tab').forEach(t => {
      const isTarget = t.dataset.tab === 'dispense';
      t.classList.toggle('milk-tab--active', isTarget);
      t.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    _renderActiveSheet();
  };

  document.querySelectorAll('.js-quick-dispense-btn').forEach(btn => {
    btn.addEventListener('click', () => jumpToDispense(btn.dataset.batchId));
  });

  document.querySelectorAll('.js-freezer-dispense').forEach(btn => {
    btn.addEventListener('click', () => jumpToDispense(btn.dataset.batchId));
  });

  // Virtual Freezer: Add Shelf
  document.getElementById('btn-add-shelf')?.addEventListener('click', () => {
    const nextShelfNum = _shelves.length;
    const name = prompt('Enter name for the new freezer shelf:', `Shelf ${nextShelfNum}`);
    if (name) {
      _shelves = addFreezerShelf(name);
      _renderActiveSheet();
    }
  });

  // Virtual Freezer: Remove Last Shelf
  document.getElementById('btn-remove-shelf')?.addEventListener('click', () => {
    const lastShelf = _shelves[_shelves.length - 1];
    if (confirm(`Remove "${lastShelf}"? (Active batches on this shelf should be relocated first)`)) {
      _shelves = removeFreezerShelf(lastShelf);
      _renderActiveSheet();
    }
  });
}

function _collectBatchRowData(row) {
  return {
    batch_number:     row.querySelector('.js-batch-no')?.value || '',
    date_pasteurized: row.querySelector('.js-batch-date-past')?.value || '',
    expiry_date:      row.querySelector('.js-batch-expiry')?.value || '',
    freezer_shelf:    row.querySelector('.js-batch-shelf')?.value || 'Shelf 1',
    total_bags:       row.querySelector('.js-batch-bags')?.value || ''
  };
}

// ════════════════════════════════════════════════════════════════════════════
// SHEET 3: Dispensing Ledger Events
// ════════════════════════════════════════════════════════════════════════════
function _bindDispatchesSheetEvents() {
  document.getElementById('btn-add-dispatch-row')?.addEventListener('click', () => {
    const fefo = getFefoPriorityBatch(_batches);
    _draftDispatches.unshift({
      dispensed_date: new Date().toISOString().split('T')[0],
      recipient_name: '',
      barangay: '',
      batch_id: fefo ? fefo.id : '',
      bags_dispensed: 1,
      indication: ''
    });
    _renderActiveSheet();
  });

  // Save single dispatch row
  document.querySelectorAll('.js-save-single-dispatch').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.draftIdx, 10);
      const row = btn.closest('tr');
      const data = _collectDispatchRowData(row);

      if (!data.recipient_name || !data.batch_id || !data.bags_dispensed) {
        alert('Please provide Recipient Name, select a Batch, and enter Bags dispensed.');
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
        alert('Error issuing milk: ' + error);
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

  // Bulk save all pending dispatches
  document.getElementById('btn-save-all-dispatches')?.addEventListener('click', async () => {
    if (_draftDispatches.length === 0) return;

    const rows = document.querySelectorAll('.grid-row--draft');
    const validRows = [];

    for (const row of rows) {
      const data = _collectDispatchRowData(row);
      if (!data.recipient_name || !data.batch_id || !data.bags_dispensed) {
        alert('Each dispense row must have Recipient Name, Batch, and Quantity.');
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
        alert(`Error dispensing for ${item.recipient_name}: ${error}`);
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
    dispensed_date: row.querySelector('.js-dispense-date')?.value || '',
    recipient_name: row.querySelector('.js-dispense-recipient')?.value || '',
    barangay:       row.querySelector('.js-dispense-brgy')?.value || '',
    batch_id:       row.querySelector('.js-dispense-batch')?.value || '',
    bags_dispensed: row.querySelector('.js-dispense-bags')?.value || '1',
    indication:     row.querySelector('.js-dispense-indication')?.value || ''
  };
}
