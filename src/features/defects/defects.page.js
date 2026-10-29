/**
 * Defects & Quarantine Log — Main Page Controller
 */

import { fetchDefectIncidents } from './defects.service.js';
import { renderDefectsLayout, renderIncidentRows, renderPdfArchiveRows, renderPdfArchiveEmptyState } from './defects.render.js';
import { openLogIncidentModal, openRestoreModal } from './defects.modal.js';
import { getDefectPdfFileName, showDefectPrintPreview } from './defects.pdf.js';
import { supabase } from '../../core/supabase.js';
import { SystemDialog } from '../../shared/components/dialog.component.js';

const MODULE     = '[Defects]';
const ARCHIVE_KEY = 'nutrivision_defect_pdf_archive';

let _profile     = null;
let _currentFilter = 'all';
let _incidentsData = [];

export async function renderDefectsPage(profile) {
  _profile = profile;

  const content = document.getElementById('page-content');
  if (!content) return;

  content.innerHTML = renderDefectsLayout();
  console.log(`${MODULE} mount done`);

  _bindEvents();
  await _loadIncidents();
  _refreshPdfArchive();
}

// ─── Event Binding ────────────────────────────────────────────────────────────

function _bindEvents() {
  // Log Incident button
  document.getElementById('btn-log-incident')?.addEventListener('click', () => {
    openLogIncidentModal(_profile, _onIncidentSaved);
  });

  // Filter tabs
  document.querySelectorAll('.defect-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      _currentFilter = tab.dataset.filter;
      _updateTabStyles(_currentFilter);
      await _loadIncidents();
    });
  });

  // Table event delegation for Restore
  document.getElementById('defect-incidents-tbody')?.addEventListener('click', e => {
    const btn = e.target.closest('.btn-restore-incident');
    if (btn) {
      const id = btn.dataset.id;
      const incident = _incidentsData.find(i => i.id === id);
      if (incident) {
        openRestoreModal(incident, _profile, async () => {
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
      <td colspan="9" style="text-align:center; color: var(--color-text-muted); padding: var(--space-8);">
        <span class="icon" style="font-size:28px; display:block; opacity:0.4; animation: spin 1s linear infinite;">progress_activity</span>
      </td>
    </tr>
  `;

  const { data, error } = await fetchDefectIncidents(_currentFilter);
  if (error) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--color-danger); padding: var(--space-6);">Error: ${error}</td></tr>`;
    console.error(`${MODULE} _loadIncidents:`, error);
    return;
  }

  _incidentsData = data || [];

  // Filter out fully restored quarantined incidents
  const visibleData = _incidentsData.filter(inc => {
    if (inc.action_taken !== 'Quarantined') return true;
    const remaining = inc.remaining_quarantined !== null ? inc.remaining_quarantined : inc.quantity_affected;
    return remaining > 0;
  });

  tbody.innerHTML = renderIncidentRows(visibleData);
  console.log(`${MODULE} loaded ${data.length} incidents, showing ${visibleData.length} [filter: ${_currentFilter}]`);
}

// ─── PDF Archive (localStorage) ───────────────────────────────────────────────

function _refreshPdfArchive() {
  const tbody = document.getElementById('defect-pdf-archive-tbody');
  if (!tbody) return;

  let archive = _getArchive();
  let archiveUpdated = false;
  for (const item of archive) {
    const matchedInc = _incidentsData.find(i =>
      i.id === item.incidentId ||
      (item.batch?.id && i.batches?.id === item.batch.id) ||
      (item.batchNumber && i.batches?.batch_number && i.batches.batch_number.startsWith(item.batchNumber.split('-')[0]))
    );
    if (matchedInc?.batches?.batch_number && item.batchNumber !== matchedInc.batches.batch_number) {
      const oldBatchNum = item.batchNumber;
      item.batchNumber = matchedInc.batches.batch_number;
      if (item.batch) item.batch.batch_number = matchedInc.batches.batch_number;
      if (item.fileName && oldBatchNum) {
        item.fileName = item.fileName.replace(oldBatchNum, matchedInc.batches.batch_number);
      }
      archiveUpdated = true;
    }
  }
  if (archiveUpdated) {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
  }
  tbody.innerHTML = renderPdfArchiveRows(archive);

  // Clear All button state & click handler
  const clearBtn = document.getElementById('btn-clear-defect-archive');
  if (clearBtn) {
    clearBtn.style.display = archive.length > 0 ? 'inline-flex' : 'none';
    clearBtn.onclick = async () => {
      const confirmed = await SystemDialog.confirm(
        `Clear all ${archive.length} generated PDF reports from history?`,
        'Clear Defect Archive',
        'Clear All',
        true
      );
      if (!confirmed) return;
      const userArchiveKey = _profile?.id ? `${ARCHIVE_KEY}_${_profile.id}` : ARCHIVE_KEY;
      localStorage.removeItem(userArchiveKey);
      localStorage.removeItem(ARCHIVE_KEY);
      _refreshPdfArchive();
    };
  }

  // Attach click listeners to view / print buttons
  tbody.querySelectorAll('.btn-replay-defect-pdf').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const item = archive.find(a => a.id === id);
      if (item) {
        _handleReplayDefectPdf(item);
      }
    });
  });

  // Attach click listeners to delete individual report buttons
  tbody.querySelectorAll('.btn-delete-defect-pdf').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const item = archive.find(a => a.id === id);
      const name = item?.fileName || 'this report';
      const confirmed = await SystemDialog.confirm(
        `Remove "${name}" from PDF archive history?`,
        'Remove Defect PDF',
        'Remove',
        true
      );
      if (!confirmed) return;

      const userArchiveKey = _profile?.id ? `${ARCHIVE_KEY}_${_profile.id}` : ARCHIVE_KEY;
      const raw = JSON.parse(localStorage.getItem(userArchiveKey) || localStorage.getItem(ARCHIVE_KEY) || '[]');
      const updated = raw.filter(a => a.id !== id);
      localStorage.setItem(userArchiveKey, JSON.stringify(updated));
      _refreshPdfArchive();
    });
  });
}

