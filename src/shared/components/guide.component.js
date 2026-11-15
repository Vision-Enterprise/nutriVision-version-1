/**
 * Contextual Module Manual & Navigation Guide Component (#95)
 *
 * Automatically attaches an inline `[ⓘ Guide]` button next to every page's
 * main title (`.page-header__title`) as well as full-screen workspaces
 * (`Bulk Batch Registration` and `Bulk Release Manifest`), opening a
 * right-side non-destructive Slide-Over Help Drawer with English, Bisaya,
 * and Tagalog support.
 */

import { MODULE_GUIDES, MODULE_GUIDES_ORDER } from '../constants/module-guides.constants.js';
import { isAdministrator } from '../../core/permissions.js';
import { router } from '../../core/router.js';

const LANG_STORAGE_KEY = 'nv_guide_lang';
const UI_LABELS = {
  en: {
    eyebrow: 'User Guide',
    browse: 'Page:',
    stepsHeading: 'Step-by-Step Guide',
    colorsHeading: 'Colors & Meanings',
    goToHeading: 'Go To',
    footerHint: 'Keep this guide open on the side while working.',
    doneBtn: 'Got It',
  },
  bis: {
    eyebrow: 'Giya sa Paggamit',
    browse: 'Panid:',
    stepsHeading: 'Giya (Step-by-Step)',
    colorsHeading: 'Mga Kolor ug Kahulogan',
    goToHeading: 'Adto sa',
    footerHint: 'I-bilin kini sa kilid samtang nagtrabaho.',
    doneBtn: 'Nasabtan',
  },
  tl: {
    eyebrow: 'Gabay sa Paggamit',
    browse: 'Pahina:',
    stepsHeading: 'Gabay (Step-by-Step)',
    colorsHeading: 'Mga Kulay at Kahulugan',
    goToHeading: 'Pumunta sa',
    footerHint: 'Panatilihing bukas sa gilid habang gumagawa.',
    doneBtn: 'Nakuha Ko',
  },
};

let _observer = null;
let _rafScheduled = false;
let _currentProfile = null;
let _activeGuideKey = 'dashboard';
let _escListenerBound = false;
let _guideLang = _loadSavedLang();

function _loadSavedLang() {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'en' || saved === 'bis' || saved === 'tl') return saved;
  } catch {}
  return 'en';
}

function _saveLang(lang) {
  _guideLang = lang;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {}
}

