/**
 * Contextual Module Manual & Navigation Guide Component (#95)
 *
 * Automatically attaches an inline `[ⓘ Guide]` button next to every page's
 * main title (`.page-header__title`) as well as full-screen workspaces
 * (`Bulk Batch Registration` and `Bulk Release Manifest`), opening a
 * right-side non-destructive Slide-Over Help Drawer so staff can read
 * step-by-step instructions while viewing the live page.
 */

import { MODULE_GUIDES, MODULE_GUIDES_ORDER } from '../constants/module-guides.constants.js';
import { isAdministrator } from '../../core/permissions.js';
import { router } from '../../core/router.js';

let _observer = null;
let _rafScheduled = false;
let _currentProfile = null;
let _activeGuideKey = 'dashboard';
let _escListenerBound = false;

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _getCurrentRouteKey() {
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0].trim().toLowerCase();
  if (raw && MODULE_GUIDES[raw]) return raw;
  return 'dashboard';
}

function _inferGuideKeyForHeading(headingEl) {
  if (!headingEl) return _getCurrentRouteKey();

  if (headingEl.classList.contains('workspace-header-title')) {
    return 'batches-workspace';
  }
  if (headingEl.classList.contains('bulk-release-topbar__title')) {
    return 'bulk-release';
  }

  const text = (headingEl.textContent || '').trim().toLowerCase();
  if (text.includes('bulk release')) return 'bulk-release';
  if (text.includes('bulk batch')) return 'batches-workspace';
  if (text.includes('inventory advisor')) return 'advisor';
  if (text.includes('commodity')) return 'commodities';
  if (text.includes('batch management')) return 'batches';
  if (text.includes('releases')) return 'releases';
  if (text.includes('archive') && !text.includes('audit logs')) return 'archive';
  if (text.includes('milk bank')) return 'milk';
  if (text.includes('calendar')) return 'calendar';
  if (text.includes('reporting') || text.includes('analytics')) return 'reports';
  if (text.includes('defect')) return 'defects';
  if (text.includes('user management')) return 'users';
  if (text.includes('audit logs')) return 'audit-logs';
  if (text.includes('account settings')) return 'account';
  if (text.includes('dashboard')) return 'dashboard';

  return _getCurrentRouteKey();
}

function _getAccessibleGuides() {
  const isAdmin = isAdministrator(_currentProfile);
  return MODULE_GUIDES_ORDER
    .map(key => MODULE_GUIDES[key])
    .filter(g => g && (!g.adminOnly || isAdmin));
}

function _createGuideButton(guideKey, variant = 'page') {
  const guide = MODULE_GUIDES[guideKey] || MODULE_GUIDES.dashboard;
  const isBlue = guide.theme === 'blue';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = [
    'nv-page-guide-btn',
    variant === 'workspace' ? 'nv-page-guide-btn--workspace' : '',
    isBlue ? 'nv-page-guide-btn--blue' : '',
  ].filter(Boolean).join(' ');
  btn.dataset.guideKey = guide.key;
  btn.setAttribute('aria-label', `Open Manual & Navigation Guide for ${guide.title}`);
  btn.title = `How to use & navigate ${guide.title}`;
  btn.innerHTML = `
    <span class="icon nv-page-guide-btn__icon" aria-hidden="true">info</span>
    <span class="nv-page-guide-btn__label">Guide</span>
  `;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openModuleGuideDrawer(btn.dataset.guideKey || _getCurrentRouteKey());
  });

  return btn;
}

function _injectGuideButtonsIntoDOM() {
  // 1. Standard page titles (.page-header__title inside #page-content)
  const pageTitles = document.querySelectorAll('#page-content .page-header__title');
  pageTitles.forEach(h1 => {
    if (h1.dataset.nvGuideAttached === '1') return;
    h1.dataset.nvGuideAttached = '1';

    const guideKey = _inferGuideKeyForHeading(h1);
    const wrapper = document.createElement('div');
    wrapper.className = 'nv-page-title-row';

    if (h1.parentNode) {
      h1.parentNode.insertBefore(wrapper, h1);
      wrapper.appendChild(h1);
      wrapper.appendChild(_createGuideButton(guideKey, 'page'));
    }
  });

  // 2. Bulk Release workspace title (.bulk-release-topbar__title)
  const bulkReleaseTitles = document.querySelectorAll('.bulk-release-topbar__title');
  bulkReleaseTitles.forEach(h1 => {
    if (h1.dataset.nvGuideAttached === '1') return;
    h1.dataset.nvGuideAttached = '1';

    const wrapper = document.createElement('div');
    wrapper.className = 'nv-page-title-row';
    if (h1.parentNode) {
      h1.parentNode.insertBefore(wrapper, h1);
      wrapper.appendChild(h1);
      wrapper.appendChild(_createGuideButton('bulk-release', 'workspace'));
    }
  });

  // 3. Bulk Batch Registration workspace title (.workspace-header-title)
  const workspaceTitles = document.querySelectorAll('.bulk-workspace-overlay .workspace-header-title');
  workspaceTitles.forEach(h2 => {
    if (h2.dataset.nvGuideAttached === '1') return;
    h2.dataset.nvGuideAttached = '1';

    const btn = _createGuideButton('batches-workspace', 'workspace');
    if (h2.parentNode) {
      h2.insertAdjacentElement('afterend', btn);
    }
  });
}

