/**
 * User Management Page
 *
 * Administrator-only feature to view, create, and manage staff accounts.
 */

import { fetchUsers, createUser, toggleUserStatus } from './users.service.js';
import { validateUserForm }                         from './users.validation.js';
import { formatDate }                              from '../../shared/utils/date.utils.js';
import { ROLES }                                    from '../../shared/constants/app.constants.js';

// Module-level state
let _users        = [];
let _profile      = null;
let _search       = '';
let _roleFilter   = '';
let _statusFilter = '';

/**
 * Main render function for User Management page.
 * @param {Object} profile - Current authenticated user profile
 */
export async function renderUsersPage(profile) {
  _profile = profile;
  const content = document.getElementById('page-content');
  if (!content) return;

  // Render initial loading state
  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-header__title">User Management</h1>
        <p class="page-header__subtitle">Manage staff accounts and system access privileges</p>
      </div>
    </div>
    <div class="loading-overlay">
      <div class="spinner spinner-lg"></div>
    </div>
  `;

  const { users, error } = await fetchUsers();

  if (error) {
    content.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-header__title">User Management</h1>
          <p class="page-header__subtitle">Manage staff accounts and system access privileges</p>
        </div>
      </div>
      <div class="alert alert-error" style="margin-top: var(--space-4);">
        <span class="icon">error</span>
        <span>${error}</span>
      </div>
    `;
    return;
  }

  _users = users;
  _renderMainView(content);
}

// ── Main View Rendering ───────────────────────────────────────────────────

function _renderMainView(container) {
  container.innerHTML = `
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-4);">
      <div>
        <h1 class="page-header__title">User Management</h1>
        <p class="page-header__subtitle" id="users-subtitle">
          ${_users.length} registered staff account${_users.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div>
        <button id="add-user-btn" class="btn btn-primary" type="button" aria-label="Add New User">
          <span class="icon">person_add</span>
          Add User
        </button>
      </div>
    </div>

    <!-- Stats summary cards -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-6);">
      <div class="stat-card">
        <div class="stat-card__label">Total Staff</div>
        <div class="stat-card__value" id="stat-total">${_users.length}</div>
        <div class="stat-card__footer">Registered system accounts</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">Active Accounts</div>
        <div class="stat-card__value stat-card__value--primary" id="stat-active">
          ${_users.filter(u => u.is_active).length}
        </div>
        <div class="stat-card__footer">Can sign in to NutriVision</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">Deactivated</div>
        <div class="stat-card__value" id="stat-inactive" style="color: var(--color-text-muted);">
          ${_users.filter(u => !u.is_active).length}
        </div>
        <div class="stat-card__footer">Access disabled</div>
      </div>
    </div>

    <!-- Filter and Search Toolbar -->
    <div class="card" style="margin-bottom: var(--space-6); padding: var(--space-4);">
      <div style="display: flex; gap: var(--space-3); flex-wrap: wrap; align-items: center;">
        
        <!-- Search bar -->
        <div style="flex: 1; min-width: 220px; position: relative;">
          <input
            type="text"
            id="user-search"
            class="form-input"
            placeholder="Search by name..."
            value="${_escapeHtml(_search)}"
            aria-label="Search users by name"
          />
        </div>

        <!-- Role Filter -->
        <div style="min-width: 180px;">
          <select id="user-role-filter" class="form-input" aria-label="Filter by role">
            <option value="" ${!_roleFilter ? 'selected' : ''}>All Roles</option>
            <option value="${ROLES.ADMINISTRATOR}" ${_roleFilter === ROLES.ADMINISTRATOR ? 'selected' : ''}>Administrator</option>
            <option value="${ROLES.NUTRITION_PERSONNEL}" ${_roleFilter === ROLES.NUTRITION_PERSONNEL ? 'selected' : ''}>Nutrition Personnel</option>
          </select>
        </div>

        <!-- Status Filter -->
        <div style="min-width: 160px;">
          <select id="user-status-filter" class="form-input" aria-label="Filter by status">
            <option value="" ${!_statusFilter ? 'selected' : ''}>All Statuses</option>
            <option value="active" ${_statusFilter === 'active' ? 'selected' : ''}>Active</option>
            <option value="inactive" ${_statusFilter === 'inactive' ? 'selected' : ''}>Deactivated</option>
          </select>
        </div>

      </div>
    </div>

    <!-- Users Table Container -->
    <div id="users-table-container">
      ${_buildTableHtml()}
    </div>
  `;

  _attachEventListeners();
}

// ── Table Generation ──────────────────────────────────────────────────────

