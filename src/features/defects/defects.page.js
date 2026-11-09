/**
 * Defects & Returns — Main Page Controller
 * 3-category log sheet: Quarantined, Returned, Disposed.
 */

import { fetchDefectIncidents } from './defects.service.js';
import { renderDefectsLayout, renderIncidentRows } from './defects.render.js';
import { openLogIncidentModal, openResolveQuarantineModal } from './defects.modal.js';
import { printReportHtml } from '../../shared/utils/print.utils.js';

const MODULE = '[Defects]';

let _profile        = null;
let _currentFilter  = 'Quarantined';
let _searchQuery    = '';
let _allIncidents   = [];

export async function renderDefectsPage(profile) {
  _profile = profile;
  _currentFilter = 'Quarantined';
  _searchQuery = '';

  const content = document.getElementById('page-content');
  if (!content) return;

  content.innerHTML = renderDefectsLayout();
  console.log(`${MODULE} mount done`);

  _bindEvents();
  await _loadIncidents();
}

// ─── Event Binding ────────────────────────────────────────────────────────────

function _bindEvents() {
  // Generate Category Report button
  document.getElementById('btn-generate-report')?.addEventListener('click', () => {
    _handleGenerateCategoryReport();
  });

  // Log Event button
  document.getElementById('btn-log-incident')?.addEventListener('click', () => {
    openLogIncidentModal(_profile, _onIncidentSaved);
  });

  // Search input
  const searchInput = document.getElementById('defects-search-input');
  searchInput?.addEventListener('input', (e) => {
    _searchQuery = e.target.value;
    _renderTable();
  });

  // Filter tabs: Quarantined, Returned, Disposed
  document.querySelectorAll('.defect-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      _currentFilter = tab.dataset.filter;
      _updateTabStyles(_currentFilter);
      _renderTable();
    });
  });

  // Table event delegation
  document.getElementById('defect-incidents-tbody')?.addEventListener('click', e => {
    // Resolve Quarantine
    const resolveBtn = e.target.closest('.btn-resolve-quarantine');
    if (resolveBtn) {
      const id = resolveBtn.dataset.id;
      const incident = _allIncidents.find(i => i.id === id);
      if (incident) {
        openResolveQuarantineModal(incident, _profile, async () => {
          await _loadIncidents();
        });
      }
      return;
    }
  });
}

// ─── Data Loading ─────────────────────────────────────────────────────────────

async function _loadIncidents() {
  const tbody = document.getElementById('defect-incidents-tbody');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="8" style="text-align:center; color: var(--color-text-muted); padding: var(--space-8);">
        <span class="icon" style="font-size:28px; display:block; opacity:0.4; animation: spin 1s linear infinite;">progress_activity</span>
      </td>
    </tr>
  `;

  const { allData, error } = await fetchDefectIncidents('all');
  if (error) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: var(--color-danger); padding: var(--space-6);">Error: ${error}</td></tr>`;
    console.error(`${MODULE} _loadIncidents:`, error);
    return;
  }

  _allIncidents = allData || [];

  _updateKPIs(_allIncidents);
  _renderTable();
  console.log(`${MODULE} loaded ${_allIncidents.length} total records`);
}

function _updateKPIs(incidents) {
  let quarantinedActive = 0;
  let returnedTotal     = 0;
  let disposedTotal     = 0;

  incidents.forEach(inc => {
    const act = inc.resolved_action;
    const qty = Number(inc.quantity_affected) || 0;

    if (act === 'Quarantined') {
      const rem = inc.remaining_quarantined !== null ? Number(inc.remaining_quarantined) : qty;
      if (rem > 0) quarantinedActive += rem;
    } else if (act === 'Returned') {
      returnedTotal += qty;
    } else if (act === 'Disposed') {
      disposedTotal += qty;
    }
  });

  const elQuar = document.getElementById('kpi-quarantined');
  const elRet  = document.getElementById('kpi-returned');
  const elDisp = document.getElementById('kpi-disposed');

  if (elQuar) elQuar.textContent = quarantinedActive.toLocaleString();
  if (elRet)  elRet.textContent  = returnedTotal.toLocaleString();
  if (elDisp) elDisp.textContent = disposedTotal.toLocaleString();
}

function _renderTable() {
  const tbody = document.getElementById('defect-incidents-tbody');
  if (!tbody) return;

  const filtered = _getFilteredIncidents();
  tbody.innerHTML = renderIncidentRows(filtered, _currentFilter);
}

function _getFilteredIncidents() {
  const q = (_searchQuery || '').trim().toLowerCase();

  return _allIncidents.filter(inc => {
    if (_currentFilter === 'Quarantined') {
      if (inc.resolved_action !== 'Quarantined') return false;
      const rem = inc.remaining_quarantined !== null ? inc.remaining_quarantined : inc.quantity_affected;
      if (rem <= 0) return false;
    } else if (_currentFilter === 'Returned') {
      if (inc.resolved_action !== 'Returned') return false;
    } else if (_currentFilter === 'Disposed') {
      if (inc.resolved_action !== 'Disposed') return false;
    }

    if (q) {
      const bNum    = (inc.batches?.batch_number || '').toLowerCase();
      const cName   = (inc.batches?.commodities?.name || '').toLowerCase();
      const classif = (inc.classification || '').toLowerCase();
      const reporter= (inc.reporter_name || '').toLowerCase();
      const remarks = (inc.display_remarks || '').toLowerCase();
      const matches = bNum.includes(q) || cName.includes(q) || classif.includes(q) || reporter.includes(q) || remarks.includes(q);
      if (!matches) return false;
    }

    return true;
  });
}

