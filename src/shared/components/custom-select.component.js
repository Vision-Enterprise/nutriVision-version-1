/**
 * Custom Downward Select Enhancer
 *
 * Replaces native <select> popups (which flip upwards on Windows/WebView2 when
 * near the bottom or with long lists) with a portal-rendered, scrollable
 * downward menu while keeping the underlying <select> synced for all existing
 * .value reads/writes, form resets, and 'change' listeners.
 */

let _openMenu = null;
let _openSelect = null;
let _openTrigger = null;
let _globalObserver = null;
let _boundGlobalClose = false;

function _closeOpenMenu() {
  if (_openMenu) {
    _openMenu.remove();
    _openMenu = null;
  }
  if (_openTrigger) {
    _openTrigger.setAttribute('aria-expanded', 'false');
    _openTrigger.classList.remove('is-open');
  }
  _openSelect = null;
  _openTrigger = null;
}

function _positionMenu(trigger, menu) {
  const rect = trigger.getBoundingClientRect();
  const minWidth = Math.max(rect.width, 160);
  const maxWidth = Math.min(Math.max(minWidth, 260), window.innerWidth - 16);
  const width = Math.min(Math.max(rect.width, minWidth), maxWidth);
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
  const top = rect.bottom + 4;
  const availableBelow = window.innerHeight - top - 10;
  const maxHeight = Math.min(250, Math.max(120, availableBelow));

  menu.style.top = `${Math.round(top)}px`;
  menu.style.left = `${Math.round(left)}px`;
  menu.style.width = `${Math.round(rect.width)}px`;
  menu.style.minWidth = `${Math.round(width)}px`;
  menu.style.maxHeight = `${Math.round(maxHeight)}px`;
}

function _openMenuFor(select, trigger) {
  if (select.disabled) return;

  if (_openSelect === select) {
    _closeOpenMenu();
    return;
  }

  _closeOpenMenu();

  const menu = document.createElement('div');
  menu.className = 'nv-select__menu';
  menu.setAttribute('role', 'listbox');

  const currentValue = select.value;
  const options = Array.from(select.options);

  options.forEach((opt, idx) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'nv-select__option';
    item.setAttribute('role', 'option');
    item.dataset.value = opt.value;
    item.dataset.index = String(idx);
    item.textContent = opt.textContent;

    const isSelected = opt.value === currentValue && opt.selected;
    if (isSelected) {
      item.classList.add('is-selected');
      item.setAttribute('aria-selected', 'true');
    } else {
      item.setAttribute('aria-selected', 'false');
    }

    if (opt.disabled) {
      item.disabled = true;
      item.classList.add('is-disabled');
    }

    item.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      if (opt.disabled) return;

      const changed = select.value !== opt.value;
      select.value = opt.value;
      _closeOpenMenu();
      trigger.focus();

      if (changed) {
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    menu.appendChild(item);
  });

  document.body.appendChild(menu);
  _positionMenu(trigger, menu);

  trigger.setAttribute('aria-expanded', 'true');
  trigger.classList.add('is-open');

  _openMenu = menu;
  _openSelect = select;
  _openTrigger = trigger;

  const selectedEl = menu.querySelector('.nv-select__option.is-selected');
  if (selectedEl) {
    selectedEl.scrollIntoView({ block: 'nearest' });
  }
}

function _bindGlobalListeners() {
  if (_boundGlobalClose) return;
  _boundGlobalClose = true;

  document.addEventListener('pointerdown', e => {
    if (!_openMenu) return;
    if (_openMenu.contains(e.target) || _openTrigger?.contains(e.target)) return;
    _closeOpenMenu();
  }, true);

  document.addEventListener('keydown', e => {
    if (!_openMenu) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      const t = _openTrigger;
      _closeOpenMenu();
      t?.focus();
    }
  });

  window.addEventListener('scroll', e => {
    if (!_openMenu) return;
    if (e.target === _openMenu || _openMenu.contains(e.target)) return;
    _closeOpenMenu();
  }, true);

  window.addEventListener('resize', () => {
    if (_openMenu && _openTrigger) {
      _positionMenu(_openTrigger, _openMenu);
    }
  });
}