function _scheduleInject() {
  if (_rafScheduled) return;
  _rafScheduled = true;
  requestAnimationFrame(() => {
    _rafScheduled = false;
    _injectGuideButtonsIntoDOM();
  });
}

function _ensureDrawerMounted() {
  let root = document.getElementById('nv-guide-drawer-root');
  if (root) return root;

  root = document.createElement('div');
  root.id = 'nv-guide-drawer-root';
  root.className = 'nv-guide-root';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `
    <div class="nv-guide-backdrop" id="nv-guide-backdrop"></div>
    <aside
      class="nv-guide-drawer"
      id="nv-guide-drawer"
      role="dialog"
      aria-modal="false"
      aria-labelledby="nv-guide-drawer-title"
    >
      <div class="nv-guide-drawer__header" id="nv-guide-drawer-header">
        <div class="nv-guide-drawer__header-top">
          <div class="nv-guide-drawer__title-group">
            <span class="nv-guide-drawer__icon-badge" id="nv-guide-drawer-icon-wrap">
              <span class="icon" id="nv-guide-drawer-icon" aria-hidden="true">menu_book</span>
            </span>
            <div>
              <span class="nv-guide-drawer__eyebrow">Module Manual &amp; Guide</span>
              <h2 class="nv-guide-drawer__title" id="nv-guide-drawer-title">Dashboard</h2>
            </div>
          </div>
          <button
            type="button"
            class="nv-guide-drawer__close"
            id="nv-guide-drawer-close"
            aria-label="Close Module Guide"
            title="Close Guide (Esc)"
          >
            <span class="icon" aria-hidden="true">close</span>
          </button>
        </div>

        <div class="nv-guide-drawer__switcher">
          <label for="nv-guide-module-select" class="nv-guide-drawer__switcher-label">
            <span class="icon" style="font-size: 15px;">explore</span>
            Browse Module:
          </label>
          <select id="nv-guide-module-select" class="nv-guide-drawer__select" aria-label="Select module guide"></select>
        </div>
      </div>

      <div class="nv-guide-drawer__body" id="nv-guide-drawer-body"></div>

      <div class="nv-guide-drawer__footer">
        <span class="nv-guide-drawer__footer-hint">
          <span class="icon" style="font-size: 15px;">tips_and_updates</span>
          Keep this guide open on the side while working on the page.
        </span>
        <button type="button" class="btn btn-secondary btn-sm" id="nv-guide-drawer-done">Got It</button>
      </div>
    </aside>
  `;

  document.body.appendChild(root);

  document.getElementById('nv-guide-backdrop')?.addEventListener('click', closeModuleGuideDrawer);
  document.getElementById('nv-guide-drawer-close')?.addEventListener('click', closeModuleGuideDrawer);
  document.getElementById('nv-guide-drawer-done')?.addEventListener('click', closeModuleGuideDrawer);

  document.getElementById('nv-guide-module-select')?.addEventListener('change', (e) => {
    const nextKey = e.target.value;
    if (MODULE_GUIDES[nextKey]) {
      _renderDrawerContent(nextKey);
    }
  });

  document.getElementById('nv-guide-drawer-body')?.addEventListener('click', (e) => {
    const jumpBtn = e.target.closest('[data-guide-jump-route]');
    if (!jumpBtn) return;
    const targetRoute = jumpBtn.dataset.guideJumpRoute;
    if (!targetRoute) return;

    // Close any open full-screen overlay before navigating if user clicks a route jump
    const bulkWsCancel = document.getElementById('workspace-cancel-btn');
    if (bulkWsCancel) bulkWsCancel.click();

    closeModuleGuideDrawer();
    router.navigate(`#/${targetRoute}`);
  });

  if (!_escListenerBound) {
    _escListenerBound = true;
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const activeRoot = document.getElementById('nv-guide-drawer-root');
        if (activeRoot?.classList.contains('is-open')) {
          e.stopPropagation();
          closeModuleGuideDrawer();
        }
      }
    });
  }

  return root;
}

