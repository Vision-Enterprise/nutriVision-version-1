/**
 * Calendar - Modals (Interactions)
 *
 * Dedicated modal handlers for:
 *   - Event Details Modal (delivery, expiration, custom event inspection, edit & delete)
 *   - Add / Edit Program Event Modal (offline-ready custom event creation & Person in Charge assignment)
 */

import {
  renderDeliveryDetailBody,
  renderExpirationDetailBody,
  renderCustomEventDetailBody,
  escapeHtml,
} from './calendar.render.js';
import {
  createCustomEvent,
  updateCustomEvent,
  deleteCustomEvent,
  fetchStaffSuggestions,
} from './calendar.service.js';
import { getLocalDateString } from '../../shared/utils/date.utils.js';
import { SystemDialog } from '../../shared/components/dialog.component.js';

async function _populateStaffSuggestions(profile) {
  const select = document.getElementById('cal-field-pic');
  if (!select) return;
  const names = await fetchStaffSuggestions(profile);
  const currentVal = select.value;
  const ownName = String(profile?.full_name ?? '').trim();

  let html = '<option value="">Select Person in Charge...</option>';
  names.forEach(name => {
    const isYou = ownName && name.toLowerCase() === ownName.toLowerCase();
    const label = isYou ? `${escapeHtml(name)} (You)` : escapeHtml(name);
    html += `<option value="${escapeHtml(name)}">${label}</option>`;
  });
  html += '<option value="__custom__">+ Other / Enter Custom Name (BNS, Focal Person)...</option>';

  select.innerHTML = html;

  if (currentVal) {
    select.value = currentVal;
  }
}

