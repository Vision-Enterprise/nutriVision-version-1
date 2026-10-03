/**
 * User Management - Modals (Interactions)
 *
 * Dedicated modal interactions for:
 *   - Create New User Account
 *   - Activate / Deactivate User Status Confirmation
 */

import { createUser, toggleUserStatus, fetchUserLogs } from './users.service.js';
import { validateUserForm } from './users.validation.js';
import { escapeHtml } from './users.render.js';
import { ROLES, AUDIT_ACTIONS } from '../../shared/constants/app.constants.js';
import { SystemDialog } from '../../shared/components/dialog.component.js';

let _activeUserModalEscHandler = null;

export function closeUserModal() {
  const overlay = document.getElementById('user-modal-overlay') || 
                  document.getElementById('confirm-modal-overlay') ||
                  document.getElementById('user-logs-modal-overlay');
  if (!overlay) return;
  if (_activeUserModalEscHandler) {
    document.removeEventListener('keydown', _activeUserModalEscHandler);
    _activeUserModalEscHandler = null;
  }
  overlay.remove();
}

/**
 * Open Create User Account Modal
 */
export function openAddUserModal({ profile, onSuccess }) {
  closeUserModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'user-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Create New User Account');

  overlay.innerHTML = `
    <div class="modal" style="max-width: 480px; width: 100%;">
      <div class="modal-header">
        <h2 class="modal-title">Create User Account</h2>
        <button id="modal-close-btn" class="modal-close" type="button" aria-label="Close dialog">
          <span class="icon">close</span>
        </button>
      </div>

      <form id="create-user-form" novalidate>
        <div class="modal-body" style="display: flex; flex-direction: column; gap: var(--space-4);">
          
          <div id="modal-form-alert" class="alert alert-error" style="display: none;" role="alert">
            <span class="icon">error</span>
            <span id="modal-form-alert-msg"></span>
          </div>

          <!-- Full Name -->
          <div class="form-group">
            <label for="field-full-name" class="form-label form-label--required">Full Name</label>
            <input
              type="text"
              id="field-full-name"
              name="full_name"
              class="form-input"
              placeholder="e.g. Maria Santos"
              autocomplete="name"
              required
            />
            <span class="form-error" id="error-full_name" role="alert"></span>
          </div>

          <!-- Office Email / Username -->
          <div class="form-group">
            <label for="field-email" class="form-label form-label--required">Office Email / Account ID</label>
            <input
              type="email"
              id="field-email"
              name="email"
              class="form-input"
              placeholder="e.g. staff.maria@nutrivision.mnao"
              autocomplete="off"
              required
            />
            <span class="form-hint">Used by staff to sign in. Format: name@domain</span>
            <span class="form-error" id="error-email" role="alert"></span>
          </div>

          <!-- Initial Password -->
          <div class="form-group">
            <label for="field-password" class="form-label form-label--required">Initial Password</label>
            <div style="position: relative;">
              <input
                type="password"
                id="field-password"
                name="password"
                class="form-input"
                placeholder="At least 6 characters"
                autocomplete="new-password"
                required
                style="padding-right: 42px;"
              />
              <button
                type="button"
                id="toggle-pwd-btn"
                class="btn btn-ghost"
                style="position: absolute; right: 4px; top: 50%; transform: translateY(-50%); padding: 6px; color: var(--color-text-muted);"
                aria-label="Show password"
              >
                <span class="icon icon--sm" id="toggle-pwd-icon">visibility</span>
              </button>
            </div>
            <span class="form-hint">Staff can change this after logging in.</span>
            <span class="form-error" id="error-password" role="alert"></span>
          </div>

          <!-- Role -->
          <div class="form-group">
            <label for="field-role" class="form-label form-label--required">System Role</label>
            <select id="field-role" name="role" class="form-input" required>
              <option value="${ROLES.NUTRITION_PERSONNEL}" selected>Nutrition Personnel (Standard Access)</option>
              <option value="${ROLES.ADMINISTRATOR}">Administrator (Full System Access)</option>
            </select>
            <span class="form-error" id="error-role" role="alert"></span>
          </div>

        </div>

        <div class="modal-footer">
          <button id="modal-cancel-btn" class="btn btn-ghost" type="button">Cancel</button>
          <button id="modal-submit-btn" class="btn btn-primary" type="submit">
            <span id="modal-submit-text">Create Account</span>
            <span id="modal-submit-spinner" class="spinner" style="display: none;" aria-hidden="true"></span>
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('field-full-name')?.focus(), 50);

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeUserModal();
  });

  document.getElementById('modal-close-btn')?.addEventListener('click', closeUserModal);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', closeUserModal);

  const pwdInput = document.getElementById('field-password');
  const toggleBtn = document.getElementById('toggle-pwd-btn');
  const toggleIcon = document.getElementById('toggle-pwd-icon');

  toggleBtn?.addEventListener('click', () => {
    const isPass = pwdInput.type === 'password';
    pwdInput.type = isPass ? 'text' : 'password';
    toggleIcon.textContent = isPass ? 'visibility_off' : 'visibility';
    toggleBtn.setAttribute('aria-label', isPass ? 'Hide password' : 'Show password');
  });

  _activeUserModalEscHandler = e => { if (e.key === 'Escape') closeUserModal(); };
  document.addEventListener('keydown', _activeUserModalEscHandler);

  document.getElementById('create-user-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const formData = {
      full_name: form.full_name.value.trim(),
      email:     form.email.value.trim(),
      password:  form.password.value,
      role:      form.role.value,
    };

    ['full_name', 'email', 'password', 'role'].forEach(field => {
      const errEl = document.getElementById(`error-${field}`);
      const inputEl = document.getElementById(`field-${field}`);
      if (errEl) errEl.textContent = '';
      if (inputEl) inputEl.classList.remove('form-input--error');
    });

    const alertEl = document.getElementById('modal-form-alert');
    if (alertEl) alertEl.style.display = 'none';

    const { isValid, errors } = validateUserForm(formData);
    if (!isValid) {
      Object.entries(errors).forEach(([field, msg]) => {
        const errEl = document.getElementById(`error-${field}`);
        const inputEl = document.getElementById(`field-${field}`);
        if (errEl) errEl.textContent = msg;
        if (inputEl) inputEl.classList.add('form-input--error');
      });
      return;
    }

    setUserModalLoading(true);
    const { user, error } = await createUser(formData, profile);
    setUserModalLoading(false);

    if (error) {
      const msgEl = document.getElementById('modal-form-alert-msg');
      if (alertEl && msgEl) {
        msgEl.textContent = error;
        alertEl.style.display = 'flex';
      }
      return;
    }

    closeUserModal();
    if (typeof onSuccess === 'function') onSuccess(user);
  });
}

function setUserModalLoading(isLoading) {
  const btn     = document.getElementById('modal-submit-btn');
  const text    = document.getElementById('modal-submit-text');
  const spinner = document.getElementById('modal-submit-spinner');
  const cancel  = document.getElementById('modal-cancel-btn');
  const close   = document.getElementById('modal-close-btn');

  if (!btn) return;
  btn.disabled     = isLoading;
  if (cancel) cancel.disabled = isLoading;
  if (close)  close.disabled  = isLoading;
  if (text)    text.textContent      = isLoading ? 'Creating...' : 'Create Account';
  if (spinner) spinner.style.display = isLoading ? 'inline-block' : 'none';
}

/**
 * Open Activate/Deactivate Confirmation Dialog
 */
export function openConfirmToggleStatusModal({ user, profile, onSuccess }) {
  closeUserModal();

  const isDeactivating = user.is_active;
  const actionText = isDeactivating ? 'Deactivate' : 'Activate';
  const actionColor = isDeactivating ? 'btn-danger' : 'btn-primary';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'confirm-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', `${actionText} User Account`);

  overlay.innerHTML = `
    <div class="modal" style="max-width: 440px; width: 100%;">
      <div class="modal-header">
        <h2 class="modal-title">${actionText} Account</h2>
        <button id="confirm-close-btn" class="modal-close" type="button" aria-label="Close dialog">
          <span class="icon">close</span>
        </button>
      </div>

      <div class="modal-body">
        <p style="color: var(--color-text); margin-bottom: var(--space-3);">
          Are you sure you want to <strong>${actionText.toLowerCase()}</strong> the account for <strong>${escapeHtml(user.full_name)}</strong>?
        </p>
        <p style="color: var(--color-text-muted); font-size: var(--font-size-sm); margin: 0;">
          ${isDeactivating
            ? 'The user will immediately lose access and will not be able to sign in. All historical audit logs and data records remain preserved.'
            : 'The user will immediately regain access to sign in to NutriVision.'}
        </p>
      </div>

      <div class="modal-footer">
        <button id="confirm-cancel-btn" class="btn btn-ghost" type="button">Cancel</button>
        <button id="confirm-action-btn" class="btn ${actionColor}" type="button">
          <span id="confirm-btn-text">${actionText} Account</span>
          <span id="confirm-btn-spinner" class="spinner" style="display: none;" aria-hidden="true"></span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeUserModal();
  });

  document.getElementById('confirm-close-btn')?.addEventListener('click', closeUserModal);
  document.getElementById('confirm-cancel-btn')?.addEventListener('click', closeUserModal);

  _activeUserModalEscHandler = e => { if (e.key === 'Escape') closeUserModal(); };
  document.addEventListener('keydown', _activeUserModalEscHandler);

  document.getElementById('confirm-action-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('confirm-action-btn');
    const text = document.getElementById('confirm-btn-text');
    const spinner = document.getElementById('confirm-btn-spinner');

    if (btn) btn.disabled = true;
    if (text) text.textContent = 'Updating...';
    if (spinner) spinner.style.display = 'inline-block';

    const { error } = await toggleUserStatus(user, profile);
    closeUserModal();

    if (error) {
      SystemDialog.alert(error);
      return;
    }

    if (typeof onSuccess === 'function') onSuccess();
  });
}