function _renderDrawerContent(guideKey) {
  const guide = MODULE_GUIDES[guideKey] || MODULE_GUIDES.dashboard;
  _activeGuideKey = guide.key;

  const headerEl = document.getElementById('nv-guide-drawer-header');
  const iconEl   = document.getElementById('nv-guide-drawer-icon');
  const titleEl  = document.getElementById('nv-guide-drawer-title');
  const selectEl = document.getElementById('nv-guide-module-select');
  const bodyEl   = document.getElementById('nv-guide-drawer-body');

  if (headerEl) {
    headerEl.classList.toggle('nv-guide-drawer__header--blue', guide.theme === 'blue');
  }
  if (iconEl) iconEl.textContent = guide.icon || 'menu_book';
  if (titleEl) titleEl.textContent = guide.title;

  if (selectEl) {
    const accessible = _getAccessibleGuides();
    selectEl.innerHTML = accessible
      .map(g => `<option value="${_esc(g.key)}" ${g.key === guide.key ? 'selected' : ''}>${_esc(g.title)}</option>`)
      .join('');
  }

  if (!bodyEl) return;

  const isAdmin = isAdministrator(_currentProfile);
  const related = (guide.relatedRoutes || []).filter(r => {
    const targetGuide = MODULE_GUIDES[r.route];
    return !targetGuide?.adminOnly || isAdmin;
  });

  bodyEl.innerHTML = `
    <!-- Section 1: Purpose -->
    <section class="nv-guide-section nv-guide-section--overview">
      <div class="nv-guide-section__heading">
        <span class="icon">flag</span>
        What This Page Does
      </div>
      <p class="nv-guide-overview-text">${_esc(guide.purpose)}</p>
    </section>

    <!-- Section 2: How to Use (Step-by-Step) -->
    <section class="nv-guide-section">
      <div class="nv-guide-section__heading">
        <span class="icon">checklist</span>
        How to Use (Step-by-Step)
      </div>
      <ol class="nv-guide-steps">
        ${(guide.howToUse || []).map((s, idx) => `
          <li class="nv-guide-step">
            <span class="nv-guide-step__num">${idx + 1}</span>
            <div class="nv-guide-step__content">
              <strong class="nv-guide-step__title">${_esc(s.stepTitle)}</strong>
              <p class="nv-guide-step__detail">${_esc(s.detail)}</p>
            </div>
          </li>
        `).join('')}
      </ol>
    </section>

    <!-- Section 3: Screen Layout & Navigation -->
    <section class="nv-guide-section">
      <div class="nv-guide-section__heading">
        <span class="icon">compass_calibration</span>
        Page Controls &amp; Navigation
      </div>
      <ul class="nv-guide-nav-list">
        ${(guide.navigation || []).map(item => `
          <li class="nv-guide-nav-item">
            <span class="nv-guide-nav-item__dot" aria-hidden="true"></span>
            <div>
              <strong class="nv-guide-nav-item__label">${_esc(item.label)}:</strong>
              <span class="nv-guide-nav-item__detail">${_esc(item.detail)}</span>
            </div>
          </li>
        `).join('')}
      </ul>
    </section>

    <!-- Section 4: Rules & Policies -->
    ${guide.rulesAndBadges && guide.rulesAndBadges.length > 0 ? `
      <section class="nv-guide-section nv-guide-section--rules">
        <div class="nv-guide-section__heading">
          <span class="icon">verified_user</span>
          Important Rules &amp; Indicators
        </div>
        <ul class="nv-guide-rules-list">
          ${guide.rulesAndBadges.map(rule => `
            <li>
              <span class="icon nv-guide-rules-list__icon" aria-hidden="true">check_circle</span>
              <span>${_esc(rule)}</span>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : ''}

    <!-- Section 5: Related Modules -->
    ${related.length > 0 ? `
      <section class="nv-guide-section">
        <div class="nv-guide-section__heading">
          <span class="icon">open_in_new</span>
          Quick Jump to Related Modules
        </div>
        <div class="nv-guide-related-pills">
          ${related.map(r => `
            <button type="button" class="nv-guide-jump-pill" data-guide-jump-route="${_esc(r.route)}">
              <span>${_esc(r.label)}</span>
              <span class="icon" style="font-size: 14px;" aria-hidden="true">arrow_forward</span>
            </button>
          `).join('')}
        </div>
      </section>
    ` : ''}
  `;

  bodyEl.scrollTop = 0;
}

export function openModuleGuideDrawer(guideKey) {
  const root = _ensureDrawerMounted();
  const resolvedKey = MODULE_GUIDES[guideKey] ? guideKey : _getCurrentRouteKey();
  _renderDrawerContent(resolvedKey);

  root.classList.add('is-open');
  root.setAttribute('aria-hidden', 'false');
}

export function closeModuleGuideDrawer() {
  const root = document.getElementById('nv-guide-drawer-root');
  if (!root) return;
  root.classList.remove('is-open');
  root.setAttribute('aria-hidden', 'true');
}

export function mountModuleGuideSystem(profile) {
  _currentProfile = profile;
  _ensureDrawerMounted();
  closeModuleGuideDrawer();

  if (_observer) {
    _observer.disconnect();
    _observer = null;
  }

  _injectGuideButtonsIntoDOM();

  _observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length > 0) {
        _scheduleInject();
        break;
      }
    }
  });

  _observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
