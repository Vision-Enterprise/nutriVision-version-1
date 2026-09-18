import { renderReportsLayout, renderArchiveRows } from './reports.render.js';
import {
  fetchCommodityOptions,
  fetchBarangayOptions,
  fetchDistributionLedger,
  fetchFefoRiskBatches,
  fetchAllocationBalances
} from './reports.service.js';
import { exportToCSV } from './reports.export.js';
import { showPrintPreview } from './reports.pdf.js';

const MODULE = '[Reports]';
const ARCHIVE_KEY = 'nv_report_archive';

let _profile = null;
let _el = null; // the page-content element

// ─── Entry point ────────────────────────────────────────────────────────────

export async function renderReportsPage(profile) {
  console.log(`${MODULE} mount start`);
  try {
    _profile = profile;
    _el = document.getElementById('page-content');

    if (!_el) {
      console.error(`${MODULE} #page-content not found in DOM`);
      return;
    }

    _el.innerHTML = renderReportsLayout();
    console.log(`${MODULE} layout rendered`);

    await _loadFilterOptions();
    _refreshArchiveTable();
    _bindEvents();

    console.log(`${MODULE} mount done`);
  } catch (err) {
    console.error(`${MODULE} mount error:`, err);
    if (_el) {
      _el.innerHTML = `<div style="color:red;padding:20px;font-family:monospace;">
        <strong>${MODULE} Error:</strong> ${err.message}<br><br><pre>${err.stack}</pre>
      </div>`;
    }
  }
}

// ─── Event binding ───────────────────────────────────────────────────────────

function _bindEvents() {
  // Radio model selection
  const radios = _el.querySelectorAll('input[name="report_model"]');
  if (!radios.length) {
    console.warn(`${MODULE} No radio buttons found — layout may be malformed`);
  }
  radios.forEach(radio => radio.addEventListener('change', _handleModelChange));

  // Action buttons — guard each one
  const btnCsv   = _el.querySelector('#btn-export-csv');
  const btnPdf   = _el.querySelector('#btn-generate-pdf');
  const btnPrint = _el.querySelector('#btn-print-preview');

  if (!btnCsv || !btnPdf || !btnPrint) {
    console.warn(`${MODULE} One or more action buttons missing from DOM`, { btnCsv, btnPdf, btnPrint });
  }

  if (btnCsv)   btnCsv.addEventListener('click',   () => _handleGenerate('CSV'));
  if (btnPdf)   btnPdf.addEventListener('click',   () => _handleGenerate('PDF'));
  if (btnPrint) btnPrint.addEventListener('click', () => _handleGenerate('PRINT'));
}

// ─── Filter options ──────────────────────────────────────────────────────────

async function _loadFilterOptions() {
  console.log(`${MODULE} loading filter options`);
  try {
    const [commRes, brgyRes] = await Promise.all([
      fetchCommodityOptions(),
      fetchBarangayOptions()
    ]);

    if (commRes.error) console.warn(`${MODULE} commodity options error:`, commRes.error);
    if (brgyRes.error) console.warn(`${MODULE} barangay options error:`, brgyRes.error);

    const commSelect = _el.querySelector('#report-filter-commodity');
    if (commSelect && commRes.data) {
      commRes.data.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        commSelect.appendChild(opt);
      });
      console.log(`${MODULE} ${commRes.data.length} commodities loaded`);
    } else {
      console.warn(`${MODULE} commodity select not found or no data`);
    }

    const brgySelect = _el.querySelector('#report-filter-barangay');
    if (brgySelect && brgyRes.data) {
      brgyRes.data.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        opt.textContent = b;
        brgySelect.appendChild(opt);
      });
      console.log(`${MODULE} ${brgyRes.data.length} barangays loaded`);
    } else {
      console.warn(`${MODULE} barangay select not found or no data`);
    }
  } catch (err) {
    console.error(`${MODULE} _loadFilterOptions error:`, err);
  }
}