// ── User Activity Logs Modal ──────────────────────────────────────────────

const USER_LOG_META = {
  [AUDIT_ACTIONS.LOGIN]:           { label: 'Login',           icon: 'login',        cls: 'badge-active'    },
  [AUDIT_ACTIONS.LOGOUT]:          { label: 'Logout',          icon: 'logout',       cls: 'badge-personnel' },
  [AUDIT_ACTIONS.CREATE_USER]:     { label: 'Create User',     icon: 'person_add',   cls: 'badge-admin'     },
  [AUDIT_ACTIONS.ACTIVATE_USER]:   { label: 'Activate User',   icon: 'check_circle', cls: 'badge-active'    },
  [AUDIT_ACTIONS.DEACTIVATE_USER]: { label: 'Deactivate User', icon: 'block',        cls: 'badge-inactive'  },
};

const USER_LOG_GROUPS = {
  'session': [AUDIT_ACTIONS.LOGIN, AUDIT_ACTIONS.LOGOUT],
  'create':  [AUDIT_ACTIONS.CREATE_USER],
  'status':  [AUDIT_ACTIONS.ACTIVATE_USER, AUDIT_ACTIONS.DEACTIVATE_USER],
};

function formatLogTimestamp(iso) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });
  return { date, time };
}

/**
 * Open User Activity Logs Modal
 */
