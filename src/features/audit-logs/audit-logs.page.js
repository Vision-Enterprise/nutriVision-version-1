/**
 * Audit Logs Page
 *
 * Displays chronological system activity history.
 * Administrator only.
 */

import { supabase }    from '../../core/supabase.js';
import { AUDIT_ACTIONS, PAGINATION } from '../../shared/constants/app.constants.js';

// ── State ─────────────────────────────────────────────────────────────────
let _logs          = [];
let _actionFilter  = '';
let _searchQuery   = '';
let _page          = 0;
const PAGE_SIZE    = PAGINATION.AUDIT_LOG_PAGE_SIZE;

// ── Action metadata: label, icon, badge colour ────────────────────────────
const ACTION_META = {
  [AUDIT_ACTIONS.LOGIN]:             { label: 'Login',             icon: 'login',           cls: 'badge-active'     },
  [AUDIT_ACTIONS.LOGOUT]:            { label: 'Logout',            icon: 'logout',          cls: 'badge-personnel'  },
  [AUDIT_ACTIONS.CREATE_USER]:       { label: 'Create User',       icon: 'person_add',      cls: 'badge-admin'      },
  [AUDIT_ACTIONS.ACTIVATE_USER]:     { label: 'Activate User',     icon: 'check_circle',    cls: 'badge-active'     },
  [AUDIT_ACTIONS.DEACTIVATE_USER]:   { label: 'Deactivate User',   icon: 'block',           cls: 'badge-inactive'   },
  [AUDIT_ACTIONS.CREATE_COMMODITY]:  { label: 'Add Commodity',     icon: 'inventory_2',     cls: 'badge-admin'      },
  [AUDIT_ACTIONS.UPDATE_COMMODITY]:  { label: 'Edit Commodity',    icon: 'edit',            cls: 'badge-personnel'  },
  [AUDIT_ACTIONS.DELETE_COMMODITY]:  { label: 'Delete Commodity',  icon: 'delete',          cls: 'badge-inactive'   },
  [AUDIT_ACTIONS.CREATE_BATCH]:      { label: 'Add Batch',         icon: 'package_2',       cls: 'badge-admin'      },
  [AUDIT_ACTIONS.UPDATE_BATCH]:      { label: 'Edit Batch',        icon: 'edit',            cls: 'badge-personnel'  },
  [AUDIT_ACTIONS.DELETE_BATCH]:      { label: 'Delete Batch',      icon: 'delete',          cls: 'badge-inactive'   },
};

const ACTION_GROUPS = {
  'session':   [AUDIT_ACTIONS.LOGIN, AUDIT_ACTIONS.LOGOUT],
  'users':     [AUDIT_ACTIONS.CREATE_USER, AUDIT_ACTIONS.ACTIVATE_USER, AUDIT_ACTIONS.DEACTIVATE_USER],
  'commodity': [AUDIT_ACTIONS.CREATE_COMMODITY, AUDIT_ACTIONS.UPDATE_COMMODITY, AUDIT_ACTIONS.DELETE_COMMODITY],
  'batch':     [AUDIT_ACTIONS.CREATE_BATCH, AUDIT_ACTIONS.UPDATE_BATCH, AUDIT_ACTIONS.DELETE_BATCH],
};

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
  container.innerHTML = `
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-4);">
      <div>
        <h1 class="page-header__title">Audit Logs</h1>
        <p class="page-header__subtitle" id="audit-subtitle">
          ${_logs.length} total activity record${_logs.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="card" style="padding: var(--space-4); margin-bottom: var(--space-6);">
      <div style="display: flex; gap: var(--space-3); flex-wrap: wrap; align-items: center;">
        
        <div style="flex: 1; min-width: 200px;">
          <input
            type="text"
            id="audit-search"
            class="form-input"
            placeholder="Search by user or description..."
            aria-label="Search audit logs"
          />
        </div>

        <div style="min-width: 180px;">
          <select id="audit-action-filter" class="form-input" aria-label="Filter by category">
            <option value="">All Actions</option>
            <option value="session">Session (Login / Logout)</option>
            <option value="users">User Management</option>
            <option value="commodity">Commodities</option>
            <option value="batch">Batches</option>
          </select>
        </div>

      </div>
    </div>

    <!-- Log Table Container -->
    <div id="audit-table-container">
      ${_buildTableHtml()}
    </div>
  `;

  _attachListeners();
}