function _buildTableHtml() {
  const filtered = _getFilteredUsers();

  if (filtered.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state__icon" aria-hidden="true">
          <span class="icon" style="font-size: 48px; color: var(--color-text-subtle);">group_off</span>
        </div>
        <h2 class="empty-state__title">No user accounts found</h2>
        <p class="empty-state__description">
          ${_users.length === 0
            ? 'No staff accounts exist yet. Click "+ Add User" to create the first account.'
            : 'No users match your current filter criteria.'}
        </p>
      </div>
    `;
  }

  return `
    <div class="table-wrapper">
      <table class="table" aria-label="Users list">
        <thead>
          <tr>
            <th scope="col">User</th>
            <th scope="col">Role</th>
            <th scope="col">Status</th>
            <th scope="col">Registered</th>
            <th scope="col" style="text-align: right;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(u => _buildUserRow(u)).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function _buildUserRow(user) {
  const isCurrent = user.id === _profile?.id;
  const initial = (user.full_name || 'U').charAt(0).toUpperCase();
  const isAdmin = user.role === ROLES.ADMINISTRATOR;

  return `
    <tr id="user-row-${user.id}">
      <td>
        <div style="display: flex; align-items: center; gap: var(--space-3);">
          <div style="
            width: 36px;
            height: 36px;
            border-radius: var(--radius-full);
            background-color: ${isAdmin ? 'var(--color-primary)' : 'var(--color-surface-alt)'};
            color: ${isAdmin ? '#fff' : 'var(--color-text)'};
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: var(--font-size-sm);
            flex-shrink: 0;
          ">
            ${initial}
          </div>
          <div>
            <div style="font-weight: 500; color: var(--color-text);">
              ${_escapeHtml(user.full_name)}
              ${isCurrent ? '<span style="font-size: var(--font-size-xs); color: var(--color-primary); margin-left: 6px; font-weight: 600;">(You)</span>' : ''}
            </div>
          </div>
        </div>
      </td>
      <td>
        <span class="badge ${isAdmin ? 'badge-admin' : 'badge-personnel'}">
          ${isAdmin ? 'Administrator' : 'Nutrition Personnel'}
        </span>
      </td>
      <td>
        <span class="badge ${user.is_active ? 'badge-active' : 'badge-inactive'}">
          <span class="icon icon--sm" style="font-size: 14px;">${user.is_active ? 'check_circle' : 'cancel'}</span>
          ${user.is_active ? 'Active' : 'Deactivated'}
        </span>
      </td>
      <td style="color: var(--color-text-muted); font-size: var(--font-size-sm);">
        ${formatDate(user.created_at)}
      </td>
      <td style="text-align: right;">
        ${isCurrent ? `
          <span style="font-size: var(--font-size-xs); color: var(--color-text-subtle);">Active Session</span>
        ` : `
          <button
            class="btn btn-sm toggle-status-btn ${user.is_active ? 'btn-ghost' : 'btn-secondary'}"
            data-id="${user.id}"
            style="${user.is_active ? 'color: var(--color-danger);' : 'color: var(--color-primary);'}"
            type="button"
            aria-label="${user.is_active ? 'Deactivate account' : 'Activate account'} for ${_escapeHtml(user.full_name)}"
          >
            <span class="icon icon--sm">${user.is_active ? 'block' : 'check'}</span>
            ${user.is_active ? 'Deactivate' : 'Activate'}
          </button>
        `}
      </td>
    </tr>
  `;
}

// ── Filtering Logic ───────────────────────────────────────────────────────

function _getFilteredUsers() {
  return _users.filter(u => {
    // Search filter (name)
    if (_search) {
      const q = _search.toLowerCase();
      const nameMatch = u.full_name?.toLowerCase().includes(q);
      if (!nameMatch) return false;
    }

    // Role filter
    if (_roleFilter && u.role !== _roleFilter) {
      return false;
    }

    // Status filter
    if (_statusFilter === 'active' && !u.is_active) return false;
    if (_statusFilter === 'inactive' && u.is_active) return false;

    return true;
  });
}

function _refreshTableOnly() {
  const container = document.getElementById('users-table-container');
  if (container) {
    container.innerHTML = _buildTableHtml();
  }
}

// ── Event Handlers ────────────────────────────────────────────────────────

function _attachEventListeners() {
  // Add User button
  document.getElementById('add-user-btn')
    ?.addEventListener('click', _openAddUserModal);

  // Search input
  document.getElementById('user-search')
    ?.addEventListener('input', e => {
      _search = e.target.value;
      _refreshTableOnly();
    });

  // Role filter
  document.getElementById('user-role-filter')
    ?.addEventListener('change', e => {
      _roleFilter = e.target.value;
      _refreshTableOnly();
    });

  // Status filter
  document.getElementById('user-status-filter')
    ?.addEventListener('change', e => {
      _statusFilter = e.target.value;
      _refreshTableOnly();
    });

  // Event delegation for table action buttons
  document.getElementById('users-table-container')
    ?.addEventListener('click', e => {
      const toggleBtn = e.target.closest('.toggle-status-btn');
      if (toggleBtn) {
        const userId = toggleBtn.dataset.id;
        const targetUser = _users.find(u => u.id === userId);
        if (targetUser) {
          _confirmToggleStatus(targetUser);
        }
      }
    });
}

// ── Add User Modal ────────────────────────────────────────────────────────

function _openAddUserModal() {
  _closeModal();

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

  // Overlay click to close
  overlay.addEventListener('click', e => {
    if (e.target === overlay) _closeModal();
  });

  document.getElementById('modal-close-btn')?.addEventListener('click', _closeModal);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', _closeModal);

  // Toggle password visibility
  const pwdInput = document.getElementById('field-password');
  const toggleBtn = document.getElementById('toggle-pwd-btn');
  const toggleIcon = document.getElementById('toggle-pwd-icon');

  toggleBtn?.addEventListener('click', () => {
    const isPass = pwdInput.type === 'password';
    pwdInput.type = isPass ? 'text' : 'password';
    toggleIcon.textContent = isPass ? 'visibility_off' : 'visibility';
    toggleBtn.setAttribute('aria-label', isPass ? 'Hide password' : 'Show password');
  });

  // Escape key closes modal
  overlay._escHandler = e => {
    if (e.key === 'Escape') _closeModal();
  };
  document.addEventListener('keydown', overlay._escHandler);

  // Submit handler
  document.getElementById('create-user-form')?.addEventListener('submit', _handleCreateSubmit);
}

async function _handleCreateSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const formData = {
    full_name: form.full_name.value.trim(),
    email:     form.email.value.trim(),
    password:  form.password.value,
    role:      form.role.value,
  };

  // Clear previous field errors
  ['full_name', 'email', 'password', 'role'].forEach(field => {
    const errEl = document.getElementById(`error-${field}`);
    const inputEl = document.getElementById(`field-${field}`);
    if (errEl) errEl.textContent = '';
    if (inputEl) inputEl.classList.remove('form-input--error');
  });

  const alertEl = document.getElementById('modal-form-alert');
  if (alertEl) alertEl.style.display = 'none';

  // Client-side validation
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

  _setModalLoading(true);

  const { user, error } = await createUser(formData, _profile);

  _setModalLoading(false);

  if (error) {
    const msgEl = document.getElementById('modal-form-alert-msg');
    if (alertEl && msgEl) {
      msgEl.textContent = error;
      alertEl.style.display = 'flex';
    }
    return;
  }

  // Refresh users list
  _closeModal();
  await _refreshAllUsers();
}

