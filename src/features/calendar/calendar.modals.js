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
  const datalist = document.getElementById('cal-staff-suggestions');
  if (!datalist) return;
  const names = await fetchStaffSuggestions(profile);
  datalist.innerHTML = names
    .map(name => `<option value="${escapeHtml(name)}"></option>`)
    .join('');
}

function _clearFormValidation() {
  ['cal-field-title', 'cal-field-pic', 'cal-field-date'].forEach(id => {
    document.getElementById(id)?.classList.remove('form-input--error');
  });
  ['cal-error-title', 'cal-error-pic', 'cal-error-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

function _setFieldError(inputId, errorId, message) {
  document.getElementById(inputId)?.classList.add('form-input--error');
  const el = document.getElementById(errorId);
  if (el) el.textContent = message;
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

export function openEventFormModal({ mode = 'add', event = null, profile = null } = {}) {
  const overlay = document.getElementById('cal-add-overlay');
  if (!overlay) return;

  _clearFormValidation();
  _populateStaffSuggestions(profile);

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

  const idInput    = document.getElementById('cal-field-id');
  const titleInput = document.getElementById('cal-field-title');
  const picInput   = document.getElementById('cal-field-pic');
  const dateInput  = document.getElementById('cal-field-date');
  const timeInput  = document.getElementById('cal-field-time');
  const descInput  = document.getElementById('cal-field-desc');

  if (idInput)    idInput.value    = isEdit ? event.id : '';
  if (titleInput) titleInput.value = isEdit ? (event.title || '') : '';
  if (picInput)   picInput.value   = isEdit ? (event.person_in_charge || '') : '';
  if (dateInput)  dateInput.value  = isEdit ? (event.start_date || getLocalDateString()) : getLocalDateString();
  if (timeInput)  timeInput.value  = isEdit ? (event.start_time ? String(event.start_time).slice(0, 5) : '') : '';
  if (descInput)  descInput.value  = isEdit ? (event.description || '') : '';

  overlay.style.display = 'flex';
  setTimeout(() => {
    if (isEdit && !event.person_in_charge) {
      picInput?.focus();
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

  // Quick-fill current user into Person in Charge
  document.getElementById('cal-assign-me-btn')?.addEventListener('click', () => {
    const picInput = document.getElementById('cal-field-pic');
    if (picInput && profile?.full_name) {
      picInput.value = profile.full_name;
      picInput.classList.remove('form-input--error');
      const errEl = document.getElementById('cal-error-pic');
      if (errEl) errEl.textContent = '';
      picInput.focus();
    }
  });

  // Clear field errors on typing
  [
    ['cal-field-title', 'cal-error-title'],
    ['cal-field-pic',   'cal-error-pic'],
    ['cal-field-date',  'cal-error-date'],
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

    const eventId    = document.getElementById('cal-field-id')?.value.trim() || '';
    const title      = document.getElementById('cal-field-title')?.value.trim() || '';
    const pic        = document.getElementById('cal-field-pic')?.value.trim() || '';
    const startDate  = document.getElementById('cal-field-date')?.value || '';
    const startTime  = document.getElementById('cal-field-time')?.value || null;
    const desc       = document.getElementById('cal-field-desc')?.value.trim() || null;

    let hasError = false;
    if (!title) {
      _setFieldError('cal-field-title', 'cal-error-title', 'Event title is required.');
      hasError = true;
    }
    if (!pic) {
      _setFieldError('cal-field-pic', 'cal-error-pic', 'Person in Charge is required.');
      hasError = true;
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