export function enhanceSelect(select) {
  if (!select || !(select instanceof HTMLSelectElement)) return;
  if (select.dataset.nvSelectInit === '1') return;
  if (select.dataset.nativeSelect === 'true') return;
  if (select.multiple || (select.size && select.size > 1)) return;
  if (select.closest('.nv-select')) return;

  select.dataset.nvSelectInit = '1';

  const wrapper = document.createElement('div');
  wrapper.className = 'nv-select';

  // Mirror layout sizing from the original select onto the wrapper
  if (select.style.flex) wrapper.style.flex = select.style.flex;
  if (select.style.width) wrapper.style.width = select.style.width;
  if (select.style.minWidth) wrapper.style.minWidth = select.style.minWidth;
  if (select.style.maxWidth) wrapper.style.maxWidth = select.style.maxWidth;
  if (select.classList.contains('form-select') && !select.style.width) {
    wrapper.style.width = '100%';
  }
  if (select.classList.contains('grid-cell-select') && !select.style.width) {
    wrapper.style.width = '100%';
  }

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'nv-select__trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');

  const labelSpan = document.createElement('span');
  labelSpan.className = 'nv-select__label';

  const chevron = document.createElement('span');
  chevron.className = 'nv-select__chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

  trigger.appendChild(labelSpan);
  trigger.appendChild(chevron);

  // Preserve accessible label attributes
  const ariaLabel = select.getAttribute('aria-label');
  if (ariaLabel) trigger.setAttribute('aria-label', ariaLabel);

  const syncTrigger = () => {
    const selectedOpt = select.options[select.selectedIndex] || select.options[0];
    const text = selectedOpt ? selectedOpt.textContent : '';
    labelSpan.textContent = text;

    const isPlaceholder = !select.value;
    trigger.classList.toggle('is-placeholder', isPlaceholder);
    trigger.disabled = Boolean(select.disabled);

    const hasErr =
      select.classList.contains('form-select--error') ||
      select.classList.contains('form-input--error');
    trigger.classList.toggle('is-error', hasErr);

    const isSm = select.classList.contains('form-input--sm') || select.classList.contains('form-select--sm');
    trigger.classList.toggle('is-sm', isSm);

    const isGridCell = select.classList.contains('grid-cell-select');
    trigger.classList.toggle('is-grid-cell', isGridCell);
  };

  // Insert wrapper in DOM and move select inside
  const parent = select.parentNode;
  if (!parent) return;
  parent.insertBefore(wrapper, select);
  wrapper.appendChild(select);
  wrapper.appendChild(trigger);

  select.classList.add('nv-select-native');
  select.tabIndex = -1;

  // Hook .value and .selectedIndex so programmatic updates refresh the trigger
  const valueDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  if (valueDesc) {
    Object.defineProperty(select, 'value', {
      configurable: true,
      get() {
        return valueDesc.get.call(this);
      },
      set(val) {
        valueDesc.set.call(this, val);
        syncTrigger();
      },
    });
  }

  const idxDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex');
  if (idxDesc) {
    Object.defineProperty(select, 'selectedIndex', {
      configurable: true,
      get() {
        return idxDesc.get.call(this);
      },
      set(val) {
        idxDesc.set.call(this, val);
        syncTrigger();
      },
    });
  }

  trigger.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    _openMenuFor(select, trigger);
  });

  select.addEventListener('change', syncTrigger);

  if (select.form) {
    select.form.addEventListener('reset', () => {
      setTimeout(syncTrigger, 0);
    });
  }

  // Watch option list & attribute mutations on the native select
  const selectObserver = new MutationObserver(() => {
    syncTrigger();
  });
  selectObserver.observe(select, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'disabled'],
  });

  syncTrigger();
}

export function enhanceAllSelects(root = document) {
  if (!root?.querySelectorAll) return;
  root.querySelectorAll('select').forEach(enhanceSelect);
}

export function initCustomSelects() {
  _bindGlobalListeners();
  enhanceAllSelects(document);

  if (_globalObserver) return;
  _globalObserver = new MutationObserver(mutations => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.tagName === 'SELECT') {
          enhanceSelect(node);
        } else if (node.querySelectorAll) {
          enhanceAllSelects(node);
        }
      }
    }
  });

  _globalObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
