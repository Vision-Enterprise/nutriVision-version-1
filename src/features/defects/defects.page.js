/**
 * Defects & Returns — Main Page Controller
 * 3-category log sheet: Quarantined, Returned, Disposed.
 */

import { fetchDefectIncidents } from './defects.service.js';
import { renderDefectsLayout, renderIncidentRows } from './defects.render.js';
import { openLogIncidentModal, openResolveQuarantineModal } from './defects.modal.js';

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

  // Table event delegation: Resolve Quarantine
  document.getElementById('defect-incidents-tbody')?.addEventListener('click', e => {
    const resolveBtn = e.target.closest('.btn-resolve-quarantine');
    if (resolveBtn) {
      const id = resolveBtn.dataset.id;
      const incident = _allIncidents.find(i => i.id === id);
      if (incident) {
        openResolveQuarantineModal(incident, _profile, async () => {
          await _loadIncidents();
        });
      }
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

