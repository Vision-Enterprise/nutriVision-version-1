/**
 * User Management Page (Controller)
 *
 * Administrator-only feature to view, create, and manage staff accounts.
 * MVC Controller: delegates table/row HTML to .render.js and modals to .modals.js.
 */

import { fetchUsers } from './users.service.js';
import { renderUsersLayout, renderUsersTable } from './users.render.js';
import { openAddUserModal, openConfirmToggleStatusModal } from './users.modals.js';

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

  // Initial loading state
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

// ── View Coordination ───────────────────────────────────────────────────────

function _renderMainView(container) {
  const filtered = _getFilteredUsers();

  container.innerHTML = renderUsersLayout({
    users: _users,
    filtered,
    search: _search,
    roleFilter: _roleFilter,
    statusFilter: _statusFilter,
    profile: _profile
  });

  _attachEventListeners();
}

function _getFilteredUsers() {
  return _users.filter(u => {
    if (_search) {
      const q = _search.toLowerCase();
      const nameMatch = u.full_name?.toLowerCase().includes(q);
      if (!nameMatch) return false;
    }
    if (_roleFilter && u.role !== _roleFilter) return false;
    if (_statusFilter === 'active' && !u.is_active) return false;
    if (_statusFilter === 'inactive' && u.is_active) return false;
    return true;
  });
}

function _refreshTableOnly() {
  const container = document.getElementById('users-table-container');
  if (container) {
    const filtered = _getFilteredUsers();
    container.innerHTML = renderUsersTable(filtered, _users.length, _profile);
  }
}

async function _refreshAllUsers() {
  const { users } = await fetchUsers();
  if (users) _users = users;

  const subtitle = document.getElementById('users-subtitle');
  if (subtitle) {
    subtitle.textContent = `${_users.length} registered staff account${_users.length !== 1 ? 's' : ''}`;
  }

  const totalEl = document.getElementById('stat-total');
  const activeEl = document.getElementById('stat-active');
  const inactiveEl = document.getElementById('stat-inactive');
  if (totalEl) totalEl.textContent = _users.length;
  if (activeEl) activeEl.textContent = _users.filter(u => u.is_active).length;
  if (inactiveEl) inactiveEl.textContent = _users.filter(u => !u.is_active).length;

  _refreshTableOnly();
}

// ── Event Handlers ──────────────────────────────────────────────────────────

function _attachEventListeners() {
  document.getElementById('add-user-btn')?.addEventListener('click', () => {
    openAddUserModal({
      profile: _profile,
      onSuccess: async () => {
        await _refreshAllUsers();
      }
    });
  });

  document.getElementById('user-search')?.addEventListener('input', e => {
    _search = e.target.value;
    _refreshTableOnly();
  });

  document.getElementById('user-role-filter')?.addEventListener('change', e => {
    _roleFilter = e.target.value;
    _refreshTableOnly();
  });

  document.getElementById('user-status-filter')?.addEventListener('change', e => {
    _statusFilter = e.target.value;
    _refreshTableOnly();
  });

  document.getElementById('users-table-container')?.addEventListener('click', e => {
    const toggleBtn = e.target.closest('.toggle-status-btn');
    if (toggleBtn) {
      const userId = toggleBtn.dataset.id;
      const targetUser = _users.find(u => u.id === userId);
      if (targetUser) {
        openConfirmToggleStatusModal({
          user: targetUser,
          profile: _profile,
          onSuccess: async () => {
            await _refreshAllUsers();
          }
        });
      }
    }
  });
}