// ── Table Builder ─────────────────────────────────────────────────────────

function _buildTableHtml() {
  const filtered = _getFiltered();
  const pageStart = _page * PAGE_SIZE;
  const paged = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  if (filtered.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state__icon">
          <span class="icon" style="font-size: 48px; color: var(--color-text-subtle);">history</span>
        </div>
        <h2 class="empty-state__title">No matching activity found</h2>
        <p class="empty-state__description">
          ${_logs.length === 0
            ? 'System activity will appear here as users interact with the system.'
            : 'Try adjusting your search or filter criteria.'}
        </p>
      </div>
    `;
  }

  return `
    <div class="table-wrapper">
      <table class="table" aria-label="Audit log activity">
        <thead>
          <tr>
            <th scope="col">Timestamp</th>
            <th scope="col">User</th>
            <th scope="col">Action</th>
            <th scope="col">Description</th>
          </tr>
        </thead>
        <tbody>
          ${paged.map(_buildLogRow).join('')}
        </tbody>
      </table>
    </div>
    ${totalPages > 1 ? _buildPagination(filtered.length, totalPages) : ''}
  `;
}

function _buildLogRow(log) {
  const meta     = ACTION_META[log.action] || { label: log.action, icon: 'info', cls: 'badge-personnel' };
  const userName = log.profiles?.full_name || 'Unknown';
  const ts       = _formatTimestamp(log.created_at);
  const desc     = _escapeHtml(log.description || '—');

  return `
    <tr>
      <td style="color: var(--color-text-muted); font-size: var(--font-size-sm); white-space: nowrap;">
        <div>${ts.date}</div>
        <div style="font-size: var(--font-size-xs); color: var(--color-text-subtle);">${ts.time}</div>
      </td>
      <td>
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <div style="
            width: 28px; height: 28px;
            border-radius: var(--radius-full);
            background: var(--color-surface-alt);
            color: var(--color-text-muted);
            display: flex; align-items: center; justify-content: center;
            font-size: var(--font-size-xs); font-weight: 600;
            flex-shrink: 0;
          ">${userName.charAt(0).toUpperCase()}</div>
          <span style="font-size: var(--font-size-sm); color: var(--color-text);">${_escapeHtml(userName)}</span>
        </div>
      </td>
      <td>
        <span class="badge ${meta.cls}" style="gap: 4px;">
          <span class="icon icon--sm" style="font-size: 13px;">${meta.icon}</span>
          ${meta.label}
        </span>
      </td>
      <td style="font-size: var(--font-size-sm); color: var(--color-text-muted); max-width: 360px;">
        ${desc}
      </td>
    </tr>
  `;
}

function _buildPagination(total, totalPages) {
  const hasPrev = _page > 0;
  const hasNext = _page < totalPages - 1;
  const start   = _page * PAGE_SIZE + 1;
  const end     = Math.min((_page + 1) * PAGE_SIZE, total);

  return `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: var(--space-4); flex-wrap: wrap; gap: var(--space-3);">
      <span style="font-size: var(--font-size-sm); color: var(--color-text-muted);">
        Showing ${start}–${end} of ${total} records
      </span>
      <div style="display: flex; gap: var(--space-2);">
        <button id="audit-prev-btn" class="btn btn-ghost btn-sm" ${hasPrev ? '' : 'disabled'} type="button">
          <span class="icon icon--sm">arrow_back</span> Prev
        </button>
        <button id="audit-next-btn" class="btn btn-ghost btn-sm" ${hasNext ? '' : 'disabled'} type="button">
          Next <span class="icon icon--sm">arrow_forward</span>
        </button>
      </div>
    </div>
  `;
}

// ── Filtering ─────────────────────────────────────────────────────────────

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
  if (container) container.innerHTML = _buildTableHtml();
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
    if (_page > 0) { _page--; _refresh(); }
  });
  document.getElementById('audit-next-btn')?.addEventListener('click', () => {
    const totalPages = Math.ceil(_getFiltered().length / PAGE_SIZE);
    if (_page < totalPages - 1) { _page++; _refresh(); }
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────

function _formatTimestamp(iso) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });
  return { date, time };
}

function _escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
