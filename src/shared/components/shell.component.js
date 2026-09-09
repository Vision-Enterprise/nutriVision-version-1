/**
 * Application Shell Component
 *
 * Renders the full authenticated application layout:
 *   - Fixed sidebar (desktop)
 *   - Sticky top header
 *   - Main content area (routes render here)
 *   - Fixed bottom nav bar (mobile)
 *
 * Then registers all routes and starts the router.
 *
 * WHY everything in one component?
 * The shell is always present while the user is authenticated.
 * Sidebar, header, and mobile nav never change â€” only #page-content does.
 * Keeping them in one place makes the structure easy to follow:
 * renderShell() â†’ shell in DOM â†’ router.start() â†’ first page renders.
 *
 * WHAT changes per route:
 * Only the innerHTML of #page-content changes.
 * The sidebar, header, and mobile nav stay mounted.
 *
 * HOW to add a new route in the future:
 * 1. Add the nav item HTML here
 * 2. Import the page render function
 * 3. Call router.register() with the path and handler
 */

import { router }           from '../../core/router.js';
import logoUrl              from '../../assets/logo.png';
import { logout }           from '../../features/auth/auth.service.js';
import { isAdministrator, getRoleLabel } from '../../core/permissions.js';

// Feature page render functions (placeholders in Phase 3)
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

/**
 * Render the application shell and start routing.
 *
 * @param {Object}   profile  - The authenticated user's profile
 * @param {Function} onLogout - Called after successful logout (shows login page)
 */
export function renderShell(profile, onLogout) {
  const app     = document.getElementById('app');
  const isAdmin = isAdministrator(profile);

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
        <div class="sidebar__logo" style="display: flex; align-items: flex-start; justify-content: space-between; padding: var(--space-4); width: 100%;">
          <div class="sidebar__logo-content" style="display: flex; flex-direction: column; gap: 4px; overflow: hidden;">
            <img src="${logoUrl}" alt="NutriVision Logo" class="sidebar__logo-img" style="height: 32px; width: auto; display: block;" />
            <div class="sidebar__logo-sub" style="margin-left: 2px;">MNAO - Manolo Fortich</div>
          </div>
          <button id="sidebar-toggle-btn" class="btn btn-ghost" style="padding: 8px; border-radius: 50%; min-width: unset; height: auto;" aria-label="Toggle Sidebar">
            <span class="icon">menu</span>
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
          <button class="sidebar__nav-item" data-route="archive" id="nav-archive" type="button" aria-label="Data Archive">
            <span class="icon" aria-hidden="true">archive</span>
            <span class="sidebar__nav-text">Archive</span>
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

        <!-- Sidebar footer — account settings -->
        <div class="sidebar__footer">
          <button
            class="sidebar__nav-item"
            data-route="account"
            id="nav-account"
            type="button"
            aria-label="Account Settings"
          >
            <span class="icon" aria-hidden="true">manage_accounts</span>
            <span class="sidebar__nav-text">Account</span>
          </button>
        </div>

      </aside>

      <!-- ── Main Wrapper ───────────────────────────────────────────────────────── -->
      <div class="main-wrapper" id="main-wrapper">

        <!-- Sticky top header -->
        <header class="app-header" id="app-header" role="banner">
          <span id="page-title" class="app-header__title">Dashboard</span>

          <div class="app-header__user">
            <span style="color: var(--color-text);">${profile.full_name}</span>
            <span class="badge ${isAdmin ? 'badge-admin' : 'badge-personnel'}">
              ${getRoleLabel(profile)}
            </span>
            <button
              id="header-logout-btn"
              class="btn btn-ghost btn-sm"
              type="button"
              aria-label="Sign out of NutriVision"
            >
              <span class="icon icon--sm" aria-hidden="true">logout</span>
              Sign Out
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
          <span class="icon" aria-hidden="true">group</span>
          Commodities
        </button>

        ${isAdmin ? `
        <button class="mobile-nav__item" data-route="users" type="button" aria-label="Users">
          <span class="icon" aria-hidden="true">group</span>
          Users
        </button>
        ` : ''}

        <button class="mobile-nav__item" data-route="account" type="button" aria-label="Account">
          <span class="icon" aria-hidden="true">manage_accounts</span>
          Account
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
    });
  }

  // Nav item clicks — navigate via router
  document.querySelectorAll('[data-route]').forEach(btn => {
    btn.addEventListener('click', () => {
      router.navigate(`#/${btn.dataset.route}`);
    });
  });

  // Logout button
  document.getElementById('header-logout-btn').addEventListener('click', () => {
    handleLogout(profile, onLogout);
  });

  // â”€â”€ Router Setup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  router.setProfile(profile);

  router
    .register('dashboard',   renderDashboardPage)
    .register('commodities', renderCommoditiesPage)
    .register('batches',     renderBatchesPage)
    .register('archive',     renderArchivePage)
    .register('releases',    renderReleasesPage)
    .register('bulk-release',renderBulkReleasePage)
    .register('users',       renderUsersPage,     { adminOnly: true })
    .register('audit-logs',  renderAuditLogsPage, { adminOnly: true })
    .register('account',     renderAccountPage)
    .register('calendar',    renderCalendarPage)
    .register('advisor',     renderAdvisorPage);

  // Start the router â€” handles the current hash and listens for changes
  router.start();
}

/**
 * Handle logout from the header button.
 * @param {Object}   profile
 * @param {Function} onLogout - Callback to show the login page
 */
async function handleLogout(profile, onLogout) {
  const btn = document.getElementById('header-logout-btn');
  if (btn) {
    btn.textContent = 'Signing out...';
    btn.disabled = true;
  }

  await logout(profile);
  // onAuthStateChange in main.js also fires SIGNED_OUT â†’ rerenders login
  // Calling onLogout directly handles the case before the event fires
  onLogout();
}