async function _handleReplayDefectPdf(item) {
  // 1. Check if complete snapshot exists
  if (item.incidentData && item.batch) {
    showDefectPrintPreview(item.incidentData, item.batch, _profile, null, item.generatedOn);
    return;
  }

  // 2. Find from loaded memory
  let incident = _incidentsData.find(i => 
    i.id === item.incidentId ||
    i.batches?.batch_number === item.batchNumber
  );

  let batch = incident?.batches;

  // 3. Fallback: fetch batch info if missing
  if (!batch && item.batchNumber && item.batchNumber !== '—') {
    try {
      const { data: bData } = await supabase
        .from('batches')
        .select('id, batch_number, quantity, commodities(id, name, unit)')
        .eq('batch_number', item.batchNumber)
        .maybeSingle();
      if (bData) batch = bData;
    } catch (err) {
      console.warn('[DefectsPage] Could not fetch batch for PDF replay:', err);
    }
  }

  const isDispose = (item.actionTaken || item.fileName || '').toLowerCase().includes('dispos');
  const actionLabel = isDispose ? 'Disposed' : 'Quarantined';
  const effectiveBatch = batch || {
    batch_number: item.batchNumber || 'UNKNOWN',
    quantity: incident?.quantity_affected || 0,
    commodities: { name: 'Health Commodity', unit: 'Units' }
  };
  const effectiveIncident = {
    classification: incident?.classification || 'Quality Issue / Inspection',
    quantityAffected: incident?.quantity_affected || 1,
    actionTaken: incident?.action_taken || actionLabel,
    remarks: incident?.remarks || '',
    evidenceUrl: incident?.evidence_url || null,
    imageData: null
  };

  showDefectPrintPreview(effectiveIncident, effectiveBatch, _profile, null, item.generatedOn || incident?.reported_at);
}

async function _saveToArchive(incident, batch, incidentData) {
  const isDispose = (incidentData?.actionTaken || incident?.action_taken || '').toLowerCase().includes('dispos');
  const actionTaken = isDispose ? 'Disposed' : 'Quarantined';
  const fileName = getDefectPdfFileName(batch?.batch_number, actionTaken);

  const evidenceImg = incidentData?.imageData || incident?.evidence_url || null;

  const entry = {
    id:          `${Date.now()}`,
    incidentId:  incident?.id,
    generatedOn: new Date().toISOString(),
    fileName,
    batchNumber: batch?.batch_number || '—',
    actionTaken,
    evidenceImg
  };

  // 1. Save reference + compressed image to Supabase (max 20 enforced by DB trigger)
  if (_profile?.id) {
    try {
      await supabase.from('user_defect_archive').insert({
        user_id:      _profile.id,
        incident_id:  incident?.id || null,
        file_name:    fileName,
        batch_number: batch?.batch_number || '—',
        action_taken: actionTaken
      });
    } catch (dbErr) {
      console.warn(`${MODULE} Supabase defect archive write error:`, dbErr);
    }
  }

  // 2. Local mirror fallback (max 20, no heavy images)
  let archive = _getArchive();
  archive.unshift(entry);
  const trimmed = archive.slice(0, 20);
  const userArchiveKey = _profile?.id ? `${ARCHIVE_KEY}_${_profile.id}` : ARCHIVE_KEY;
  localStorage.setItem(userArchiveKey, JSON.stringify(trimmed));
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(trimmed));
}

function _getArchive() {
  try {
    const userArchiveKey = _profile?.id ? `${ARCHIVE_KEY}_${_profile.id}` : ARCHIVE_KEY;
    const raw = JSON.parse(localStorage.getItem(userArchiveKey) || localStorage.getItem(ARCHIVE_KEY) || '[]');
    return raw.map(item => {
      const isDispose = (item.actionTaken || item.fileName || '').toLowerCase().includes('dispos');
      if (isDispose) {
        if (!item.actionTaken || item.actionTaken === 'Dispose') item.actionTaken = 'Disposed';
        if (item.fileName && item.fileName.startsWith('Quarantine_Notice')) {
          item.fileName = item.fileName.replace('Quarantine_Notice', 'Disposal_Record');
        }
      }
      return item;
    });
  } catch {
    return [];
  }
}

// ─── On Incident Saved ────────────────────────────────────────────────────────

async function _onIncidentSaved(savedIncident, batch, incidentData) {
  console.log(`${MODULE} incident saved:`, savedIncident?.id);
  _saveToArchive(savedIncident, batch, incidentData);
  await _loadIncidents();
  _refreshPdfArchive();
}

// ─── Tab Styling ──────────────────────────────────────────────────────────────

function _updateTabStyles(activeFilter) {
  document.querySelectorAll('.defect-tab').forEach(tab => {
    const isActive = tab.dataset.filter === activeFilter;
    tab.style.background  = isActive ? 'var(--color-primary)' : 'transparent';
    tab.style.color       = isActive ? '#fff' : 'var(--color-text-muted)';
    tab.style.borderColor = isActive ? 'var(--color-primary)' : 'var(--color-border)';
  });
}