// ─── Generate Category Report (A4 Printable Summary) ──────────────────────────

function _handleGenerateCategoryReport() {
  const incidents = _getFilteredIncidents();
  const dateStr   = new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
  const titleMap  = {
    Quarantined: 'OFFICIAL QUARANTINE INVENTORY LOG',
    Returned:    'OFFICIAL COMMODITY RETURN REPORT',
    Disposed:    'OFFICIAL INVENTORY CONDEMNATION & DISPOSAL RECORD'
  };
  const docTitle  = titleMap[_currentFilter] || 'INVENTORY DISPOSITION REPORT';
  const reporter  = _profile?.full_name || 'Nutrition Staff';

  const rowsHtml = incidents.length ? incidents.map((inc, i) => {
    const d = new Date(inc.reported_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    const bNum = inc.batches?.batch_number || '—';
    const cName = inc.batches?.commodities?.name || '—';
    const unit = inc.batches?.commodities?.unit || '';
    const qty = _currentFilter === 'Quarantined'
      ? (inc.remaining_quarantined !== null ? inc.remaining_quarantined : inc.quantity_affected)
      : inc.quantity_affected;

    return `
      <tr>
        <td style="padding:6px 8px; border:1px solid #ccc; text-align:center;">${i + 1}</td>
        <td style="padding:6px 8px; border:1px solid #ccc; white-space:nowrap;">${d}</td>
        <td style="padding:6px 8px; border:1px solid #ccc; font-family:monospace; font-weight:bold;">${bNum}</td>
        <td style="padding:6px 8px; border:1px solid #ccc;">${cName}</td>
        <td style="padding:6px 8px; border:1px solid #ccc; font-weight:bold; text-align:right;">${qty} ${unit}</td>
        <td style="padding:6px 8px; border:1px solid #ccc;">${inc.classification || 'Inspection'}</td>
        <td style="padding:6px 8px; border:1px solid #ccc; font-size:10px;">${inc.display_remarks || '—'}</td>
        <td style="padding:6px 8px; border:1px solid #ccc;">${inc.reporter_name || 'Staff'}</td>
      </tr>
    `;
  }).join('') : `
    <tr>
      <td colspan="8" style="text-align:center; padding:24px; color:#666;">No records found for ${_currentFilter}.</td>
    </tr>
  `;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${docTitle} - ${dateStr}</title>
  <style>
    @page { size: A4 landscape; margin: 15mm 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 10.5px; color: #111; padding: 24px 30px; }
    .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 8px; margin-bottom: 12px; }
    .header p { font-size: 10px; color: #444; margin: 1px 0; }
    .header h1 { font-size: 14px; font-weight: bold; text-transform: uppercase; margin-top: 3px; }
    .title { font-size: 13px; font-weight: bold; text-align: center; margin: 8px 0 2px; text-transform: uppercase; }
    .meta { display: flex; justify-content: space-between; font-size: 10px; color: #555; margin-bottom: 12px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th { background: #f2f2f2; padding: 7px 8px; font-size: 10px; font-weight: bold; border: 1px solid #999; text-transform: uppercase; text-align: left; }
    .signatures { display: flex; justify-content: space-between; margin-top: 36px; page-break-inside: avoid; }
    .sig-block { width: 240px; text-align: center; }
    .sig-role { text-align: left; font-size: 10px; color: #333; margin-bottom: 28px; }
    .sig-line { border-top: 1px solid #222; padding-top: 4px; font-size: 10px; text-transform: uppercase; font-weight: bold; }
    .sig-title { font-size: 9px; color: #555; font-weight: normal; text-transform: none; }
  </style>
</head>
<body>
  <div class="header">
    <p>Republic of the Philippines &bull; Province of Bukidnon</p>
    <p>Municipality of Manolo Fortich</p>
    <h1>Municipal Nutrition Action Office</h1>
  </div>
  <div class="title">${docTitle}</div>
  <div class="meta">
    <span><strong>CATEGORY:</strong> ${_currentFilter.toUpperCase()}</span>
    <span><strong>DATE:</strong> ${dateStr}</span>
    <span><strong>TOTAL RECORDS:</strong> ${incidents.length}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:30px; text-align:center;">#</th>
        <th style="width:80px;">Date</th>
        <th style="width:130px;">Batch ID</th>
        <th>Commodity</th>
        <th style="width:90px; text-align:right;">Quantity</th>
        <th style="width:140px;">Reason / Classif.</th>
        <th>Remarks</th>
        <th style="width:110px;">Handled By</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="signatures">
    <div class="sig-block">
      <div class="sig-role">Prepared by:</div>
      <div class="sig-line">
        ${reporter.toUpperCase()}<br>
        <span class="sig-title">Nutrition Personnel / Custodian</span>
      </div>
    </div>
    <div class="sig-block">
      <div class="sig-role">Approved &amp; Verified by:</div>
      <div class="sig-line">
        MNAO ACTION OFFICER<br>
        <span class="sig-title">Municipal Nutrition Action Office</span>
      </div>
    </div>
  </div>
</body>
</html>`;

  printReportHtml(`${docTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}`, html);
}

async function _onIncidentSaved() {
  await _loadIncidents();
}

function _updateTabStyles(activeFilter) {
  document.querySelectorAll('.defect-tab').forEach(tab => {
    const isActive = tab.dataset.filter === activeFilter;
    tab.classList.toggle('active', isActive);
    tab.style.background  = isActive ? 'var(--color-primary)' : 'transparent';
    tab.style.color       = isActive ? '#fff' : 'var(--color-text-muted)';
    tab.style.borderColor = isActive ? 'var(--color-primary)' : 'var(--color-border)';
  });
}
