/**
 * Audit Logs - View (Render)
 *
 * Pure HTML rendering functions for:
 *   - Search & action category filter bar
 *   - Audit log table with action badges & icons
 *   - Pagination bar
 */

import { AUDIT_ACTIONS } from '../../shared/constants/app.constants.js';

export const ACTION_META = {
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

export const ACTION_GROUPS = {
  'session':   [AUDIT_ACTIONS.LOGIN, AUDIT_ACTIONS.LOGOUT],
  'users':     [AUDIT_ACTIONS.CREATE_USER, AUDIT_ACTIONS.ACTIVATE_USER, AUDIT_ACTIONS.DEACTIVATE_USER],
  'commodity': [AUDIT_ACTIONS.CREATE_COMMODITY, AUDIT_ACTIONS.UPDATE_COMMODITY, AUDIT_ACTIONS.DELETE_COMMODITY],
  'batch':     [AUDIT_ACTIONS.CREATE_BATCH, AUDIT_ACTIONS.UPDATE_BATCH, AUDIT_ACTIONS.DELETE_BATCH],
};

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatTimestamp(iso) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });
  return { date, time };
}

export function renderAuditLogsLayout({ totalLogs, tableHtml }) {
  return `
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-4);">
      <div>
        <h1 class="page-header__title">Audit Logs</h1>
        <p class="page-header__subtitle" id="audit-subtitle">
          ${totalLogs} total activity record${totalLogs !== 1 ? 's' : ''}
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
      ${tableHtml}
    </div>
  `;
}

export function renderAuditTable(pagedLogs, totalFiltered, totalPages, page, pageSize, totalOriginalLogs) {
  if (totalFiltered === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state__icon">
          <span class="icon" style="font-size: 48px; color: var(--color-text-subtle);">history</span>
        </div>
        <h2 class="empty-state__title">No matching activity found</h2>
        <p class="empty-state__description">
          ${totalOriginalLogs === 0
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
          ${pagedLogs.map(renderLogRow).join('')}
        </tbody>
      </table>
    </div>
    ${totalPages > 1 ? renderPagination(totalFiltered, totalPages, page, pageSize) : ''}
  `;
}

export function renderLogRow(log) {
  const meta     = ACTION_META[log.action] || { label: log.action, icon: 'info', cls: 'badge-personnel' };
  const userName = log.profiles?.full_name || 'Unknown';
  const ts       = formatTimestamp(log.created_at);
  const desc     = escapeHtml(log.description || '—');

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
          <span style="font-size: var(--font-size-sm); color: var(--color-text);">${escapeHtml(userName)}</span>
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

export function renderPagination(total, totalPages, page, pageSize) {
  const hasPrev = page > 0;
  const hasNext = page < totalPages - 1;
  const start   = page * pageSize + 1;
  const end     = Math.min((page + 1) * pageSize, total);

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
