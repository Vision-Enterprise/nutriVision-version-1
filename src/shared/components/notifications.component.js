/**
 * Top Navbar Notification Bell Component (#94)
 *
 * Anchors a real-time notification bell + unread counter badge in the top
 * header bar with filter tabs (All, Urgent, Milk Bank, Schedule), "Mark all read",
 * manual refresh, and 1-click navigation to the target batch/module.
 */

import {
  fetchSystemNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/notifications.service.js';
import { router } from '../../core/router.js';

let _profile = null;
let _notifications = [];
let _activeTab = 'all';
let _isOpen = false;
let _isLoading = false;
let _pollTimer = null;
let _hashDebounceTimer = null;
let _docListenersBound = false;

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _getFilteredNotifications() {
  if (_activeTab === 'urgent') {
    return _notifications.filter(n => n.urgent);
  }
  if (_activeTab === 'milk') {
    return _notifications.filter(n => n.category === 'milk');
  }
  if (_activeTab === 'schedule') {
    return _notifications.filter(n => n.category === 'schedule');
  }
  return _notifications;
}

function _updateBellBadgeUI() {
  const badgeEl = document.getElementById('header-notif-badge');
  const iconEl  = document.getElementById('header-notif-icon');
  const btnEl   = document.getElementById('header-notif-btn');

  const unreadCount = _notifications.filter(n => !n.isRead).length;
  const hasCriticalUnread = _notifications.some(n => !n.isRead && n.severity === 'critical');

  if (badgeEl) {
    if (unreadCount > 0) {
      badgeEl.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
      badgeEl.style.display = 'inline-flex';
      badgeEl.classList.toggle('nv-notif-badge--critical', hasCriticalUnread);
    } else {
      badgeEl.style.display = 'none';
    }
  }

  if (iconEl) {
    iconEl.textContent = unreadCount > 0 ? 'notifications_active' : 'notifications';
  }

  if (btnEl) {
    btnEl.setAttribute(
      'aria-label',
      unreadCount > 0
        ? `Notifications (${unreadCount} unread)`
        : 'Notifications (no unread alerts)'
    );
  }
}

function _renderPopoverContent() {
  const popover = document.getElementById('header-notif-popover');
  if (!popover) return;

  const unreadCount   = _notifications.filter(n => !n.isRead).length;
  const urgentCount   = _notifications.filter(n => n.urgent).length;
  const milkCount     = _notifications.filter(n => n.category === 'milk').length;
  const scheduleCount = _notifications.filter(n => n.category === 'schedule').length;
  const filtered      = _getFilteredNotifications();

  popover.innerHTML = `
    <div class="nv-notif-popover__header">
      <div class="nv-notif-popover__title-row">
        <div style="display: flex; align-items: center; gap: 8px;">
          <h3 class="nv-notif-popover__title">Notifications</h3>
          ${unreadCount > 0
            ? `<span class="nv-notif-unread-pill">${unreadCount} new</span>`
            : `<span class="nv-notif-unread-pill nv-notif-unread-pill--clear">Up to date</span>`
          }
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <button
            type="button"
            class="nv-notif-icon-action"
            id="nv-notif-refresh-btn"
            title="Refresh notifications"
            aria-label="Refresh notifications"
            ${_isLoading ? 'disabled' : ''}
          >
            <span class="icon ${_isLoading ? 'nv-notif-spin' : ''}" aria-hidden="true">refresh</span>
          </button>
          ${unreadCount > 0 ? `
            <button
              type="button"
              class="nv-notif-mark-all-btn"
              id="nv-notif-mark-all-btn"
            >
              Mark all read
            </button>
          ` : ''}
        </div>
      </div>

      <div class="nv-notif-tabs" role="tablist" aria-label="Notification categories">
        <button
          type="button"
          role="tab"
          aria-selected="${_activeTab === 'all'}"
          class="nv-notif-tab ${_activeTab === 'all' ? 'is-active' : ''}"
          data-notif-tab="all"
        >
          All <span>${_notifications.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected="${_activeTab === 'urgent'}"
          class="nv-notif-tab ${_activeTab === 'urgent' ? 'is-active' : ''}"
          data-notif-tab="urgent"
        >
          Urgent <span>${urgentCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected="${_activeTab === 'milk'}"
          class="nv-notif-tab ${_activeTab === 'milk' ? 'is-active' : ''}"
          data-notif-tab="milk"
        >
          Milk Bank <span>${milkCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected="${_activeTab === 'schedule'}"
          class="nv-notif-tab ${_activeTab === 'schedule' ? 'is-active' : ''}"
          data-notif-tab="schedule"
        >
          Schedule <span>${scheduleCount}</span>
        </button>
      </div>
    </div>

    <div class="nv-notif-popover__list" id="nv-notif-list">
      ${_isLoading && _notifications.length === 0 ? `
        <div class="nv-notif-empty">
          <div class="spinner"></div>
          <p>Checking inventory &amp; schedule alerts...</p>
        </div>
      ` : filtered.length === 0 ? `
        <div class="nv-notif-empty">
          <span class="icon nv-notif-empty__icon" aria-hidden="true">task_alt</span>
          <strong>All caught up!</strong>
          <p>No active alerts in this category right now.</p>
        </div>
      ` : filtered.map(item => `
        <button
          type="button"
          class="nv-notif-item ${item.isRead ? 'is-read' : 'is-unread'}"
          data-notif-id="${_esc(item.id)}"
          data-notif-route="${_esc(item.route)}"
        >
          <span class="nv-notif-item__icon nv-notif-item__icon--${_esc(item.severity)}">
            <span class="icon" aria-hidden="true">${_esc(item.icon)}</span>
          </span>
          <span class="nv-notif-item__body">
            <span class="nv-notif-item__meta">
              <span class="nv-notif-item__tag nv-notif-item__tag--${_esc(item.severity)}">${_esc(item.tag)}</span>
              ${!item.isRead ? '<span class="nv-notif-item__dot" aria-label="Unread"></span>' : ''}
            </span>
            <span class="nv-notif-item__title">${_esc(item.title)}</span>
            <span class="nv-notif-item__sub">${_esc(item.subtitle)}</span>
          </span>
        </button>
      `).join('')}
    </div>
  `;
}

export async function refreshNotifications() {
  if (!_profile?.id) return;
  _isLoading = true;
  if (_isOpen) _renderPopoverContent();

  try {
    const { notifications } = await fetchSystemNotifications(_profile.id);
    _notifications = notifications;
  } catch (err) {
    console.warn('[NotificationBell] Failed to refresh alerts:', err);
  } finally {
    _isLoading = false;
    _updateBellBadgeUI();
    if (_isOpen) _renderPopoverContent();
  }
}

function _openPopover() {
  const popover = document.getElementById('header-notif-popover');
  const btn     = document.getElementById('header-notif-btn');
  if (!popover || !btn) return;

  _isOpen = true;
  btn.classList.add('is-active');
  btn.setAttribute('aria-expanded', 'true');
  popover.classList.add('is-open');
  _renderPopoverContent();
}

export function closeNotificationPopover() {
  const popover = document.getElementById('header-notif-popover');
  const btn     = document.getElementById('header-notif-btn');
  _isOpen = false;
  if (btn) {
    btn.classList.remove('is-active');
    btn.setAttribute('aria-expanded', 'false');
  }
  if (popover) {
    popover.classList.remove('is-open');
  }
}

function _handleNavigateToAlert(targetHash) {
  if (!targetHash) return;
  // Close any open full-screen overlay before jumping
  const bulkWsCancel = document.getElementById('workspace-cancel-btn');
  if (bulkWsCancel) bulkWsCancel.click();

  if (window.location.hash === targetHash) {
    router.refresh();
  } else {
    window.location.hash = targetHash;
  }
}

export function mountNotificationBell(profile) {
  _profile = profile;
  _isOpen = false;
  _activeTab = 'all';

  const wrap = document.getElementById('header-notif-wrap');
  if (!wrap) return;

  wrap.innerHTML = `
    <button
      id="header-notif-btn"
      class="nv-notif-bell-btn"
      type="button"
      title="System Notifications"
      aria-label="Notifications"
      aria-haspopup="dialog"
      aria-expanded="false"
    >
      <span class="icon nv-notif-bell-btn__icon" id="header-notif-icon" aria-hidden="true">notifications</span>
      <span class="nv-notif-badge" id="header-notif-badge" style="display: none;">0</span>
    </button>
    <div
      id="header-notif-popover"
      class="nv-notif-popover"
      role="dialog"
      aria-label="System Notifications"
    ></div>
  `;

  const btn     = document.getElementById('header-notif-btn');
  const popover = document.getElementById('header-notif-popover');

  btn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (_isOpen) {
      closeNotificationPopover();
    } else {
      _openPopover();
      refreshNotifications();
    }
  });

  popover?.addEventListener('click', (e) => {
    e.stopPropagation();

    const tabBtn = e.target.closest('[data-notif-tab]');
    if (tabBtn) {
      _activeTab = tabBtn.dataset.notifTab || 'all';
      _renderPopoverContent();
      return;
    }

    if (e.target.closest('#nv-notif-refresh-btn')) {
      refreshNotifications();
      return;
    }

    if (e.target.closest('#nv-notif-mark-all-btn')) {
      markAllNotificationsRead(_profile?.id, _notifications.map(n => n.id));
      _notifications = _notifications.map(n => ({ ...n, isRead: true }));
      _updateBellBadgeUI();
      _renderPopoverContent();
      return;
    }

    const itemBtn = e.target.closest('[data-notif-id]');
    if (itemBtn) {
      const notifId = itemBtn.dataset.notifId;
      const route   = itemBtn.dataset.notifRoute;
      markNotificationRead(_profile?.id, notifId);
      _notifications = _notifications.map(n =>
        n.id === notifId ? { ...n, isRead: true } : n
      );
      _updateBellBadgeUI();
      closeNotificationPopover();
      _handleNavigateToAlert(route);
    }
  });

  if (!_docListenersBound) {
    _docListenersBound = true;

    document.addEventListener('click', (e) => {
      if (!_isOpen) return;
      const host = document.getElementById('header-notif-wrap');
      if (host && !host.contains(e.target)) {
        closeNotificationPopover();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && _isOpen) {
        closeNotificationPopover();
      }
    });

    window.addEventListener('hashchange', () => {
      closeNotificationPopover();
      clearTimeout(_hashDebounceTimer);
      _hashDebounceTimer = setTimeout(() => {
        refreshNotifications();
      }, 900);
    });
  }

  if (_pollTimer) clearInterval(_pollTimer);
  _pollTimer = setInterval(() => {
    if (document.visibilityState === 'visible') {
      refreshNotifications();
    }
  }, 90000);

  refreshNotifications();
}

