/**
 * Calendar - Modals (Interactions)
 *
 * Dedicated modal handlers for:
 *   - Event Details Modal (delivery, expiration, custom event inspection & delete)
 *   - Add Program Event Modal (offline-ready custom event creation)
 */

import {
  renderDeliveryDetailBody,
  renderExpirationDetailBody,
  renderCustomEventDetailBody,
} from './calendar.render.js';
import { createCustomEvent, deleteCustomEvent } from './calendar.service.js';

export function showDetailModal(info, calendarRef) {
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

  const delBtn = document.getElementById('cal-delete-event-btn');
  if (delBtn) {
    delBtn.addEventListener('click', async () => {
      await deleteCustomEvent(delBtn.dataset.id);
      overlay.style.display = 'none';
      calendarRef?.refetchEvents();
    });
  }
}

export function showAddEventModal() {
  const overlay = document.getElementById('cal-add-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';

  const form = document.getElementById('cal-add-form');
  if (form) {
    form.reset();
    const dateInput = form.querySelector('#cal-field-date');
    if (dateInput) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }
  }
}

export function attachModalListeners(calendarRef, profile) {
  // Detail modal close
  document.getElementById('cal-modal-close')?.addEventListener('click', () => {
    document.getElementById('cal-modal-overlay').style.display = 'none';
  });
  document.getElementById('cal-modal-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
  });

  // Add event open & close
  document.getElementById('cal-add-btn')?.addEventListener('click', showAddEventModal);
  document.getElementById('cal-add-modal-close')?.addEventListener('click', () => {
    document.getElementById('cal-add-overlay').style.display = 'none';
  });
  document.getElementById('cal-add-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
  });
  document.getElementById('cal-add-cancel')?.addEventListener('click', () => {
    document.getElementById('cal-add-overlay').style.display = 'none';
  });

  // Add event form submission
  document.getElementById('cal-add-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('cal-add-submit');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving...';
    }

    await createCustomEvent({
      title:       document.getElementById('cal-field-title').value.trim(),
      start_date:  document.getElementById('cal-field-date').value,
      start_time:  document.getElementById('cal-field-time').value || null,
      description: document.getElementById('cal-field-desc').value.trim() || null,
    }, profile.id);

    document.getElementById('cal-add-overlay').style.display = 'none';
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Save Event';
    }
    calendarRef?.refetchEvents();
  });
}
