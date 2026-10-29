import { renderReportsLayout, renderArchiveRows } from './reports.render.js';
import {
  fetchCommodityOptions,
  fetchBarangayOptions,
  fetchBatchInventoryReport,
  fetchDistributionLedger,
  fetchAllocationBalances,
  fetchDefectWastageReport
} from './reports.service.js';
import { exportToCSV, buildReportFileName } from './reports.export.js';
import { showPrintPreview } from './reports.pdf.js';
import { SystemDialog } from '../../shared/components/dialog.component.js';
import { getLocalDateString } from '../../shared/utils/date.utils.js';
import { supabase } from '../../core/supabase.js';

const MODULE = '[Reports]';
const ARCHIVE_KEY = 'nv_report_archive';

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
    _refreshArchiveTable();
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

async function _handleGenerate(format, isReplay = false, overrideModelId = null, overrideFilters = null, replayGeneratedOn = null) {
  const checkedRadio = _el.querySelector('input[name="report_model"]:checked');
  const rawModelId = overrideModelId || checkedRadio?.value;
  if (!rawModelId) {
    await SystemDialog.alert('Please select a report type.', 'Select Report');
    return;
  }

  // Map legacy 'fefo' archive entries to 'batches'
  const modelId = rawModelId === 'fefo' ? 'batches' : rawModelId;

  const filters = overrideFilters ? { ...overrideFilters } : {};
  if (!overrideFilters) {
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
  } else if (rawModelId === 'fefo' && !filters.expiryStatus) {
    filters.expiryStatus = 'fefo_risk';
    filters.expiryStatusLabel = 'Near Expiry & Expired Only (FEFO Priority)';
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
      if (!isReplay) {
        _saveToArchive(modelId, reportTitle, filters, 'CSV');
        _refreshArchiveTable();
      }
    } else {
      showPrintPreview(
        reportTitle,
        dataRes.data,
        modelId,
        filters,
        _profile,
        () => {
          if (!isReplay) {
            _saveToArchive(modelId, reportTitle, filters, 'PDF');
            _refreshArchiveTable();
          }
        },
        replayGeneratedOn
      );
    }
  } catch (err) {
    console.error(`${MODULE} _handleGenerate error:`, err);
    await SystemDialog.alert('Unexpected error while generating report.', 'Report Generation Error');
  } finally {
    btns.forEach(b => (b.disabled = false));
  }
}

// ─── Archive ────────────────────────────────────────────────────────────────

async function _saveToArchive(modelId, title, filters, format) {
  let paramsStr = '';
  try {
    const commStr = filters.commodityName || 'All Commodities';
    if (modelId === 'batches') {
      paramsStr = `${commStr} | ${filters.expiryStatusLabel || 'All Active Batches'}`;
    } else if (modelId === 'distribution') {
      paramsStr = `${filters.dateFrom || 'Start'} to ${filters.dateTo || 'Present'} | ${filters.barangay === 'all' ? 'All Barangays' : (filters.barangay || 'All Barangays')} | ${commStr}`;
    } else if (modelId === 'defects') {
      paramsStr = `${filters.dateFrom || 'Start'} to ${filters.dateTo || 'Present'} | ${filters.defectAction === 'all' ? 'All Dispositions' : (filters.defectAction || 'All')} | ${commStr}`;
    } else {
      paramsStr = `${commStr} (Stock Snapshot)`;
    }

    const fileName = buildReportFileName(modelId, filters, format);
    const entry = {
      id: Date.now().toString(),
      name: title,
      fileName,
      modelId,
      filters,
      parameters: paramsStr,
      generatedOn: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      format
    };

    // Save to user-specific localStorage key
    const userArchiveKey = _profile?.id ? `${ARCHIVE_KEY}_${_profile.id}` : ARCHIVE_KEY;
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem(userArchiveKey)) || JSON.parse(localStorage.getItem(ARCHIVE_KEY)) || [];
    } catch {
      history = [];
    }
    history.unshift(entry);
    if (history.length > 20) history.pop();
    localStorage.setItem(userArchiveKey, JSON.stringify(history));

    // Also persist into Supabase user_report_archive table if table exists
    if (_profile?.id) {
      try {
        await supabase.from('user_report_archive').insert({
          user_id: _profile.id,
          report_name: title,
          file_name: fileName,
          model_id: modelId,
          parameters: paramsStr,
          filters: filters,
          format: format
        });
      } catch (dbErr) {
        console.warn(`${MODULE} remote archive insert skipped:`, dbErr);
      }
    }
  } catch (err) {
    console.error(`${MODULE} _saveToArchive error:`, err);
  }
}