// ─── Model switch ────────────────────────────────────────────────────────────

function _handleModelChange(e) {
  const model = e.target.value;
  console.log(`${MODULE} model changed to:`, model);

  // Update active card styling
  _el.querySelectorAll('.report-model-option').forEach(el => {
    el.style.border = '1px solid var(--color-border, #D8E6DA)';
    el.style.background = 'transparent';
  });
  const parent = e.target.closest('.report-model-option');
  if (parent) {
    parent.style.border = '1px solid var(--color-primary, #1B7A3E)';
    parent.style.background = 'var(--color-primary-bg, #E8F5E9)';
  }

  // Show/hide contextual filters
  const grpDates = _el.querySelector('#filter-group-dates');
  const grpDest  = _el.querySelector('#filter-group-destination');

  if (!grpDates || !grpDest) {
    console.warn(`${MODULE} filter groups not found in DOM`);
    return;
  }

  if (model === 'distribution') {
    grpDates.style.display = 'grid';
    grpDest.style.display  = 'block';
  } else {
    // fefo & allocation: no date range, no barangay filter
    grpDates.style.display = 'none';
    grpDest.style.display  = 'none';
  }
}

// ─── Generate ────────────────────────────────────────────────────────────────

async function _handleGenerate(format) {
  console.log(`${MODULE} generate triggered, format:`, format);

  const checkedRadio = _el.querySelector('input[name="report_model"]:checked');
  if (!checkedRadio) {
    console.error(`${MODULE} No report model selected`);
    alert('Please select a report model.');
    return;
  }
  const modelId = checkedRadio.value;

  // Collect filters
  const filters = {};
  if (modelId === 'distribution') {
    filters.dateFrom  = _el.querySelector('#report-date-start')?.value || '';
    filters.dateTo    = _el.querySelector('#report-date-end')?.value   || '';
    filters.barangay  = _el.querySelector('#report-filter-barangay')?.value || 'all';
  }

  const commSelect = _el.querySelector('#report-filter-commodity');
  if (commSelect) {
    filters.commodityId = commSelect.value;
    if (commSelect.selectedIndex > 0) {
      filters.commodityName = commSelect.options[commSelect.selectedIndex].text;
    }
  }

  console.log(`${MODULE} filters:`, filters);

  // Disable buttons while loading
  const btns = ['#btn-generate-pdf', '#btn-export-csv', '#btn-print-preview']
    .map(id => _el.querySelector(id))
    .filter(Boolean);
  btns.forEach(b => (b.disabled = true));

  try {
    let dataRes;
    let reportTitle = '';

    if (modelId === 'distribution') {
      reportTitle = 'Distribution & Dispatch Ledger';
      dataRes = await fetchDistributionLedger(filters);
    } else if (modelId === 'fefo') {
      reportTitle = 'FEFO Wastage & Expiry Risk';
      dataRes = await fetchFefoRiskBatches(filters);
    } else if (modelId === 'allocation') {
      reportTitle = 'Current Allocation Balances';
      dataRes = await fetchAllocationBalances(filters);
    } else {
      console.error(`${MODULE} Unknown modelId:`, modelId);
      alert('Unknown report model. Please select one.');
      return;
    }

    console.log(`${MODULE} data fetched, rows:`, dataRes?.data?.length ?? 'N/A', 'error:', dataRes?.error);

    if (dataRes.error) {
      alert('Error fetching report data: ' + dataRes.error);
      return;
    }

    if (!dataRes.data || dataRes.data.length === 0) {
      alert('No data found for the selected filters.');
      // Don't save to archive if empty
      return;
    }

    if (format === 'CSV') {
      exportToCSV(dataRes.data, modelId, filters);
      _saveToArchive(modelId, reportTitle, filters, 'CSV');
    } else {
      // PDF and PRINT both open the print modal
      showPrintPreview(reportTitle, dataRes.data, modelId, filters, _profile);
      _saveToArchive(modelId, reportTitle, filters, 'PDF');
    }

    _refreshArchiveTable();

  } catch (err) {
    console.error(`${MODULE} _handleGenerate error:`, err);
    alert('Unexpected error while generating report. Check console.');
  } finally {
    btns.forEach(b => (b.disabled = false));
  }
}