function _setModalLoading(isLoading) {
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

function _closeModal() {
  const overlay = document.getElementById('user-modal-overlay') || document.getElementById('confirm-modal-overlay');
  if (!overlay) return;
  if (overlay._escHandler) document.removeEventListener('keydown', overlay._escHandler);
  overlay.remove();
}

// ── Deactivate / Activate Confirmation Modal ──────────────────────────────

function _confirmToggleStatus(user) {
  _closeModal();

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
          Are you sure you want to <strong>${actionText.toLowerCase()}</strong> the account for <strong>${_escapeHtml(user.full_name)}</strong>?
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
    if (e.target === overlay) _closeModal();
  });

  document.getElementById('confirm-close-btn')?.addEventListener('click', _closeModal);
  document.getElementById('confirm-cancel-btn')?.addEventListener('click', _closeModal);

  overlay._escHandler = e => {
    if (e.key === 'Escape') _closeModal();
  };
  document.addEventListener('keydown', overlay._escHandler);

  document.getElementById('confirm-action-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('confirm-action-btn');
    const text = document.getElementById('confirm-btn-text');
    const spinner = document.getElementById('confirm-btn-spinner');

    if (btn) btn.disabled = true;
    if (text) text.textContent = 'Updating...';
    if (spinner) spinner.style.display = 'inline-block';

    const { error } = await toggleUserStatus(user, _profile);

    _closeModal();

    if (error) {
      alert(error);
      return;
    }

    await _refreshAllUsers();
  });
}

// ── Refresh Helpers ───────────────────────────────────────────────────────

async function _refreshAllUsers() {
  const { users } = await fetchUsers();
  _users = users;

  // Update subtitle
  const subtitle = document.getElementById('users-subtitle');
  if (subtitle) {
    subtitle.textContent = `${_users.length} registered staff account${_users.length !== 1 ? 's' : ''}`;
  }

  // Update stat counters
  const totalEl = document.getElementById('stat-total');
  const activeEl = document.getElementById('stat-active');
  const inactiveEl = document.getElementById('stat-inactive');
  if (totalEl) totalEl.textContent = _users.length;
  if (activeEl) activeEl.textContent = _users.filter(u => u.is_active).length;
  if (inactiveEl) inactiveEl.textContent = _users.filter(u => !u.is_active).length;

  _refreshTableOnly();
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
