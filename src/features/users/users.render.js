/**
 * User Management - View (Render)
 *
 * Pure HTML rendering functions for user management.
 * Zero database calls or mutation logic.
 */

import { formatDate } from '../../shared/utils/date.utils.js';
import { ROLES } from '../../shared/constants/app.constants.js';

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderUsersLayout({ users, filtered, search, roleFilter, statusFilter, profile }) {
  return `
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-4);">
      <div>
        <h1 class="page-header__title">User Management</h1>
        <p class="page-header__subtitle" id="users-subtitle">
          ${users.length} registered staff account${users.length !== 1 ? 's' : ''}
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
        <div class="stat-card__value" id="stat-total">${users.length}</div>
        <div class="stat-card__footer">Registered system accounts</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">Active Accounts</div>
        <div class="stat-card__value stat-card__value--primary" id="stat-active">
          ${users.filter(u => u.is_active).length}
        </div>
        <div class="stat-card__footer">Can sign in to NutriVision</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">Deactivated</div>
        <div class="stat-card__value" id="stat-inactive" style="color: var(--color-text-muted);">
          ${users.filter(u => !u.is_active).length}
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
            value="${escapeHtml(search)}"
            aria-label="Search users by name"
          />
        </div>

        <!-- Role Filter -->
        <div style="min-width: 180px;">
          <select id="user-role-filter" class="form-input" aria-label="Filter by role">
            <option value="" ${!roleFilter ? 'selected' : ''}>All Roles</option>
            <option value="${ROLES.ADMINISTRATOR}" ${roleFilter === ROLES.ADMINISTRATOR ? 'selected' : ''}>Administrator</option>
            <option value="${ROLES.NUTRITION_PERSONNEL}" ${roleFilter === ROLES.NUTRITION_PERSONNEL ? 'selected' : ''}>Nutrition Personnel</option>
          </select>
        </div>

        <!-- Status Filter -->
        <div style="min-width: 160px;">
          <select id="user-status-filter" class="form-input" aria-label="Filter by status">
            <option value="" ${!statusFilter ? 'selected' : ''}>All Statuses</option>
            <option value="active" ${statusFilter === 'active' ? 'selected' : ''}>Active</option>
            <option value="inactive" ${statusFilter === 'inactive' ? 'selected' : ''}>Deactivated</option>
          </select>
        </div>

      </div>
    </div>

    <!-- Users Table Container -->
    <div id="users-table-container">
      ${renderUsersTable(filtered, users.length, profile)}
    </div>
  `;
}

export function renderUsersTable(filtered, totalUsersCount, profile) {
  if (filtered.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state__icon" aria-hidden="true">
          <span class="icon" style="font-size: 48px; color: var(--color-text-subtle);">group_off</span>
        </div>
        <h2 class="empty-state__title">No user accounts found</h2>
        <p class="empty-state__description">
          ${totalUsersCount === 0
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
          ${filtered.map(u => renderUserRow(u, profile)).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function renderUserRow(user, profile) {
  const isCurrent = user.id === profile?.id;
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
              ${escapeHtml(user.full_name)}
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
            aria-label="${user.is_active ? 'Deactivate account' : 'Activate account'} for ${escapeHtml(user.full_name)}"
          >
            <span class="icon icon--sm">${user.is_active ? 'block' : 'check'}</span>
            ${user.is_active ? 'Deactivate' : 'Activate'}
          </button>
        `}
      </td>
    </tr>
  `;
}