// ─── Archive ─────────────────────────────────────────────────────────────────

function _saveToArchive(modelId, title, filters, format) {
  let paramsStr = '';
  try {
    if (modelId === 'distribution') {
      paramsStr = `${filters.dateFrom || 'Any'} to ${filters.dateTo || 'Any'} | ${filters.barangay === 'all' ? 'All Brgy' : (filters.barangay || 'All Brgy')} | ${filters.commodityName || 'All Cmdty'}`;
    } else if (modelId === 'fefo') {
      paramsStr = `${filters.commodityName || 'All Cmdty'} | ≤90 Days`;
    } else {
      paramsStr = `${filters.commodityName || 'All Cmdty'} (Snapshot)`;
    }

    const entry = {
      id: Date.now().toString(),
      name: title,
      modelId,
      filters,
      parameters: paramsStr,
      generatedOn: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      format
    };

    let history = [];
    try {
      history = JSON.parse(localStorage.getItem(ARCHIVE_KEY)) || [];
    } catch (parseErr) {
      console.warn(`${MODULE} corrupted archive in localStorage, resetting`);
      history = [];
    }

    history.unshift(entry);
    if (history.length > 20) history.pop();
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(history));
    console.log(`${MODULE} archive saved, total entries:`, history.length);
  } catch (err) {
    console.error(`${MODULE} _saveToArchive error:`, err);
  }
}

function _refreshArchiveTable() {
  const tbody = _el?.querySelector('#report-archive-tbody');
  if (!tbody) {
    console.warn(`${MODULE} #report-archive-tbody not found`);
    return;
  }

  let history = [];
  try {
    history = JSON.parse(localStorage.getItem(ARCHIVE_KEY)) || [];
  } catch (e) {
    console.warn(`${MODULE} archive parse error, using empty`);
  }

  tbody.innerHTML = renderArchiveRows(history);

  // Re-bind replay buttons
  tbody.querySelectorAll('.btn-replay-report').forEach(btn => {
    btn.addEventListener('click', () => {
      const id   = btn.getAttribute('data-id');
      const item = history.find(h => h.id === id);
      if (item) {
        console.log(`${MODULE} replaying archive entry:`, id);
        _replayReport(item);
      } else {
        console.warn(`${MODULE} replay: entry not found for id`, id);
      }
    });
  });
}

// ─── Replay ──────────────────────────────────────────────────────────────────

async function _replayReport(item) {
  try {
    // Restore model radio
    const radio = _el.querySelector(`input[name="report_model"][value="${item.modelId}"]`);
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change'));
    } else {
      console.warn(`${MODULE} replay: radio for modelId "${item.modelId}" not found`);
    }

    // Restore filters to UI
    if (item.filters) {
      const dateStart = _el.querySelector('#report-date-start');
      const dateEnd   = _el.querySelector('#report-date-end');
      const commSel   = _el.querySelector('#report-filter-commodity');
      const brgySel   = _el.querySelector('#report-filter-barangay');

      if (dateStart && item.filters.dateFrom !== undefined) dateStart.value = item.filters.dateFrom;
      if (dateEnd   && item.filters.dateTo   !== undefined) dateEnd.value   = item.filters.dateTo;
      if (commSel   && item.filters.commodityId)            commSel.value   = item.filters.commodityId;
      if (brgySel   && item.filters.barangay)               brgySel.value   = item.filters.barangay;
    }

    // Trigger generation
    await _handleGenerate(item.format === 'CSV' ? 'CSV' : 'PRINT');
  } catch (err) {
    console.error(`${MODULE} _replayReport error:`, err);
  }
}
