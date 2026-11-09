/**
 * Application Shell Component
 *
 * Renders the full authenticated application layout:
 *   - Fixed sidebar (desktop) with Sign Out in footer (#93)
 *   - Sticky top header with Profile Photo + "Hi, <FirstName>!" Account Settings pill (#93)
 *   - Main content area (routes render here)
 *   - Fixed bottom nav bar (mobile)
 *
 * Then registers all routes and starts the router.
 */

import { router }           from '../../core/router.js';
import logoUrl              from '../../assets/logo.png';
import logoIconUrl          from '../../assets/logo-icon.png';
import mnaoLogoUrl          from '../../assets/mnao-logo.jpg';
import { logout }           from '../../features/auth/auth.service.js';
import { isAdministrator, getRoleLabel } from '../../core/permissions.js';
import {
  escapeProfileHtml,
  getFirstNameForGreeting,
  renderAvatarInnerHTML,
} from '../utils/profile.utils.js';
import { mountModuleGuideSystem } from './guide.component.js';
import { mountNotificationBell } from './notifications.component.js';

// Feature page render functions
import { renderCalendarPage }            from '../../features/calendar/calendar.page.js';
import { renderAdvisorPage }             from '../../features/advisor/advisor.page.js';
import { renderDashboardPage }   from '../../features/dashboard/dashboard.page.js';
import { renderCommoditiesPage } from '../../features/commodities/commodities.page.js';
import { renderBatchesPage }    from '../../features/batches/batches.page.js';
import { renderArchivePage }    from '../../features/archive/archive.page.js';
import { renderReleasesPage }   from '../../features/releases/releases.page.js';
import { renderBulkReleasePage } from '../../features/bulk-release/bulk-release.page.js';
import { renderUsersPage }       from '../../features/users/users.page.js';
import { renderAuditLogsPage }   from '../../features/audit-logs/audit-logs.page.js';
import { renderAccountPage }     from '../../features/account/account.page.js';
import { renderReportsPage }     from '../../features/reports/reports.page.js';
import { renderDefectsPage }     from '../../features/defects/defects.page.js';
import { renderMilkPage }        from '../../features/milk/milk.page.js';

/**
 * Render the application shell and start routing.
 *
 * @param {Object}   profile  - The authenticated user's profile
 * @param {Function} onLogout - Called after successful logout (shows login page)
 */
