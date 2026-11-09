/**
 * Defects & Returns — Main Page Controller
 * Handles LGU returns, kitchen spoilage, KPIs, search, and slips.
 */

import { fetchDefectIncidents } from './defects.service.js';
import { renderDefectsLayout, renderIncidentRows } from './defects.render.js';
import { openLogIncidentModal, openRestoreModal } from './defects.modal.js';
import { showDefectPrintPreview } from './defects.pdf.js';
import { openModuleGuideDrawer } from '../../shared/components/guide.component.js';
import { supabase } from '../../core/supabase.js';

const MODULE = '[Defects]';
const LEGACY_ARCHIVE_KEY = 'nutrivision_defect_pdf_archive';

let _profile       = null;
let _currentFilter = 'all';
let _searchQuery   = '';
let _incidentsData = [];

export async function renderDefectsPage(profile) {
  _profile = profile;
  _currentFilter = 'all';
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
  // Guide button
  document.getElementById('btn-guide-defects')?.addEventListener('click', () => {
    openModuleGuideDrawer('defects');
  });

  // Log Incident button
  document.getElementById('btn-log-incident')?.addEventListener('click', () => {
    openLogIncidentModal(_profile, _onIncidentSaved);
  });

  // Search input
  const searchInput = document.getElementById('defects-search-input');
  searchInput?.addEventListener('input', (e) => {
    _searchQuery = e.target.value;
    _renderTable();
  });

  // Filter tabs
  document.querySelectorAll('.defect-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      _currentFilter = tab.dataset.filter;
      _updateTabStyles(_currentFilter);
      _renderTable();
    });
  });

  // Table event delegation for View Report / Slip & Restore
  document.getElementById('defect-incidents-tbody')?.addEventListener('click', e => {
    const viewBtn = e.target.closest('.btn-view-incident-pdf');
    if (viewBtn) {
      const id = viewBtn.dataset.id;
      const incident = _incidentsData.find(i => i.id === id);
      if (incident) {
        _handleViewIncidentReport(incident);
      }
      return;
    }

    const restoreBtn = e.target.closest('.btn-restore-incident');
    if (restoreBtn) {
      const id = restoreBtn.dataset.id;
      const incident = _incidentsData.find(i => i.id === id);
      if (incident) {
        openRestoreModal(incident, _profile, async () => {
          await _loadIncidents();
        });
      }
    }
  });
}

// ─── Data Loading & Evidence Backfill ─────────────────────────────────────────

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

  // Always load all records so KPI summaries and instant client-filtering stay synchronized
  const { data, error } = await fetchDefectIncidents('all');
  if (error) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: var(--color-danger); padding: var(--space-6);">Error: ${error}</td></tr>`;
    console.error(`${MODULE} _loadIncidents:`, error);
    return;
  }

  _incidentsData = data || [];

  // Rescue any historical photos stored only in legacy archive / localStorage into defect_incidents.evidence_url
  await _backfillMissingEvidence(_incidentsData);

  // Update executive KPI cards
  _updateKPIs(_incidentsData);

  // Render rows based on current filter & search
  _renderTable();
  console.log(`${MODULE} loaded ${_incidentsData.length} records`);
}

function _updateKPIs(incidents) {
  const total = incidents.length;
  let returnedQty = 0;
  let spoiledQty = 0;
  const batchIds = new Set();

  incidents.forEach(inc => {
    if (inc.batch_id) batchIds.add(inc.batch_id);
    const act = inc.action_taken || '';
    const qty = Number(inc.quantity_affected) || 0;
    if (act === 'Returned') {
      returnedQty += qty;
    } else if (act === 'Spoiled') {
      spoiledQty += qty;
    }
  });

  const elTotal = document.getElementById('kpi-total-incidents');
  const elReturned = document.getElementById('kpi-total-returned');
  const elSpoiled = document.getElementById('kpi-total-spoiled');
  const elBatches = document.getElementById('kpi-batches-affected');

  if (elTotal) elTotal.textContent = total.toLocaleString();
  if (elReturned) elReturned.textContent = returnedQty.toLocaleString();
  if (elSpoiled) elSpoiled.textContent = spoiledQty.toLocaleString();
  if (elBatches) elBatches.textContent = batchIds.size.toLocaleString();
}

function _renderTable() {
  const tbody = document.getElementById('defect-incidents-tbody');
  if (!tbody) return;

  const q = (_searchQuery || '').trim().toLowerCase();

  const filtered = _incidentsData.filter(inc => {
    // 1. Tab filter
    if (_currentFilter !== 'all') {
      if (inc.action_taken !== _currentFilter) return false;
    }

    // 2. Hide fully restored quarantined records
    if (inc.action_taken === 'Quarantined') {
      const remaining = inc.remaining_quarantined !== null ? inc.remaining_quarantined : inc.quantity_affected;
      if (remaining <= 0) return false;
    }

    // 3. Search query
    if (q) {
      const bNum = (inc.batches?.batch_number || '').toLowerCase();
      const cName = (inc.batches?.commodities?.name || '').toLowerCase();
      const classif = (inc.classification || '').toLowerCase();
      const reporter = (inc.reporter_name || '').toLowerCase();
      const remarks = (inc.remarks || '').toLowerCase();
      const matches = bNum.includes(q) || cName.includes(q) || classif.includes(q) || reporter.includes(q) || remarks.includes(q);
      if (!matches) return false;
    }

    return true;
  });

  tbody.innerHTML = renderIncidentRows(filtered);
}

