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
import { renderDashboardPage }   from '../../features/dashboard/dashboard.page.js';
import { renderCommoditiesPage } from '../../features/commodities/commodities.page.js';
import { renderBatchesPage }    from '../../features/batches/batches.page.js';
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

  // â”€â”€ Shell HTML â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  app.innerHTML = `
    <div class="app-layout" id="app-layout">

      <!-- â”€â”€ Sidebar (desktop only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
      <aside
        class="sidebar"
        id="sidebar"
        role="navigation"
        aria-label="Main navigation"
      >

        <!-- Brand logo -->
        <div class="sidebar__logo" style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: var(--space-4) var(--space-4);">
          <img src="${logoUrl}" alt="NutriVision Logo" style="height: 32px; width: auto; max-width: 100%; display: block;" />
          <div class="sidebar__logo-sub" style="margin-left: 2px;">MNAO - Manolo Fortich</div>
        </div><!-- Main navigation -->
        <nav class="sidebar__nav" aria-label="Main menu">

          <span class="sidebar__nav-label">Main</span>

          <button
            class="sidebar__nav-item"
            data-route="dashboard"
            id="nav-dashboard"
            type="button"
            aria-label="Dashboard"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            Dashboard
          </button>

          <button
            class="sidebar__nav-item"
            data-route="commodities"
            id="nav-commodities"
            type="button"
            aria-label="Commodity Management"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            Commodities
          </button>

          <button
            class="sidebar__nav-item"
            data-route="batches"
            id="nav-batches"
            type="button"
            aria-label="Batch Management"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="1" y="3" width="15" height="13"/>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            Batches
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            User Management
          </button>

          <button
            class="sidebar__nav-item"
            data-route="audit-logs"
            id="nav-audit-logs"
            type="button"
            aria-label="Audit Logs"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            Audit Logs
          </button>
          ` : ''}

        </nav>

        <!-- Sidebar footer â€” account settings -->
        <div class="sidebar__footer">
          <button
            class="sidebar__nav-item"
            data-route="account"
            id="nav-account"
            type="button"
            aria-label="Account Settings"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Account
          </button>
        </div>

      </aside>

      <!-- â”€â”€ Main Wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign Out
            </button>
          </div>
        </header>

        <!-- Page content â€” routes render here -->
        <main class="page-content" id="page-content" role="main" tabindex="-1">
          <!-- Populated by the router -->
        </main>

      </div>

      <!-- â”€â”€ Mobile Bottom Nav â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
      <nav
        class="mobile-nav"
        id="mobile-nav"
        role="navigation"
        aria-label="Mobile navigation"
      >
        <button class="mobile-nav__item" data-route="dashboard" type="button" aria-label="Dashboard">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          Dashboard
        </button>

        <button class="mobile-nav__item" data-route="commodities" type="button" aria-label="Commodities">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          Commodities
        </button>

        ${isAdmin ? `
        <button class="mobile-nav__item" data-route="users" type="button" aria-label="Users">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Users
        </button>
        ` : ''}

        <button class="mobile-nav__item" data-route="account" type="button" aria-label="Account">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          Account
        </button>
      </nav>

    </div>
  `;

  // â”€â”€ Event Listeners â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // Nav item clicks â€” navigate via router
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
    .register('users',       renderUsersPage,     { adminOnly: true })
    .register('audit-logs',  renderAuditLogsPage, { adminOnly: true })
    .register('account',     renderAccountPage);

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