export async function openUserLogsModal() {
  closeUserModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'user-logs-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'User Activity Logs');

  overlay.innerHTML = `
    <div class="modal" style="max-width: 860px; width: 95%; max-height: 88vh; display: flex; flex-direction: column; overflow: hidden;">
      <div class="modal-header" style="flex-shrink: 0;">
        <div>
          <h2 class="modal-title">User Activity Logs</h2>
          <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 2px 0 0 0;">
            Chronological history of staff logins, logouts, account provisioning, and access updates
          </p>
        </div>
        <button id="user-logs-close-btn" class="modal-close" type="button" aria-label="Close dialog">
          <span class="icon">close</span>
        </button>
      </div>

      <div class="modal-body" style="padding: var(--space-4) var(--space-5); overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: var(--space-4);">
        <!-- Toolbar & Filter -->
        <div style="display: flex; gap: var(--space-3); flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 200px;">
            <input
              type="text"
              id="user-logs-search"
              class="form-input"
              placeholder="Search by user or description..."
              aria-label="Search user logs"
            />
          </div>
          <div style="min-width: 180px;">
            <select id="user-logs-filter" class="form-input" aria-label="Filter activity type">
              <option value="">All User Activities</option>
              <option value="session">Sessions (Login / Logout)</option>
              <option value="create">Account Provisioning</option>
              <option value="status">Status Changes (Activate/Deactivate)</option>
            </select>
          </div>
        </div>

        <!-- Table Container -->
        <div id="user-logs-table-mount" style="flex: 1;">
          <div style="text-align: center; padding: var(--space-8);">
            <div class="spinner spinner-lg"></div>
            <p style="color: var(--color-text-muted); margin-top: var(--space-3); font-size: var(--font-size-sm);">Loading user logs...</p>
          </div>
        </div>
      </div>

      <div class="modal-footer" style="flex-shrink: 0; justify-content: flex-end;">
        <button id="user-logs-done-btn" class="btn btn-secondary" type="button">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Close handlers
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeUserModal();
  });
  document.getElementById('user-logs-close-btn')?.addEventListener('click', closeUserModal);
  document.getElementById('user-logs-done-btn')?.addEventListener('click', closeUserModal);

  _activeUserModalEscHandler = e => { if (e.key === 'Escape') closeUserModal(); };
  document.addEventListener('keydown', _activeUserModalEscHandler);

  // Fetch logs
  const { logs, error } = await fetchUserLogs();
  const mount = document.getElementById('user-logs-table-mount');
  if (!mount) return;

  if (error) {
    mount.innerHTML = `
      <div class="alert alert-error">
        <span class="icon">error</span>
        <span>${error}</span>
      </div>
    `;
    return;
  }

  // Local pagination & filter state for the modal
  let currentLogs = logs || [];
  let searchQuery = '';
  let categoryFilter = '';
  let currentPage = 0;
  const PAGE_SIZE = 10;

  function getFilteredLogs() {
    const groupActions = categoryFilter ? USER_LOG_GROUPS[categoryFilter] : null;
    const q = searchQuery.toLowerCase().trim();

    return currentLogs.filter(log => {
      if (groupActions && !groupActions.includes(log.action)) return false;
      if (q) {
        const userName = log.profiles?.full_name?.toLowerCase() || '';
        const desc = log.description?.toLowerCase() || '';
        const actionLabel = (USER_LOG_META[log.action]?.label || log.action).toLowerCase();
        if (!userName.includes(q) && !desc.includes(q) && !actionLabel.includes(q)) return false;
      }
      return true;
    });
  }

  function renderTable() {
    const filtered = getFilteredLogs();
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    if (currentPage >= totalPages && totalPages > 0) currentPage = totalPages - 1;

    const pageStart = currentPage * PAGE_SIZE;
    const paged = filtered.slice(pageStart, pageStart + PAGE_SIZE);

    if (filtered.length === 0) {
      mount.innerHTML = `
        <div class="empty-state" style="padding: var(--space-6);">
          <div class="empty-state__icon">
            <span class="icon" style="font-size: 40px; color: var(--color-text-subtle);">history</span>
          </div>
          <h3 class="empty-state__title" style="font-size: var(--font-size-base);">No matching activity found</h3>
          <p class="empty-state__description" style="font-size: var(--font-size-xs);">
            ${currentLogs.length === 0 ? 'No user activity logs recorded yet.' : 'Try adjusting your search or category filter.'}
          </p>
        </div>
      `;
      return;
    }

    mount.innerHTML = `
      <div class="table-wrapper" style="border: 1px solid var(--color-border-subtle); border-radius: var(--radius-md);">
        <table class="table" style="font-size: var(--font-size-sm); margin: 0;" aria-label="User activity records">
          <thead>
            <tr>
              <th scope="col" style="width: 140px;">Timestamp</th>
              <th scope="col" style="width: 180px;">User</th>
              <th scope="col" style="width: 140px;">Action</th>
              <th scope="col">Description</th>
            </tr>
          </thead>
          <tbody>
            ${paged.map(log => {
              const meta = USER_LOG_META[log.action] || { label: log.action, icon: 'info', cls: 'badge-personnel' };
              const userName = log.profiles?.full_name || 'System / Admin';
              const ts = formatLogTimestamp(log.created_at);
              const initial = userName.charAt(0).toUpperCase();

              return `
                <tr>
                  <td style="color: var(--color-text-muted); font-size: var(--font-size-xs); white-space: nowrap;">
                    <div>${ts.date}</div>
                    <div style="color: var(--color-text-subtle);">${ts.time}</div>
                  </td>
                  <td>
                    <div style="display: flex; align-items: center; gap: var(--space-2);">
                      <div style="
                        width: 26px; height: 26px;
                        border-radius: var(--radius-full);
                        background: var(--color-surface-alt);
                        color: var(--color-text);
                        display: flex; align-items: center; justify-content: center;
                        font-size: 11px; font-weight: 600;
                        flex-shrink: 0;
                      ">${initial}</div>
                      <span style="font-weight: 500; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px;">
                        ${escapeHtml(userName)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span class="badge ${meta.cls}" style="gap: 3px; font-size: 11px; padding: 2px 7px;">
                      <span class="icon icon--sm" style="font-size: 13px;">${meta.icon}</span>
                      ${meta.label}
                    </span>
                  </td>
                  <td style="color: var(--color-text-muted); font-size: var(--font-size-xs); line-height: 1.4;">
                    ${escapeHtml(log.description || '—')}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: var(--space-3); flex-wrap: wrap; gap: var(--space-2);">
        <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
          Showing ${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, filtered.length)} of ${filtered.length} user records
        </span>
        <div style="display: flex; gap: var(--space-2);">
          <button id="modal-log-prev" class="btn btn-ghost btn-sm" ${currentPage > 0 ? '' : 'disabled'} type="button" style="padding: 4px 8px; font-size: var(--font-size-xs);">
            <span class="icon icon--sm" style="font-size: 14px;">arrow_back</span> Prev
          </button>
          <button id="modal-log-next" class="btn btn-ghost btn-sm" ${currentPage < totalPages - 1 ? '' : 'disabled'} type="button" style="padding: 4px 8px; font-size: var(--font-size-xs);">
            Next <span class="icon icon--sm" style="font-size: 14px;">arrow_forward</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('modal-log-prev')?.addEventListener('click', () => {
      if (currentPage > 0) {
        currentPage--;
        renderTable();
      }
    });

    document.getElementById('modal-log-next')?.addEventListener('click', () => {
      if (currentPage < totalPages - 1) {
        currentPage++;
        renderTable();
      }
    });
  }

  // Initial render
  renderTable();

  // Search & Filter event listeners
  document.getElementById('user-logs-search')?.addEventListener('input', e => {
    searchQuery = e.target.value;
    currentPage = 0;
    renderTable();
  });

  document.getElementById('user-logs-filter')?.addEventListener('change', e => {
    categoryFilter = e.target.value;
    currentPage = 0;
    renderTable();
  });
}
