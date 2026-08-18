/**
 * Hash Router
 *
 * A lightweight client-side router for NutriVision.
 * Uses the URL hash (#/dashboard, #/commodities, etc.) for navigation.
 *
 * WHY hash routing instead of History API (/dashboard, /commodities)?
 * Hash routing works without any server configuration.
 * The browser never sends the hash to the server, so the server always
 * serves index.html regardless of the hash. History API routing requires
 * the server to redirect all paths to index.html — more configuration,
 * less portable for a local government deployment.
 *
 * HOW IT WORKS:
 * 1. register() maps path names to render functions
 * 2. start() listens for hashchange events
 * 3. On every hash change, _resolve() reads the new path,
 *    applies guards, and calls the registered render function
 *
 * ROUTE GUARDS:
 * adminOnly: true → redirect to #/dashboard if the user is not an administrator
 * This prevents nutrition_personnel from accessing user management or audit logs
 * by typing the URL directly.
 *
 * NOTE: Guards here protect the UI only.
 * Supabase RLS policies protect the actual data in the database.
 * Even if someone bypasses the frontend guard, they cannot read or write
 * data they are not authorized to access.
 */

import { ROUTES } from '../shared/constants/app.constants.js';

class Router {
  constructor() {
    // Map of path string → { handler, adminOnly }
    this._routes   = new Map();
    this._profile  = null;
    this._started  = false;
  }

  /**
   * Set the currently authenticated user's profile.
   * Used by route guards to check the role.
   * Call this after login and after session restore.
   * @param {Object} profile
   */
  setProfile(profile) {
    this._profile = profile;
  }

  /**
   * Register a route.
   *
   * @param {string}   path       - e.g. 'dashboard', 'commodities'
   * @param {Function} handler    - Called with (profile) when route is active
   * @param {Object}   [options]
   * @param {boolean}  [options.adminOnly=false] - Restrict to administrators
   * @returns {Router} - Returns this for method chaining
   */
  register(path, handler, options = {}) {
    this._routes.set(path, {
      handler,
      adminOnly: options.adminOnly ?? false,
    });
    return this;
  }

  /**
   * Navigate to a route by setting the window hash.
   * @param {string} hash - e.g. '#/dashboard'
   */
  navigate(hash) {
    window.location.hash = hash;
  }

  /**
   * Get the current path from the URL hash.
   * @returns {string} - e.g. 'dashboard'
   */
  getCurrentPath() {
    const hash = window.location.hash;
    if (!hash || hash === '#' || hash === '#/') return 'dashboard';
    return hash.replace('#/', '').split('?')[0].trim() || 'dashboard';
  }

  /**
   * Start the router.
   *
   * The hashchange listener is only attached once (on first call).
   * _resolve() is called every time so that re-login after logout on the same
   * tab correctly renders the dashboard without requiring a page refresh.
   */
  start() {
    if (!this._started) {
      this._started = true;
      window.addEventListener('hashchange', () => this._resolve());
    }

    // Always resolve the current route, even on subsequent calls.
    // This handles the re-login-after-logout scenario where the listener
    // is already set but the page content must be rendered again.
    this._resolve();
  }

  /**
   * Resolve the current URL to a route and render it.
   * Called on every hashchange and on every start() call.
   *
   * Async so that page handlers that fetch data are properly awaited.
   * Unhandled errors in async handlers are caught here and surfaced
   * as a visible error message rather than silently leaving the page blank.
   *
   * @private
   */
  async _resolve() {
    const path  = this.getCurrentPath();
    const route = this._routes.get(path);

    // Unknown route — redirect to dashboard
    if (!route) {
      this.navigate(ROUTES.DASHBOARD);
      return;
    }

    // Role guard — admin-only routes redirect non-admins to dashboard
    if (route.adminOnly && this._profile?.role !== 'administrator') {
      this.navigate(ROUTES.DASHBOARD);
      return;
    }

    // Update the active state on nav items
    this._syncNavActiveState(path);

    // Update the page title in the header
    this._syncPageTitle(path);

    // Render the page into #page-content
    const contentEl = document.getElementById('page-content');
    if (!contentEl) return;

    try {
      await route.handler(this._profile);
    } catch (err) {
      console.error('[Router] Page render error:', err);
      contentEl.innerHTML = `
        <div class="alert alert-error" style="margin: var(--space-6);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>Something went wrong loading this page. Please refresh and try again.</span>
        </div>
      `;
    }
  }

  /**
   * Mark the nav item for the active route.
   * Removes active class from all items, adds it to matching ones.
   *
   * WHY data-route attribute?
   * Avoids tying the JS to specific DOM structure or IDs.
   * Any element with data-route="dashboard" becomes active when on the dashboard.
   * This works for both the sidebar and the mobile nav without extra code.
   *
   * @private
   */
  _syncNavActiveState(activePath) {
    // Remove active from all nav items
    document.querySelectorAll('[data-route]').forEach(el => {
      el.classList.remove('sidebar__nav-item--active', 'mobile-nav__item--active');
    });

    // Add active to items matching the current route
    document.querySelectorAll(`[data-route="${activePath}"]`).forEach(el => {
      if (el.classList.contains('sidebar__nav-item')) {
        el.classList.add('sidebar__nav-item--active');
      } else if (el.classList.contains('mobile-nav__item')) {
        el.classList.add('mobile-nav__item--active');
      }
    });
  }

  /**
   * Update the page title text in the header.
   * @private
   */
  _syncPageTitle(path) {
    const titleEl = document.getElementById('page-title');
    if (!titleEl) return;

    const pageTitles = {
      'dashboard':   'Dashboard',
      'commodities': 'Commodity Management',
      'batches':     'Batch Management',
      'users':       'User Management',
      'audit-logs':  'Audit Logs',
      'account':     'Account Settings',
    };

    titleEl.textContent = pageTitles[path] ?? 'NutriVision';
  }
}

// Export a single router instance.
// Every file that imports this gets the SAME router object.
// This is the Singleton pattern — same reason as the Supabase client.
export const router = new Router();