async function _refreshArchiveTable() {
  const tbody = _el?.querySelector('#report-archive-tbody');
  if (!tbody) return;

  const userArchiveKey = _profile?.id ? `${ARCHIVE_KEY}_${_profile.id}` : ARCHIVE_KEY;
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem(userArchiveKey)) || JSON.parse(localStorage.getItem(ARCHIVE_KEY)) || [];
  } catch {}

  // Fetch from Supabase user_report_archive if user logged in
  if (_profile?.id) {
    try {
      const { data, error } = await supabase
        .from('user_report_archive')
        .select('*')
        .eq('user_id', _profile.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && Array.isArray(data) && data.length > 0) {
        history = data.map(d => ({
          id: d.id,
          name: d.report_name,
          fileName: d.file_name,
          modelId: d.model_id,
          filters: d.filters,
          parameters: d.parameters,
          generatedOn: new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          format: d.format
        }));
        localStorage.setItem(userArchiveKey, JSON.stringify(history));
      }
    } catch (e) {
      console.warn(`${MODULE} remote archive fetch skipped:`, e);
    }
  }

  tbody.innerHTML = renderArchiveRows(history);

  const clearBtn = _el?.querySelector('#btn-clear-archive');
  if (clearBtn) {
    clearBtn.style.display = history.length > 0 ? 'inline-flex' : 'none';
    clearBtn.onclick = async () => {
      const confirmed = await SystemDialog.confirm(
        `Clear all ${history.length} archived reports from history?`,
        'Clear Report Archive',
        'Clear All',
        true
      );
      if (!confirmed) return;
      if (_profile?.id) { try { await supabase.from('user_report_archive').delete().eq('user_id', _profile.id); } catch (_) {} } localStorage.removeItem(userArchiveKey); localStorage.removeItem(ARCHIVE_KEY);
      _refreshArchiveTable();
    };
  }

  tbody.querySelectorAll('.btn-replay-report').forEach(btn => {
    btn.addEventListener('click', () => {
      const id   = btn.getAttribute('data-id');
      const item = history.find(h => h.id === id);
      if (item) _replayReport(item);
    });
  });

  tbody.querySelectorAll('.btn-delete-report').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const item = history.find(h => h.id === id);
      const name = item?.fileName || buildReportFileName(item?.modelId, item?.filters, item?.format, item?.generatedOn) || item?.name || 'this report';
      const confirmed = await SystemDialog.confirm(
        `Remove "${name}" from report archive history?`,
        'Remove Archived Report',
        'Remove',
        true
      );
      if (!confirmed) return;

      const updated = history.filter(h => h.id !== id);
      if (_profile?.id) { try { await supabase.from('user_report_archive').delete().eq('id', id); } catch (_) {} }
      localStorage.setItem(userArchiveKey, JSON.stringify(updated));
      _refreshArchiveTable();
    });
  });
}

// ─── Replay ─────────────────────────────────────────────────────────────────

async function _replayReport(item) {
  try {
    const targetModel = item.modelId === 'fefo' ? 'batches' : item.modelId;
    const radio = _el.querySelector(`input[name="report_model"][value="${targetModel}"]`);
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change'));
    }

    if (item.filters) {
      const dateStart = _el.querySelector('#report-date-start');
      const dateEnd   = _el.querySelector('#report-date-end');
      const commSel   = _el.querySelector('#report-filter-commodity');
      const brgySel   = _el.querySelector('#report-filter-barangay');
      const expSel    = _el.querySelector('#report-filter-expiry-status');
      const defSel    = _el.querySelector('#report-filter-defect-action');

      if (dateStart && item.filters.dateFrom !== undefined) dateStart.value = item.filters.dateFrom;
      if (dateEnd   && item.filters.dateTo   !== undefined) dateEnd.value   = item.filters.dateTo;
      if (commSel   && item.filters.commodityId)            commSel.value   = item.filters.commodityId;
      if (brgySel   && item.filters.barangay)               brgySel.value   = item.filters.barangay;
      if (expSel    && item.filters.expiryStatus)           expSel.value    = item.filters.expiryStatus;
      if (defSel    && item.filters.defectAction)           defSel.value    = item.filters.defectAction;
    }

    await _handleGenerate(item.format === 'CSV' ? 'CSV' : 'PRINT', true, item.modelId, item.filters, item.generatedOn);
  } catch (err) {
    console.error(`${MODULE} _replayReport error:`, err);
  }
}
