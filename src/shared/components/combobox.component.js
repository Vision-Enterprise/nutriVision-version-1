/**
 * Creatable Combobox Component
 *
 * Replaces native HTML5 <datalist> with a clean, theme-styled
 * searchable and creatable select dropdown.
 *
 * Supports:
 * - Filtering options as you type
 * - Automatically offering '+ Add "[User Input]" as new ...' when typing new terms
 * - Keyboard navigation (Up/Down/Enter/Escape)
 * - Auto-updating option list in memory
 */

export function setupCreatableCombobox({
  inputEl,
  options = [],
  itemTypeLabel = 'item',
  onSelect = null,
}) {
  if (!inputEl) return null;

  // Track dynamic options list in memory (case-insensitive deduplication)
  const optionList = Array.from(new Set(options.filter(Boolean)));

  // Wrap input if not already wrapped
  let wrapper = inputEl.closest('.creatable-combobox');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'creatable-combobox';
    inputEl.parentNode.insertBefore(wrapper, inputEl);
    wrapper.appendChild(inputEl);
  }

  inputEl.classList.add('creatable-combobox__input');
  inputEl.setAttribute('autocomplete', 'off');

  // Toggle button
  let toggleBtn = wrapper.querySelector('.creatable-combobox__toggle');
  if (!toggleBtn) {
    toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'creatable-combobox__toggle';
    toggleBtn.setAttribute('tabindex', '-1');
    toggleBtn.setAttribute('aria-label', `Toggle ${itemTypeLabel} options`);
    toggleBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    wrapper.appendChild(toggleBtn);
  }

  // Dropdown menu
  let menu = wrapper.querySelector('.creatable-combobox__menu');
  if (!menu) {
    menu = document.createElement('div');
    menu.className = 'creatable-combobox__menu';
    menu.setAttribute('role', 'listbox');
    wrapper.appendChild(menu);
  }

  let highlightedIndex = -1;
  let currentRenderedItems = [];

  function openMenu() {
    renderMenu();
    wrapper.classList.add('is-open');
    wrapper.closest('tr')?.classList.add('has-open-combobox');
  }

  function closeMenu() {
    wrapper.classList.remove('is-open');
    wrapper.closest('tr')?.classList.remove('has-open-combobox');
    highlightedIndex = -1;
  }

  function isOpen() {
    return wrapper.classList.contains('is-open');
  }

  function selectValue(value) {
    const trimmed = (value || '').trim();
    if (!trimmed) return;

    // Check if new and add to optionList
    const exists = optionList.some(opt => opt.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      optionList.push(trimmed);
      optionList.sort((a, b) => a.localeCompare(b));
    }

    inputEl.value = trimmed;
    inputEl.classList.remove('form-input--error');

    // Dispatch native input & change events for reactive form handlers
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));

    if (typeof onSelect === 'function') {
      onSelect(trimmed);
    }

    closeMenu();
  }

  function renderMenu() {
    const query = inputEl.value.trim().toLowerCase();
    menu.innerHTML = '';
    currentRenderedItems = [];

    // Filter matching options
    const filtered = query
      ? optionList.filter(opt => opt.toLowerCase().includes(query))
      : optionList;

    const exactMatch = optionList.some(opt => opt.toLowerCase() === query);

    filtered.forEach((opt) => {
      const isSelected = opt.toLowerCase() === (inputEl.value.trim().toLowerCase());
      const itemEl = document.createElement('div');
      itemEl.className = `creatable-combobox__option ${isSelected ? 'is-selected' : ''}`;
      itemEl.setAttribute('role', 'option');
      itemEl.textContent = opt;

      itemEl.addEventListener('mousedown', (e) => {
        e.preventDefault(); // prevent blur before click
        selectValue(opt);
      });

      menu.appendChild(itemEl);
      currentRenderedItems.push({ type: 'option', value: opt, el: itemEl });
    });

    // If typed value is not empty and not an exact match, show "+ Add [query] as new ..."
    if (query && !exactMatch) {
      const addEl = document.createElement('div');
      addEl.className = 'creatable-combobox__option creatable-combobox__option--add';
      addEl.setAttribute('role', 'option');
      addEl.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span>Add <strong>"${inputEl.value.trim()}"</strong> as new ${itemTypeLabel}</span>
      `;

      addEl.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectValue(inputEl.value.trim());
      });

      menu.appendChild(addEl);
      currentRenderedItems.push({ type: 'add', value: inputEl.value.trim(), el: addEl });
    }

    if (currentRenderedItems.length === 0) {
      const emptyEl = document.createElement('div');
      emptyEl.className = 'creatable-combobox__empty';
      emptyEl.textContent = `No ${itemTypeLabel}s found`;
      menu.appendChild(emptyEl);
    }
  }

  function updateHighlight() {
    currentRenderedItems.forEach((item, idx) => {
      if (idx === highlightedIndex) {
        item.el.classList.add('is-highlighted');
        item.el.scrollIntoView({ block: 'nearest' });
      } else {
        item.el.classList.remove('is-highlighted');
      }
    });
  }

  // Input listeners
  inputEl.addEventListener('focus', () => {
    openMenu();
  });

  inputEl.addEventListener('input', () => {
    openMenu();
  });

  inputEl.addEventListener('keydown', (e) => {
    if (!isOpen()) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        openMenu();
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentRenderedItems.length > 0) {
        highlightedIndex = (highlightedIndex + 1) % currentRenderedItems.length;
        updateHighlight();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentRenderedItems.length > 0) {
        highlightedIndex = (highlightedIndex - 1 + currentRenderedItems.length) % currentRenderedItems.length;
        updateHighlight();
      }
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < currentRenderedItems.length) {
        e.preventDefault();
        selectValue(currentRenderedItems[highlightedIndex].value);
      } else if (inputEl.value.trim()) {
        e.preventDefault();
        selectValue(inputEl.value.trim());
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
    }
  });

  // Toggle button click
  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (isOpen()) {
      closeMenu();
    } else {
      inputEl.focus();
      openMenu();
    }
  });

  // Close when clicking outside
  const outsideClickListener = (e) => {
    if (!wrapper.contains(e.target)) {
      closeMenu();
    }
  };
  document.addEventListener('click', outsideClickListener);

  return {
    addOption(val) {
      if (val && !optionList.includes(val)) {
        optionList.push(val);
        optionList.sort();
      }
    },
    destroy() {
      document.removeEventListener('click', outsideClickListener);
    }
  };
}
