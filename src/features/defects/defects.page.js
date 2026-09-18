/**
 * Defects & Quarantine Log — Main Page Controller
 */

import { fetchDefectIncidents } from './defects.service.js';
import { renderDefectsLayout, renderIncidentRows, renderPdfArchiveRows, renderPdfArchiveEmptyState } from './defects.render.js';
import { openLogIncidentModal } from './defects.modal.js';
import { getDefectPdfFileName } from './defects.pdf.js';

const MODULE     = '[Defects]';
const ARCHIVE_KEY = 'nutrivision_defect_pdf_archive';

let _profile     = null;
let _currentFilter = 'all';

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
}

// ─── Data Loading ─────────────────────────────────────────────────────────────

async function _loadIncidents() {
  const tbody = document.getElementById('defect-incidents-tbody');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="7" style="text-align:center; color: var(--color-text-muted); padding: var(--space-8);">
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

  tbody.innerHTML = renderIncidentRows(data);
  console.log(`${MODULE} loaded ${data.length} incidents [filter: ${_currentFilter}]`);
}

// ─── PDF Archive (localStorage) ───────────────────────────────────────────────

function _refreshPdfArchive() {
  const tbody = document.getElementById('defect-pdf-archive-tbody');
  if (!tbody) return;

  const archive = _getArchive();
  tbody.innerHTML = renderPdfArchiveRows(archive);
}

function _saveToArchive(incident, batch, incidentData) {
  const archive = _getArchive();
  const entry = {
    id:          `${Date.now()}`,
    generatedOn: new Date().toISOString(),
    fileName:    getDefectPdfFileName(batch?.batch_number, incidentData?.actionTaken),
    batchNumber: batch?.batch_number || '—',
    actionTaken: incidentData?.actionTaken || '—',
  };
  archive.unshift(entry);
  // Keep only last 20
  const trimmed = archive.slice(0, 20);
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(trimmed));
}

function _getArchive() {
  try {
    return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]');
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
