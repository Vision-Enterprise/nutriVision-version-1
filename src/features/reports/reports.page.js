import { renderReportsLayout } from './reports.render.js';
import {
  fetchCommodityOptions,
  fetchBarangayOptions,
  fetchBatchInventoryReport,
  fetchDistributionLedger,
  fetchAllocationBalances,
  fetchDefectWastageReport
} from './reports.service.js';
import { exportToCSV } from './reports.export.js';
import { showPrintPreview } from './reports.pdf.js';
import { SystemDialog } from '../../shared/components/dialog.component.js';
import { getLocalDateString } from '../../shared/utils/date.utils.js';

const MODULE = '[Reports]';

let _profile = null;
let _el = null;

// ─── Entry point ────────────────────────────────────────────────────────────

export async function renderReportsPage(profile) {
  try {
    _profile = profile;
    _el = document.getElementById('page-content');
    if (!_el) return;

    _el.innerHTML = renderReportsLayout();

    await _loadFilterOptions();
    _bindEvents();
  } catch (err) {
    console.error(`${MODULE} mount error:`, err);
    if (_el) {
      _el.innerHTML = `<div style="color:red;padding:20px;font-family:monospace;">
        <strong>${MODULE} Error:</strong> ${err.message}<br><br><pre>${err.stack}</pre>
      </div>`;
    }
  }
}

// ─── Event binding ──────────────────────────────────────────────────────────

function _bindEvents() {
  const radios = _el.querySelectorAll('input[name="report_model"]');
  radios.forEach(radio => radio.addEventListener('change', _handleModelChange));

  // Quick date preset buttons
  _el.querySelectorAll('.js-date-preset').forEach(btn => {
    btn.addEventListener('click', () => _applyDatePreset(btn.dataset.preset));
  });

  const btnCsv   = _el.querySelector('#btn-export-csv');
  const btnPdf   = _el.querySelector('#btn-generate-pdf');
  const btnPrint = _el.querySelector('#btn-print-preview');

  if (btnCsv)   btnCsv.addEventListener('click',   () => _handleGenerate('CSV'));
  if (btnPdf)   btnPdf.addEventListener('click',   () => _handleGenerate('PDF'));
  if (btnPrint) btnPrint.addEventListener('click', () => _handleGenerate('PRINT'));
}

function _applyDatePreset(preset) {
  const startEl = _el.querySelector('#report-date-start');
  const endEl   = _el.querySelector('#report-date-end');
  if (!startEl || !endEl) return;

  const now = new Date();
  const todayStr = getLocalDateString(now);

  if (preset === 'all') {
    startEl.value = '';
    endEl.value   = '';
  } else if (preset === 'month') {
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startEl.value = getLocalDateString(firstOfMonth);
    endEl.value   = todayStr;
  } else if (preset === '30d') {
    const thirtyAgo = new Date(now);
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    startEl.value = getLocalDateString(thirtyAgo);
    endEl.value   = todayStr;
  } else if (preset === 'year') {
    const firstOfYear = new Date(now.getFullYear(), 0, 1);
    startEl.value = getLocalDateString(firstOfYear);
    endEl.value   = todayStr;
  }
}

// ─── Filter options ─────────────────────────────────────────────────────────

async function _loadFilterOptions() {
  try {
    const [commRes, brgyRes] = await Promise.all([
      fetchCommodityOptions(),
      fetchBarangayOptions()
    ]);

    const commSelect = _el.querySelector('#report-filter-commodity');
    if (commSelect && commRes.data) {
      commRes.data.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        commSelect.appendChild(opt);
      });
    }

    const brgySelect = _el.querySelector('#report-filter-barangay');
    if (brgySelect && brgyRes.data) {
      brgyRes.data.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        opt.textContent = b;
        brgySelect.appendChild(opt);
      });
    }
  } catch (err) {
    console.error(`${MODULE} _loadFilterOptions error:`, err);
  }
}

// ─── Model switch ───────────────────────────────────────────────────────────

