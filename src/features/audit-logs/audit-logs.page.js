/**
 * Audit Logs Page (Controller)
 *
 * Displays chronological system activity history with live search & action filter.
 * Administrator only.
 *
 * MVC Controller: delegates table and pagination HTML to .render.js.
 */

import { supabase } from '../../core/supabase.js';
import { PAGINATION } from '../../shared/constants/app.constants.js';
import {
  renderAuditLogsLayout,
  renderAuditTable,
  ACTION_GROUPS,
  ACTION_META,
} from './audit-logs.render.js';

// ── State ─────────────────────────────────────────────────────────────────
let _logs         = [];
let _actionFilter = '';
let _searchQuery  = '';
let _page         = 0;
const PAGE_SIZE   = PAGINATION.AUDIT_LOG_PAGE_SIZE;

// ── Entry Point ───────────────────────────────────────────────────────────
export async function renderAuditLogsPage(profile) {
  _page = 0;
  _actionFilter = '';
  _searchQuery = '';

  const content = document.getElementById('page-content');
  if (!content) return;

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-header__title">Audit Logs</h1>
        <p class="page-header__subtitle">Complete chronological history of all system activity</p>
      </div>
    </div>
    <div class="loading-overlay"><div class="spinner spinner-lg"></div></div>
  `;

  const { logs, error } = await _fetchLogs();

  if (error) {
    content.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Audit Logs</h1>
          <p class="page-header__subtitle">Complete chronological history of all system activity</p>
        </div>
      </div>
      <div class="alert alert-error" style="margin-top: var(--space-4);">
        <span class="icon">error</span>
        <span>${error}</span>
      </div>
    `;
    return;
  }

  _logs = logs;
  _renderView(content);
}

// ── Data Fetch ────────────────────────────────────────────────────────────
async function _fetchLogs() {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        entity_type,
        description,
        created_at,
        profiles ( full_name )
      `)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;
    return { logs: data || [], error: null };
  } catch (err) {
    console.error('[AuditLogsPage] fetch error:', err);
    return { logs: [], error: 'Failed to load audit logs.' };
  }
}

// ── View Render ───────────────────────────────────────────────────────────
function _renderView(container) {
  const filtered = _getFiltered();
  const pageStart = _page * PAGE_SIZE;
  const paged = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const tableHtml = renderAuditTable(paged, filtered.length, totalPages, _page, PAGE_SIZE, _logs.length);

  container.innerHTML = renderAuditLogsLayout({
    totalLogs: _logs.length,
    tableHtml
  });

  _attachListeners();
}

function _getFiltered() {
  const groupActions = _actionFilter ? ACTION_GROUPS[_actionFilter] : null;
  const q = _searchQuery.toLowerCase();

  return _logs.filter(log => {
    if (groupActions && !groupActions.includes(log.action)) return false;
    if (q) {
      const userName = log.profiles?.full_name?.toLowerCase() || '';
      const desc     = log.description?.toLowerCase() || '';
      const action   = (ACTION_META[log.action]?.label || log.action).toLowerCase();
      if (!userName.includes(q) && !desc.includes(q) && !action.includes(q)) return false;
    }
    return true;
  });
}

function _refresh() {
  const container = document.getElementById('audit-table-container');
  if (!container) return;

  const filtered = _getFiltered();
  const pageStart = _page * PAGE_SIZE;
  const paged = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  container.innerHTML = renderAuditTable(paged, filtered.length, totalPages, _page, PAGE_SIZE, _logs.length);
  _attachPaginationListeners();
}

// ── Events ────────────────────────────────────────────────────────────────
function _attachListeners() {
  document.getElementById('audit-search')?.addEventListener('input', e => {
    _searchQuery = e.target.value;
    _page = 0;
    _refresh();
  });

  document.getElementById('audit-action-filter')?.addEventListener('change', e => {
    _actionFilter = e.target.value;
    _page = 0;
    _refresh();
  });

  _attachPaginationListeners();
}

function _attachPaginationListeners() {
  document.getElementById('audit-prev-btn')?.addEventListener('click', () => {
    if (_page > 0) {
      _page--;
      _refresh();
    }
  });
  document.getElementById('audit-next-btn')?.addEventListener('click', () => {
    const totalPages = Math.ceil(_getFiltered().length / PAGE_SIZE);
    if (_page < totalPages - 1) {
      _page++;
      _refresh();
    }
  });
}