function _clearFormValidation() {
  ['cal-field-title', 'cal-field-pic', 'cal-field-pic-custom', 'cal-field-date'].forEach(id => {
    const el = document.getElementById(id);
    el?.classList.remove('form-input--error', 'form-select--error');
  });
  ['cal-error-title', 'cal-error-pic', 'cal-error-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

function _setFieldError(inputId, errorId, message) {
  const el = document.getElementById(inputId);
  if (el) {
    if (el.tagName === 'SELECT') {
      el.classList.add('form-select--error');
    } else {
      el.classList.add('form-input--error');
    }
  }
  const errEl = document.getElementById(errorId);
  if (errEl) errEl.textContent = message;
}

export function showDetailModal(info, calendarRef, profile) {
  const { type, batch, event: customEv } = info.event.extendedProps;
  let body = '';

  if (type === 'delivery') {
    body = renderDeliveryDetailBody(batch);
  } else if (type === 'expiration') {
    body = renderExpirationDetailBody(batch);
  } else if (customEv) {
    body = renderCustomEventDetailBody(customEv);
  }

  const overlay = document.getElementById('cal-modal-overlay');
  if (!overlay) return;

  let modalTitle = 'Event Details';
  if (type === 'delivery' || type === 'expiration') {
    modalTitle = batch.commodities?.name || 'Batch';
  } else if (customEv) {
    modalTitle = customEv.title;
  }

  const titleEl = document.getElementById('cal-modal-header-title');
  if (titleEl) titleEl.textContent = modalTitle;

  const bodyEl = document.getElementById('cal-modal-body');
  if (bodyEl) bodyEl.innerHTML = body;

  overlay.style.display = 'flex';

  const editBtn = document.getElementById('cal-edit-event-btn');
  if (editBtn && customEv) {
    editBtn.addEventListener('click', () => {
      overlay.style.display = 'none';
      openEventFormModal({ mode: 'edit', event: customEv, profile });
    });
  }

  const delBtn = document.getElementById('cal-delete-event-btn');
  if (delBtn && customEv) {
    delBtn.addEventListener('click', async () => {
      const confirmed = await SystemDialog.confirm(
        `Delete program event "${customEv.title}"? This action will remove it from the Program Calendar.`,
        'Delete Program Event',
        'Delete Event',
        true
      );
      if (!confirmed) return;

      delBtn.disabled = true;
      await deleteCustomEvent(delBtn.dataset.id);
      overlay.style.display = 'none';
      calendarRef?.refetchEvents();
    });
  }
}

export async function openEventFormModal({ mode = 'add', event = null, profile = null } = {}) {
  const overlay = document.getElementById('cal-add-overlay');
  if (!overlay) return;

  _clearFormValidation();
  await _populateStaffSuggestions(profile);

  const isEdit = mode === 'edit' && Boolean(event?.id);

  const modalTitle = document.getElementById('cal-form-modal-title');
  if (modalTitle) {
    modalTitle.textContent = isEdit ? 'Edit Program Event' : 'Add Program Event';
  }

  const submitBtn = document.getElementById('cal-add-submit');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = isEdit ? 'Update Event' : 'Save Event';
  }

  const form = document.getElementById('cal-add-form');
  if (form) form.reset();

  const idInput       = document.getElementById('cal-field-id');
  const titleInput    = document.getElementById('cal-field-title');
  const picSelect     = document.getElementById('cal-field-pic');
  const picCustomWrap = document.getElementById('cal-field-pic-custom-wrap');
  const picCustomInp  = document.getElementById('cal-field-pic-custom');
  const dateInput     = document.getElementById('cal-field-date');
  const timeInput     = document.getElementById('cal-field-time');
  const descInput     = document.getElementById('cal-field-desc');

  if (idInput)       idInput.value       = isEdit ? event.id : '';
  if (titleInput)    titleInput.value    = isEdit ? (event.title || '') : '';
  if (dateInput)     dateInput.value     = isEdit ? (event.start_date || getLocalDateString()) : getLocalDateString();
  if (timeInput)     timeInput.value     = isEdit ? (event.start_time ? String(event.start_time).slice(0, 5) : '') : '';
  if (descInput)     descInput.value     = isEdit ? (event.description || '') : '';

  const targetPic = isEdit ? String(event.person_in_charge || '').trim() : '';
  if (picSelect) {
    if (!targetPic) {
      picSelect.value = '';
      if (picCustomWrap) picCustomWrap.style.display = 'none';
      if (picCustomInp)  picCustomInp.value = '';
    } else {
      let matchedOption = false;
      for (const opt of picSelect.options) {
        if (opt.value && opt.value.toLowerCase() === targetPic.toLowerCase()) {
          picSelect.value = opt.value;
          matchedOption = true;
          break;
        }
      }
      if (matchedOption) {
        if (picCustomWrap) picCustomWrap.style.display = 'none';
        if (picCustomInp)  picCustomInp.value = '';
      } else {
        picSelect.value = '__custom__';
        if (picCustomWrap) picCustomWrap.style.display = 'block';
        if (picCustomInp)  picCustomInp.value = targetPic;
      }
    }
  }

  overlay.style.display = 'flex';
  setTimeout(() => {
    if (isEdit && !targetPic) {
      picSelect?.focus();
    } else {
      titleInput?.focus();
    }
  }, 30);
}

export function showAddEventModal(profile = null) {
  openEventFormModal({ mode: 'add', profile });
}

export function attachModalListeners(calendarRef, profile) {
  _populateStaffSuggestions(profile);

  // Detail modal close
  document.getElementById('cal-modal-close')?.addEventListener('click', () => {
    document.getElementById('cal-modal-overlay').style.display = 'none';
  });
  document.getElementById('cal-modal-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
  });

  // Add event open & close
  document.getElementById('cal-add-btn')?.addEventListener('click', () => {
    openEventFormModal({ mode: 'add', profile });
  });
  document.getElementById('cal-add-modal-close')?.addEventListener('click', () => {
    document.getElementById('cal-add-overlay').style.display = 'none';
  });
  document.getElementById('cal-add-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
  });
  document.getElementById('cal-add-cancel')?.addEventListener('click', () => {
    document.getElementById('cal-add-overlay').style.display = 'none';
  });

  // Person in Charge dropdown change
  const picSelect = document.getElementById('cal-field-pic');
  const picCustomWrap = document.getElementById('cal-field-pic-custom-wrap');
  const picCustomInp = document.getElementById('cal-field-pic-custom');

  picSelect?.addEventListener('change', () => {
    picSelect.classList.remove('form-select--error', 'form-input--error');
    const errEl = document.getElementById('cal-error-pic');
    if (errEl) errEl.textContent = '';

    if (picSelect.value === '__custom__') {
      if (picCustomWrap) picCustomWrap.style.display = 'block';
      picCustomInp?.focus();
    } else {
      if (picCustomWrap) picCustomWrap.style.display = 'none';
      if (picCustomInp)  picCustomInp.value = '';
    }
  });

  picCustomInp?.addEventListener('input', () => {
    picCustomInp.classList.remove('form-input--error');
    const errEl = document.getElementById('cal-error-pic');
    if (errEl) errEl.textContent = '';
  });

  // Quick-fill current user into Person in Charge
  document.getElementById('cal-assign-me-btn')?.addEventListener('click', () => {
    const select = document.getElementById('cal-field-pic');
    const customWrap = document.getElementById('cal-field-pic-custom-wrap');
    const customInp = document.getElementById('cal-field-pic-custom');
    if (!select || !profile?.full_name) return;

    const myName = profile.full_name.trim();
    let found = false;
    for (const opt of select.options) {
      if (opt.value && opt.value.toLowerCase() === myName.toLowerCase()) {
        select.value = opt.value;
        found = true;
        break;
      }
    }

    if (!found) {
      const newOpt = document.createElement('option');
      newOpt.value = myName;
      newOpt.textContent = `${myName} (You)`;
      const customOpt = select.querySelector('option[value="__custom__"]');
      if (customOpt) {
        select.insertBefore(newOpt, customOpt);
      } else {
        select.appendChild(newOpt);
      }
      select.value = myName;
    }

    if (customWrap) customWrap.style.display = 'none';
    if (customInp)  customInp.value = '';
    select.classList.remove('form-select--error', 'form-input--error');
    const errEl = document.getElementById('cal-error-pic');
    if (errEl) errEl.textContent = '';
    select.focus();
  });

  // Clear field errors on typing
  [
    ['cal-field-title',      'cal-error-title'],
    ['cal-field-pic-custom', 'cal-error-pic'],
    ['cal-field-date',       'cal-error-date'],
  ].forEach(([inputId, errId]) => {
    document.getElementById(inputId)?.addEventListener('input', () => {
      document.getElementById(inputId)?.classList.remove('form-input--error');
      const errEl = document.getElementById(errId);
      if (errEl) errEl.textContent = '';
    });
  });

  // Add / Edit event form submission
  document.getElementById('cal-add-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    _clearFormValidation();

    const eventId       = document.getElementById('cal-field-id')?.value.trim() || '';
    const title         = document.getElementById('cal-field-title')?.value.trim() || '';
    const selectVal     = document.getElementById('cal-field-pic')?.value || '';
    const customInp     = document.getElementById('cal-field-pic-custom');
    const startDate     = document.getElementById('cal-field-date')?.value || '';
    const startTime     = document.getElementById('cal-field-time')?.value || null;
    const desc          = document.getElementById('cal-field-desc')?.value.trim() || null;

    let pic = '';
    let hasError = false;

    if (!title) {
      _setFieldError('cal-field-title', 'cal-error-title', 'Event title is required.');
      hasError = true;
    }

    if (selectVal === '__custom__') {
      pic = customInp?.value.trim() || '';
      if (!pic) {
        _setFieldError('cal-field-pic-custom', 'cal-error-pic', 'Please enter the external coordinator or BNS name.');
        hasError = true;
      }
    } else {
      pic = selectVal.trim();
      if (!pic) {
        _setFieldError('cal-field-pic', 'cal-error-pic', 'Please select a Person in Charge.');
        hasError = true;
      }
    }

    if (!startDate) {
      _setFieldError('cal-field-date', 'cal-error-date', 'Event date is required.');
      hasError = true;
    }

    if (hasError) return;

    const btn = document.getElementById('cal-add-submit');
    const isEdit = Boolean(eventId);
    if (btn) {
      btn.disabled = true;
      btn.textContent = isEdit ? 'Updating...' : 'Saving...';
    }

    const payload = {
      title,
      person_in_charge: pic,
      start_date:       startDate,
      start_time:       startTime,
      description:      desc,
    };

    if (isEdit) {
      await updateCustomEvent(eventId, payload);
    } else {
      await createCustomEvent(payload, profile.id);
    }

    document.getElementById('cal-add-overlay').style.display = 'none';
    if (btn) {
      btn.disabled = false;
      btn.textContent = isEdit ? 'Update Event' : 'Save Event';
    }
    await _populateStaffSuggestions(profile);
    calendarRef?.refetchEvents();
  });
}