export function renderShell(profile, onLogout) {
  const app       = document.getElementById('app');
  const isAdmin   = isAdministrator(profile);
  const firstName = getFirstNameForGreeting(profile);

  // Check initial state from localStorage
  const isCompressed = localStorage.getItem('sidebar_compressed') === 'true';
  if (isCompressed) {
    document.body.classList.add('sidebar--compressed');
  }

  // ── Shell HTML ─────────────────────────────────────────────────────────────
  app.innerHTML = `
    <div class="app-layout" id="app-layout">

      <!-- ── Sidebar (desktop only) ────────────────────────────────────────────── -->
      <aside
        class="sidebar"
        id="sidebar"
        role="navigation"
        aria-label="Main navigation"
      >

        <!-- Brand logo & Toggle -->
        <div class="sidebar__logo">
          <div class="sidebar__logo-content" data-route="dashboard" role="button" tabindex="0" title="Go to Dashboard" style="cursor: pointer;">
            <img src="${logoUrl}" alt="NutriVision Logo" class="sidebar__logo-img" />
          </div>
          <button id="sidebar-toggle-btn" class="sidebar__toggle-btn btn btn-ghost" aria-label="Toggle Sidebar" title="${isCompressed ? 'Expand Sidebar' : 'Collapse Sidebar'}">
            <span class="sidebar__toggle-icon icon">menu</span>
            <img src="${logoIconUrl}" alt="NutriVision Icon" class="sidebar__toggle-logo" />
          </button>
        </div>
        
        <!-- Main navigation -->
        <nav class="sidebar__nav" aria-label="Main menu">

          <span class="sidebar__nav-label">Main</span>

          <button
            class="sidebar__nav-item"
            data-route="dashboard"
            id="nav-dashboard"
            type="button"
            aria-label="Dashboard"
          >
            <span class="icon" aria-hidden="true">dashboard</span>
            <span class="sidebar__nav-text">Dashboard</span>
          </button>
          <button
            class="sidebar__nav-item"
            data-route="advisor"
            id="nav-advisor"
            type="button"
            aria-label="Inventory Advisor"
          >
            <span class="icon" aria-hidden="true">insights</span>
            <span class="sidebar__nav-text">Advisor</span>
          </button>

          <button
            class="sidebar__nav-item"
            data-route="commodities"
            id="nav-commodities"
            type="button"
            aria-label="Commodity Management"
          >
            <span class="icon" aria-hidden="true">inventory_2</span>
            <span class="sidebar__nav-text">Commodities</span>
          </button>

          <button
            class="sidebar__nav-item"
            data-route="batches"
            id="nav-batches"
            type="button"
            aria-label="Batch Management"
          >
            <span class="icon" aria-hidden="true">package_2</span>
            <span class="sidebar__nav-text">Batches</span>
          </button>
          <button
            class="sidebar__nav-item"
            data-route="releases"
            id="nav-releases"
            type="button"
            aria-label="Releases Ledger"
          >
            <span class="icon" aria-hidden="true">local_shipping</span>
            <span class="sidebar__nav-text">Releases</span>
          </button>

          <button class="sidebar__nav-item" data-route="archive" id="nav-archive" type="button" aria-label="Archive">
            <span class="icon" aria-hidden="true">archive</span>
            <span class="sidebar__nav-text">Archive</span>
          </button>

          <button
            class="sidebar__nav-item"
            data-route="milk"
            id="nav-milk"
            type="button"
            aria-label="Milk Bank"
          >
            <span class="icon" aria-hidden="true">water_drop</span>
            <span class="sidebar__nav-text">Milk Bank</span>
          </button>

          <button
            class="sidebar__nav-item"
            data-route="calendar"
            id="nav-calendar"
            type="button"
            aria-label="Program Calendar"
          >
            <span class="icon" aria-hidden="true">calendar_month</span>
            <span class="sidebar__nav-text">Calendar</span>
          </button>

          <button
            class="sidebar__nav-item"
            data-route="reports"
            id="nav-reports"
            type="button"
            aria-label="Analytics and Reporting"
          >
            <span class="icon" aria-hidden="true">assessment</span>
            <span class="sidebar__nav-text">Reports</span>
          </button>

          <button
            class="sidebar__nav-item"
            data-route="defects"
            id="nav-defects"
            type="button"
            aria-label="Defects and Returns"
          >
            <span class="icon" aria-hidden="true">assignment_return</span>
            <span class="sidebar__nav-text">Defects &amp; Returns</span>
          </button>

          ${isAdmin ? `
          <span class="sidebar__nav-label" style="margin-top: var(--space-2);">Administration</span>

          <button
            class="sidebar__nav-item"
            data-route="users"
            id="nav-users"
            type="button"
            aria-label="User Management"
          >
            <span class="icon" aria-hidden="true">group</span>
            <span class="sidebar__nav-text">User Management</span>
          </button>

          <button
            class="sidebar__nav-item"
            data-route="audit-logs"
            id="nav-audit-logs"
            type="button"
            aria-label="Audit Logs"
          >
            <span class="icon" aria-hidden="true">history</span>
            <span class="sidebar__nav-text">Audit Logs</span>
          </button>
          ` : ''}

        </nav>

        <!-- Sidebar footer — Sign Out (#93 swapped from top header) -->
        <div class="sidebar__footer">
          <button
            class="sidebar__nav-item sidebar__logout-btn"
            id="sidebar-logout-btn"
            type="button"
            title="Sign Out"
            aria-label="Sign out of NutriVision"
          >
            <span class="icon" aria-hidden="true">logout</span>
            <span class="sidebar__nav-text" id="sidebar-logout-text">Sign Out</span>
          </button>
        </div>

      </aside>

      <!-- ── Main Wrapper ───────────────────────────────────────────────────────── -->
      <div class="main-wrapper" id="main-wrapper">

        <!-- Sticky top header -->
        <header class="app-header" id="app-header" role="banner">
          <div class="app-header__org" id="header-org-home" data-route="dashboard" role="button" tabindex="0" title="Go to Dashboard" style="cursor: pointer;">
            <img src="${mnaoLogoUrl}" alt="MNAO Logo" class="app-header__org-logo" />
            <div class="app-header__org-text">
              <span class="app-header__org-name">Municipal Nutrition Action Office</span>
              <span class="app-header__org-sub">Manolo Fortich, Bukidnon</span>
            </div>
          </div>

          <!-- Top-right Notification Bell (#94) + Profile Photo / Account Settings Pill (#93) -->
          <div class="app-header__user">
            <div class="nv-notif-wrap" id="header-notif-wrap"></div>
            <button
              id="header-account-btn"
              class="app-header__profile-btn"
              data-route="account"
              type="button"
              title="Account Settings"
              aria-label="Account Settings for ${escapeProfileHtml(profile.full_name)}"
            >
              <span class="app-header__avatar ${isAdmin ? 'app-header__avatar--admin' : ''}" id="header-user-avatar">
                ${renderAvatarInnerHTML(profile)}
              </span>
              <span class="app-header__profile-meta">
                <span class="app-header__greeting" id="header-user-greeting">Hi, ${escapeProfileHtml(firstName)}!</span>
                <span class="app-header__role-label">${escapeProfileHtml(getRoleLabel(profile))}</span>
              </span>
              <span class="icon app-header__settings-icon" aria-hidden="true">manage_accounts</span>
            </button>
          </div>
        </header>

        <!-- Page content — routes render here -->
        <main class="page-content" id="page-content" role="main" tabindex="-1">
          <!-- Populated by the router -->
        </main>

      </div>

      <!-- ── Mobile Bottom Nav ────────────────────────────────────────────────── -->
      <nav
        class="mobile-nav"
        id="mobile-nav"
        role="navigation"
        aria-label="Mobile navigation"
      >
        <button class="mobile-nav__item" data-route="dashboard" type="button" aria-label="Dashboard">
          <span class="icon" aria-hidden="true">dashboard</span>
          Dashboard
        </button>

        <button class="mobile-nav__item" data-route="commodities" type="button" aria-label="Commodities">
          <span class="icon" aria-hidden="true">inventory_2</span>
          Commodities
        </button>

        ${isAdmin ? `
        <button class="mobile-nav__item" data-route="users" type="button" aria-label="Users">
          <span class="icon" aria-hidden="true">group</span>
          Users
        </button>
        ` : ''}

        <button class="mobile-nav__item" id="mobile-logout-btn" type="button" aria-label="Sign Out">
          <span class="icon" aria-hidden="true">logout</span>
          Sign Out
        </button>
      </nav>

    </div>
  `;

  // ── Event Listeners ─────────────────────────────────────────────────────────

  // Sidebar toggle
  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('sidebar--compressed');
      const isNowCompressed = document.body.classList.contains('sidebar--compressed');
      localStorage.setItem('sidebar_compressed', isNowCompressed);
      toggleBtn.setAttribute('title', isNowCompressed ? 'Expand Sidebar' : 'Collapse Sidebar');
      toggleBtn.setAttribute('aria-label', isNowCompressed ? 'Expand Sidebar' : 'Collapse Sidebar');
    });
  }

  // Nav item clicks — navigate via router
  document.querySelectorAll('[data-route]').forEach(btn => {
    btn.addEventListener('click', () => {
      router.navigate(`#/${btn.dataset.route}`);
    });
    if (btn.getAttribute('role') === 'button') {
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.navigate(`#/${btn.dataset.route}`);
        }
      });
    }
  });

  // Logout buttons (Desktop sidebar footer + Mobile bottom nav)
  document.getElementById('sidebar-logout-btn')?.addEventListener('click', () => {
    handleLogout(profile, onLogout);
  });
  document.getElementById('mobile-logout-btn')?.addEventListener('click', () => {
    handleLogout(profile, onLogout);
  });

  // ── Router Setup ───────────────────────────────────────────────────────────

  router.setProfile(profile);
  router.setOnForceLogout(onLogout);

  router
    .register('dashboard',   renderDashboardPage)
    .register('commodities', renderCommoditiesPage)
    .register('batches',     renderBatchesPage)
    .register('archive',     renderArchivePage)
    .register('releases',    renderReleasesPage)
    .register('bulk-release',renderBulkReleasePage)
    .register('reports',     renderReportsPage)
    .register('defects',     renderDefectsPage)
    .register('milk',        renderMilkPage)
    .register('users',       renderUsersPage,     { adminOnly: true })
    .register('audit-logs',  renderAuditLogsPage, { adminOnly: true })
    .register('account',     renderAccountPage)
    .register('calendar',    renderCalendarPage)
    .register('advisor',     renderAdvisorPage);

  // Start the router — handles the current hash and listens for changes
  router.start();

  // Mount contextual [ⓘ Guide] buttons & right-side Help Drawer across all pages (#95)
  mountModuleGuideSystem(profile);

  // Mount Top Navbar Notification Bell (#94)
  mountNotificationBell(profile);
}

/**
 * Handle logout from the sidebar / mobile button.
 * @param {Object}   profile
 * @param {Function} onLogout - Callback to show the login page
 */
async function handleLogout(profile, onLogout) {
  const sidebarBtn  = document.getElementById('sidebar-logout-btn');
  const sidebarText = document.getElementById('sidebar-logout-text');
  const mobileBtn   = document.getElementById('mobile-logout-btn');

  if (sidebarBtn)  sidebarBtn.disabled = true;
  if (sidebarText) sidebarText.textContent = 'Signing out...';
  if (mobileBtn)   mobileBtn.disabled = true;

  await logout(profile);
  // onAuthStateChange in main.js also fires SIGNED_OUT → rerenders login
  // Calling onLogout directly handles the case before the event fires
  onLogout();
}