async function _backfillMissingEvidence(incidents) {
  const missing = (incidents || []).filter(i => !i.evidence_url);
  if (missing.length === 0) return;

  const candidatePhotos = [];

  // 1. Check legacy browser localStorage snapshots
  try {
    const userKey = _profile?.id ? `${LEGACY_ARCHIVE_KEY}_${_profile.id}` : LEGACY_ARCHIVE_KEY;
    const rawUser = JSON.parse(localStorage.getItem(userKey) || '[]');
    const rawGlobal = JSON.parse(localStorage.getItem(LEGACY_ARCHIVE_KEY) || '[]');
    for (const item of [...rawUser, ...rawGlobal]) {
      const img = item?.evidenceImg || item?.incidentData?.imageData || item?.incidentData?.evidenceUrl;
      if (img) {
        candidatePhotos.push({
          incidentId: item.incidentId || null,
          batchNumber: item.batchNumber || item?.batch?.batch_number || null,
          img
        });
      }
    }
  } catch {}

  // 2. Check legacy user_defect_archive cloud rows
  try {
    const { data: archRows } = await supabase
      .from('user_defect_archive')
      .select('incident_id, batch_number, evidence_img')
      .not('evidence_img', 'is', null)
      .limit(50);

    if (Array.isArray(archRows)) {
      for (const r of archRows) {
        if (r.evidence_img) {
          candidatePhotos.push({
            incidentId: r.incident_id || null,
            batchNumber: r.batch_number || null,
            img: r.evidence_img
          });
        }
      }
    }
  } catch {}

  if (candidatePhotos.length === 0) return;

  const dbUpdates = [];
  for (const inc of missing) {
    const batchNum = inc.batches?.batch_number || '';
    const batchPrefix = batchNum.split('-')[0];
    const match = candidatePhotos.find(c =>
      (c.incidentId && c.incidentId === inc.id) ||
      (c.batchNumber && batchNum && (
        c.batchNumber === batchNum ||
        (batchPrefix && c.batchNumber.startsWith(batchPrefix))
      ))
    );
    if (match?.img) {
      inc.evidence_url = match.img;
      dbUpdates.push(
        supabase
          .from('defect_incidents')
          .update({ evidence_url: match.img })
          .eq('id', inc.id)
      );
    }
  }

  if (dbUpdates.length > 0) {
    await Promise.allSettled(dbUpdates);
  }
}

// ─── View Official Incident Report / Slip PDF ────────────────────────────────

function _handleViewIncidentReport(incident) {
  const effectiveBatch = incident.batches || {
    batch_number: 'UNKNOWN',
    quantity: incident.quantity_affected || 0,
    commodities: { name: 'Health Commodity', unit: 'Units' }
  };

  const effectiveIncident = {
    classification: incident.classification || 'Quality Issue / Inspection',
    quantityAffected: incident.quantity_affected || 1,
    actionTaken: incident.action_taken || 'Returned',
    action_taken: incident.action_taken || 'Returned',
    scope: incident.scope || 'partial',
    remarks: incident.remarks || '',
    evidenceUrl: incident.evidence_url || null,
    imageData: incident.evidence_url || null,
    reported_at: incident.reported_at
  };

  const reporterProfile = {
    ...(_profile || {}),
    full_name: incident.reporter_name && incident.reporter_name !== 'Unknown'
      ? incident.reporter_name
      : (_profile?.full_name || 'Authorized Staff')
  };

  showDefectPrintPreview(
    effectiveIncident,
    effectiveBatch,
    reporterProfile,
    null,
    incident.reported_at
  );
}

// ─── On Incident Saved ────────────────────────────────────────────────────────

async function _onIncidentSaved(savedIncident) {
  console.log(`${MODULE} incident saved:`, savedIncident?.id);
  await _loadIncidents();
}

// ─── Tab Styling ──────────────────────────────────────────────────────────────

function _updateTabStyles(activeFilter) {
  document.querySelectorAll('.defect-tab').forEach(tab => {
    const isActive = tab.dataset.filter === activeFilter;
    tab.classList.toggle('active', isActive);
    tab.style.background  = isActive ? 'var(--color-primary)' : 'transparent';
    tab.style.color       = isActive ? '#fff' : 'var(--color-text-muted)';
    tab.style.borderColor = isActive ? 'var(--color-primary)' : 'var(--color-border)';
  });
}
