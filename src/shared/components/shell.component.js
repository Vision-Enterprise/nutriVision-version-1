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
import { renderReleasesPage }   from '../../features/releases/releases.page.js';
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
            <span class="icon" aria-hidden="true">dashboard</span>
            Dashboard
          </button>

          <button
            class="sidebar__nav-item"
            data-route="commodities"
            id="nav-commodities"
            type="button"
            aria-label="Commodity Management"
          >
            <span class="icon" aria-hidden="true">inventory_2</span>
            Commodities
          </button>

          <button
            class="sidebar__nav-item"
            data-route="batches"
            id="nav-batches"
            type="button"
            aria-label="Batch Management"
          >
            <span class="icon" aria-hidden="true">package_2</span>
            Batches
          </button>
            <button
              class="sidebar__nav-item"
              data-route="releases"
              id="nav-releases"
              type="button"
              aria-label="Releases Ledger"
            >
              <span class="icon" aria-hidden="true">local_shipping</span>
              Releases
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
            User Management
          </button>

          <button
            class="sidebar__nav-item"
            data-route="audit-logs"
            id="nav-audit-logs"
            type="button"
            aria-label="Audit Logs"
          >
            <span class="icon" aria-hidden="true">history</span>
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
            <span class="icon" aria-hidden="true">manage_accounts</span>
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
              <span class="icon icon--sm" aria-hidden="true">logout</span>
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
      .register('releases',    renderReleasesPage)
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