function _handleModelChange(e) {
  const model = e.target.value;

  _el.querySelectorAll('.report-model-option').forEach(el => {
    el.style.border = '1px solid var(--color-border)';
    el.style.boxShadow = 'none';
    el.style.background = 'transparent';
  });
  const parent = e.target.closest('.report-model-option');
  if (parent) {
    parent.style.border = '1px solid var(--color-primary)';
    parent.style.boxShadow = 'inset 3px 0 0 var(--color-primary)';
    parent.style.background = '#f4fbf5';
  }

  const grpExpiry = _el.querySelector('#filter-group-expiry-status');
  const grpDates  = _el.querySelector('#filter-group-dates');
  const grpDest   = _el.querySelector('#filter-group-destination');
  const grpDefect = _el.querySelector('#filter-group-defect-action');

  if (grpExpiry) grpExpiry.style.display = (model === 'batches' || model === 'fefo') ? 'block' : 'none';
  if (grpDates)  grpDates.style.display  = (model === 'distribution' || model === 'defects') ? 'flex' : 'none';
  if (grpDest)   grpDest.style.display   = model === 'distribution' ? 'block' : 'none';
  if (grpDefect) grpDefect.style.display = model === 'defects' ? 'block' : 'none';
}

// ─── Generate ───────────────────────────────────────────────────────────────

async function _handleGenerate(format) {
  const checkedRadio = _el.querySelector('input[name="report_model"]:checked');
  const rawModelId = checkedRadio?.value;
  if (!rawModelId) {
    await SystemDialog.alert('Please select a report type.', 'Select Report');
    return;
  }

  const modelId = rawModelId === 'fefo' ? 'batches' : rawModelId;
  const filters = {};

  if (modelId === 'batches') {
    const expSel = _el.querySelector('#report-filter-expiry-status');
    filters.expiryStatus = expSel?.value || 'all';
    filters.expiryStatusLabel = expSel?.options[expSel.selectedIndex]?.text || 'All Active Batches';
  } else if (modelId === 'distribution') {
    filters.dateFrom = _el.querySelector('#report-date-start')?.value || '';
    filters.dateTo   = _el.querySelector('#report-date-end')?.value   || '';
    filters.barangay = _el.querySelector('#report-filter-barangay')?.value || 'all';
  } else if (modelId === 'defects') {
    filters.dateFrom     = _el.querySelector('#report-date-start')?.value || '';
    filters.dateTo       = _el.querySelector('#report-date-end')?.value   || '';
    filters.defectAction = _el.querySelector('#report-filter-defect-action')?.value || 'all';
  }

  const commSelect = _el.querySelector('#report-filter-commodity');
  if (commSelect) {
    filters.commodityId = commSelect.value;
    if (commSelect.selectedIndex > 0) {
      filters.commodityName = commSelect.options[commSelect.selectedIndex].text;
    }
  }

  const btns = ['#btn-generate-pdf', '#btn-export-csv', '#btn-print-preview']
    .map(id => _el.querySelector(id))
    .filter(Boolean);
  btns.forEach(b => (b.disabled = true));

  try {
    let dataRes;
    let reportTitle = '';

    if (modelId === 'batches') {
      reportTitle = filters.expiryStatus === 'fefo_risk'
        ? 'FEFO Near-Expiry & Expired Batch Report'
        : 'Batch Inventory & Expiry Status Report';
      dataRes = await fetchBatchInventoryReport(filters);
    } else if (modelId === 'distribution') {
      reportTitle = 'Barangay Distribution & Dispatch Report';
      dataRes = await fetchDistributionLedger(filters);
    } else if (modelId === 'allocation') {
      reportTitle = 'Commodity Stock Summary Report';
      dataRes = await fetchAllocationBalances(filters);
    } else if (modelId === 'defects') {
      reportTitle = 'Defect, Quarantine & Wastage Report';
      dataRes = await fetchDefectWastageReport(filters);
    } else {
      await SystemDialog.alert('Unknown report model. Please select one.', 'Invalid Report');
      return;
    }

    if (dataRes.error) {
      await SystemDialog.alert('Error fetching report data: ' + dataRes.error, 'Query Error');
      return;
    }

    if (!dataRes.data || dataRes.data.length === 0) {
      await SystemDialog.alert('No records match the selected report filters.', 'No Records Found');
      return;
    }

    if (format === 'CSV') {
      exportToCSV(dataRes.data, modelId, filters);
    } else {
      showPrintPreview(
        reportTitle,
        dataRes.data,
        modelId,
        filters,
        _profile,
        null,
        null
      );
    }
  } catch (err) {
    console.error(`${MODULE} _handleGenerate error:`, err);
    await SystemDialog.alert('Unexpected error while generating report.', 'Report Generation Error');
  } finally {
    btns.forEach(b => (b.disabled = false));
  }
}