function _t(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[_guideLang] || obj.en || '';
}

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
  btn.setAttribute('aria-label', `Open Guide for ${guide.title}`);
  btn.title = `How to use ${guide.title}`;
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

  // 3. Bulk Batch Registration workspace title (.workspace-overlay .workspace-header-title)
  const workspaceTitles = document.querySelectorAll('.workspace-overlay .workspace-header-title, .bulk-workspace-overlay .workspace-header-title');
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
              <span class="nv-guide-drawer__eyebrow" id="nv-guide-drawer-eyebrow">User Guide</span>
              <h2 class="nv-guide-drawer__title" id="nv-guide-drawer-title">Dashboard</h2>
            </div>
          </div>
          <button
            type="button"
            class="nv-guide-drawer__close"
            id="nv-guide-drawer-close"
            aria-label="Close Guide"
            title="Close Guide (Esc)"
          >
            <span class="icon" aria-hidden="true">close</span>
          </button>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
          <div class="nv-guide-lang-bar" role="group" aria-label="Guide Language">
            <button type="button" class="nv-guide-lang-pill" data-guide-lang="en">English</button>
            <button type="button" class="nv-guide-lang-pill" data-guide-lang="bis">Bisaya</button>
            <button type="button" class="nv-guide-lang-pill" data-guide-lang="tl">Tagalog</button>
          </div>
        </div>

        <div class="nv-guide-drawer__switcher">
          <label for="nv-guide-module-select" class="nv-guide-drawer__switcher-label" id="nv-guide-switcher-label">
            <span class="icon" style="font-size: 15px;">explore</span>
            Page:
          </label>
          <select id="nv-guide-module-select" class="nv-guide-drawer__select" aria-label="Select module guide"></select>
        </div>
      </div>

      <div class="nv-guide-drawer__body" id="nv-guide-drawer-body"></div>

      <div class="nv-guide-drawer__footer">
        <span class="nv-guide-drawer__footer-hint" id="nv-guide-footer-hint">
          <span class="icon" style="font-size: 15px;">tips_and_updates</span>
          Keep this guide open on the side while working.
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

  root.querySelectorAll('[data-guide-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-guide-lang');
      if (lang && lang !== _guideLang) {
        _saveLang(lang);
        _renderDrawerContent(_activeGuideKey);
      }
    });
  });

  document.getElementById('nv-guide-drawer-body')?.addEventListener('click', (e) => {
    const jumpBtn = e.target.closest('[data-guide-jump-route]');
    if (!jumpBtn) return;
    const targetRoute = jumpBtn.dataset.guideJumpRoute;
    if (!targetRoute) return;

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
  const isBlue = guide.theme === 'blue';
  const ui = UI_LABELS[_guideLang] || UI_LABELS.en;

  const headerEl = document.getElementById('nv-guide-drawer-header');
  const iconEl   = document.getElementById('nv-guide-drawer-icon');
  const titleEl  = document.getElementById('nv-guide-drawer-title');
  const eyebrowEl = document.getElementById('nv-guide-drawer-eyebrow');
  const switcherLabelEl = document.getElementById('nv-guide-switcher-label');
  const footerHintEl = document.getElementById('nv-guide-footer-hint');
  const doneBtnEl = document.getElementById('nv-guide-drawer-done');
  const selectEl = document.getElementById('nv-guide-module-select');
  const bodyEl   = document.getElementById('nv-guide-drawer-body');

  if (headerEl) headerEl.classList.toggle('nv-guide-drawer__header--blue', isBlue);
  if (iconEl) iconEl.textContent = guide.icon || 'menu_book';
  if (titleEl) titleEl.textContent = guide.title;
  if (eyebrowEl) eyebrowEl.textContent = ui.eyebrow;
  if (switcherLabelEl) {
    switcherLabelEl.innerHTML = `<span class="icon" style="font-size: 15px;">explore</span> ${_esc(ui.browse)}`;
  }
  if (footerHintEl) {
    footerHintEl.innerHTML = `<span class="icon" style="font-size: 15px;">tips_and_updates</span> ${_esc(ui.footerHint)}`;
  }
  if (doneBtnEl) doneBtnEl.textContent = ui.doneBtn;

  document.querySelectorAll('[data-guide-lang]').forEach(btn => {
    btn.classList.toggle('is-active', btn.getAttribute('data-guide-lang') === _guideLang);
  });

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
    <!-- Plain 1-sentence summary -->
    <div class="nv-guide-summary-card ${isBlue ? 'nv-guide-summary-card--blue' : ''}">
      ${_esc(_t(guide.summary))}
    </div>

    <!-- Visual Step-by-Step Guide -->
    <section class="nv-guide-section">
      <div class="nv-guide-section__heading">
        <span class="icon">checklist</span>
        ${_esc(ui.stepsHeading)}
      </div>
      <div class="nv-guide-steps">
        ${(guide.steps || []).map((s, idx) => `
          <div class="nv-guide-step-card">
            <span class="nv-guide-step-card__num ${isBlue ? 'nv-guide-step-card__num--blue' : ''}">${idx + 1}</span>
            <div class="nv-guide-step-card__body">
              <div class="nv-guide-step-card__title">${_esc(_t(s.title))}</div>
              <p class="nv-guide-step-card__detail">${_esc(_t(s.detail))}</p>
              ${s.chips && s.chips.length > 0 ? `
                <div class="nv-guide-btn-row">
                  ${s.chips.map(c => `
                    <span class="nv-guide-btn-preview nv-guide-btn-preview--${_esc(c.tone || 'neutral')}">
                      ${c.icon ? `<span class="icon" aria-hidden="true">${_esc(c.icon)}</span>` : ''}
                      ${_esc(c.label)}
                    </span>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- Optional Color Meanings -->
    ${guide.badges && guide.badges.length > 0 ? `
      <section class="nv-guide-section">
        <div class="nv-guide-section__heading">
          <span class="icon">palette</span>
          ${_esc(ui.colorsHeading)}
        </div>
        <div class="nv-guide-legend-grid">
          ${guide.badges.map(b => `
            <div class="nv-guide-legend-item">
              <span class="nv-guide-btn-preview nv-guide-btn-preview--${_esc(b.tone || 'neutral')}">${_esc(b.label)}</span>
              <span>${_esc(_t(b.meaning))}</span>
            </div>
          `).join('')}
        </div>
      </section>
    ` : ''}

    <!-- Quick Jump Links -->
    ${related.length > 0 ? `
      <section class="nv-guide-section">
        <div class="nv-guide-section__heading">
          <span class="icon">shortcut</span>
          ${_esc(ui.goToHeading)}
        </div>
        <div class="nv-guide-related-pills">
          ${related.map(r => `
            <button type="button" class="nv-guide-jump-pill" data-guide-jump-route="${_esc(r.route)}">
              <span class="icon" style="font-size: 14px;">arrow_forward</span>
              ${_esc(r.label)}
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
