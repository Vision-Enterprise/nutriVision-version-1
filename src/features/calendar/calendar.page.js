/**
 * Calendar Page — NutriVision Program Calendar
 *
 * Uses FullCalendar v6 (CDN) to render an interactive office-wide planner.
 * Data sources:
 *   - Batch delivery dates -> blue events (read from Supabase)
 *   - Batch expiration dates -> color-coded by threshold (read from Supabase)
 *   - Custom events -> from calendar.service.js (offline-first)
 */

import { supabase }              from '../../core/supabase.js';
import { EXPIRATION_THRESHOLDS } from '../../shared/constants/app.constants.js';
import {
  syncFromSupabase,
  syncPendingWrites,
  fetchCustomEvents,
  createCustomEvent,
  deleteCustomEvent,
  subscribeToCalendarEvents,
} from './calendar.service.js';

let _calendar     = null;
let _profile      = null;
let _realtimeSub  = null;
let _onlineHandler = null;

// ─── Expiration Helpers ─────────────────────────────────────────────────────

function getExpColor(dateStr) {
  if (!dateStr) return null;
  const diff = (new Date(dateStr) - new Date()) / 86400000;
  if (diff <= 0)                                return { bg: 'var(--color-exp-expired)',   border: '#991b1b' };
  if (diff <= EXPIRATION_THRESHOLDS.NEAR_EXPIRY_DAYS) return { bg: 'var(--color-exp-near)',      border: '#92400e' };
  if (diff <= EXPIRATION_THRESHOLDS.GOOD_DAYS)        return { bg: 'var(--color-exp-moderate)',  border: '#1e40af' };
  return                                              { bg: 'var(--color-exp-good)',    border: '#065f46' };
}

// ─── FullCalendar CDN Loader ────────────────────────────────────────────────

function loadFullCalendar() {
  if (window.FullCalendar) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.js';
    script.onload  = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ─── Event Loader (for FullCalendar callback) ───────────────────────────────

async function loadAllEvents(info, successCb, failCb) {
  try {
    const start = info.startStr.split('T')[0];
    const end   = info.endStr.split('T')[0];

    // 1. Batch events from Supabase
    const { data: batches } = await supabase
      .from('batches')
      .select('id, batch_number, quantity, delivery_date, expiration_date, supplier, commodities(name, unit)')
      .is('deleted_at', null)
      .or(`delivery_date.gte.${start},expiration_date.gte.${start}`)
      .lte('delivery_date', end);

    const batchEvents = [];
    (batches || []).forEach(b => {
      const name = b.commodities?.name || 'Unknown';
      if (b.delivery_date) {
        batchEvents.push({
          id:               `del-${b.id}`,
          title:            name,
          start:            b.delivery_date,
          allDay:           true,
          backgroundColor:  '#1565C0',
          borderColor:      '#0d47a1',
          textColor:        '#fff',
          extendedProps:    { type: 'delivery', batch: b },
        });
      }
      if (b.expiration_date) {
        const col = getExpColor(b.expiration_date);
        batchEvents.push({
          id:               `exp-${b.id}`,
          title:            name,
          start:            b.expiration_date,
          allDay:           true,
          backgroundColor:  col.bg,
          borderColor:      col.border,
          textColor:        '#fff',
          extendedProps:    { type: 'expiration', batch: b },
        });
      }
    });

    // 2. Custom events from IndexedDB
    const custom = await fetchCustomEvents();
    const customEvents = custom
      .filter(e => e.start_date >= start && e.start_date <= end)
      .map(e => ({
        id:               `custom-${e.id}`,
        title:            e.title,
        start:            e.start_time ? `${e.start_date}T${e.start_time}` : e.start_date,
        end:              e.end_date || null,
        allDay:           !e.start_time,
        backgroundColor:  '#7C3AED',
        borderColor:      '#5b21b6',
        textColor:        '#fff',
        extendedProps:    { type: 'custom', event: e },
      }));

    successCb([...batchEvents, ...customEvents]);
  } catch (err) {
    console.error('[Calendar] Event load error:', err);
    failCb(err);
  }
}

// ─── Modals ─────────────────────────────────────────────────────────────────

function showDetailModal(info) {
  const { type, batch, event: customEv } = info.event.extendedProps;
  let body = '';

  if (type === 'delivery') {
    const b = batch;
    body = `
      <div class="cal-modal-badge cal-badge-delivery" style="width: max-content;"><span class="icon icon--sm">local_shipping</span> Delivery</div>
      <div class="cal-modal-grid">
        <span class="cal-modal-label">Batch Code</span><span>${b.batch_number || '—'}</span>
        <span class="cal-modal-label">Quantity</span><span>${b.quantity} ${b.commodities?.unit || ''}</span>
        <span class="cal-modal-label">Delivery Date</span><span>${b.delivery_date}</span>
        <span class="cal-modal-label">Supplier</span><span>${b.supplier || '—'}</span>
      </div>`;
  } else if (type === 'expiration') {
    const b = batch;
    const diff = Math.ceil((new Date(b.expiration_date) - new Date()) / 86400000);
    const status = diff <= 0 ? 'Expired' : diff <= 90 ? 'Near Expiry' : diff <= 180 ? 'Moderate' : 'Good';
    body = `
      <div class="cal-modal-badge cal-badge-exp" style="width: max-content;"><span class="icon icon--sm">warning</span> Expiration</div>
      <div class="cal-modal-grid">
        <span class="cal-modal-label">Batch Code</span><span>${b.batch_number || '—'}</span>
        <span class="cal-modal-label">Quantity</span><span>${b.quantity} ${b.commodities?.unit || ''}</span>
        <span class="cal-modal-label">Expiration Date</span><span>${b.expiration_date}</span>
        <span class="cal-modal-label">Status</span><span class="cal-exp-status">${status} (${diff > 0 ? diff + ' days left' : 'Expired'})</span>
        <span class="cal-modal-label">Supplier</span><span>${b.supplier || '—'}</span>
      </div>`;
  } else if (customEv) {
    body = `
      <div class="cal-modal-badge cal-badge-custom" style="width: max-content;"><span class="icon icon--sm">event</span> Program Event</div>
      <div class="cal-modal-grid">
        <span class="cal-modal-label">Date</span><span>${customEv.start_date}</span>
        ${customEv.start_time ? `<span class="cal-modal-label">Time</span><span>${customEv.start_time}</span>` : ''}
        ${customEv.description ? `<span class="cal-modal-label">Notes</span><span>${customEv.description}</span>` : ''}
      </div>
      <button id="cal-delete-event-btn" class="cal-btn-danger" data-id="${customEv.id}">Delete Event</button>`;
  }

  const overlay = document.getElementById('cal-modal-overlay');
  
  let modalTitle = 'Event Details';
  if (type === 'delivery' || type === 'expiration') modalTitle = batch.commodities?.name || 'Batch';
  else if (customEv) modalTitle = customEv.title;
  document.getElementById('cal-modal-header-title').textContent = modalTitle;
  
  document.getElementById('cal-modal-body').innerHTML = body;
  overlay.style.display = 'flex';

  const delBtn = document.getElementById('cal-delete-event-btn');
  if (delBtn) {
    delBtn.addEventListener('click', async () => {
      await deleteCustomEvent(delBtn.dataset.id);
      overlay.style.display = 'none';
      _calendar.refetchEvents();
    });
  }
}

function showAddEventModal() {
  const overlay = document.getElementById('cal-add-overlay');
  overlay.style.display = 'flex';
  const form = document.getElementById('cal-add-form');
  form.reset();
  // Default date to today
  form.querySelector('#cal-field-date').value = new Date().toISOString().split('T')[0];
}

// ─── Page Renderer ───────────────────────────────────────────────────────────

export async function renderCalendarPage(profile) {
  _profile = profile;

  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="cal-page" id="cal-page">
      <!-- Offline Banner -->
      <div class="cal-offline-banner" id="cal-offline-banner" style="display:none;">
        <span class="icon icon--sm" style="font-size:16px;">wifi_off</span>
        You're offline — changes are saved locally and will sync when you're back online.
      </div>

      <!-- Toolbar -->
      <div class="cal-toolbar">
        <div class="cal-legend">
          <span class="cal-chip cal-chip-delivery"><span class="icon icon--sm">local_shipping</span> Delivery</span>
          <span class="cal-chip cal-chip-good"><span class="icon icon--sm">check_circle</span> Good (&gt;180d)</span>
          <span class="cal-chip cal-chip-moderate"><span class="icon icon--sm">info</span> Moderate (&gt;90d)</span>
          <span class="cal-chip cal-chip-near"><span class="icon icon--sm">warning</span> Near Expiry</span>
          <span class="cal-chip cal-chip-expired"><span class="icon icon--sm">error</span> Expired</span>
          <span class="cal-chip cal-chip-custom"><span class="icon icon--sm">event</span> Program Event</span>
        </div>
        <button class="btn btn-primary" id="cal-add-btn" type="button">
          + Add Event
        </button>
      </div>

      <!-- Calendar Mount -->
      <div class="cal-wrapper card">
        <div id="cal-mount"></div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div class="modal-overlay" id="cal-modal-overlay" style="display: none;">
      <div class="modal" role="dialog" aria-modal="true" style="max-width: 520px; width: 100%;">
        <div class="modal-header">
          <h2 class="modal-title" id="cal-modal-header-title">Event Details</h2>
          <button class="modal-close" id="cal-modal-close" type="button" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body" id="cal-modal-body" style="display: flex; flex-direction: column; gap: var(--space-4);"></div>
      </div>
    </div>

    <!-- Add Event Modal -->
    <div class="modal-overlay" id="cal-add-overlay" style="display: none;">
      <div class="modal" role="dialog" aria-modal="true" style="max-width: 520px; width: 100%;">
        <div class="modal-header">
          <h2 class="modal-title">Add Program Event</h2>
          <button class="modal-close" id="cal-add-modal-close" type="button" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <form id="cal-add-form" novalidate>
          <div class="modal-body" style="display: flex; flex-direction: column; gap: var(--space-4);">
            <div class="form-group">
              <label class="form-label form-label--required" for="cal-field-title">Event Title</label>
              <input id="cal-field-title" class="form-input" type="text" required placeholder="e.g. Vitamin Distribution Day" />
            </div>

            <div class="form-group">
              <label class="form-label form-label--required" for="cal-field-date">Date</label>
              <input id="cal-field-date" class="form-input" type="date" required />
            </div>

            <div class="form-group">
              <label class="form-label" for="cal-field-time">Time <span style="color: var(--color-text-muted); font-weight: normal;">(optional)</span></label>
              <input id="cal-field-time" class="form-input" type="time" />
            </div>

            <div class="form-group">
              <label class="form-label" for="cal-field-desc">Description / Notes <span style="color: var(--color-text-muted); font-weight: normal;">(optional)</span></label>
              <textarea id="cal-field-desc" class="form-input" rows="3" placeholder="Meeting agenda, location..." style="resize: vertical;"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-ghost" id="cal-add-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary" id="cal-add-submit">Save Event</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Import and inject CSS once
  if (!document.getElementById('cal-css')) {
    const link = document.createElement('link');
    link.id   = 'cal-css';
    link.rel  = 'stylesheet';
    link.href = new URL('./calendar.css', import.meta.url).href;
    document.head.appendChild(link);
  }

  // Offline banner
  const banner = document.getElementById('cal-offline-banner');
  const updateBanner = () => {
    banner.style.display = navigator.onLine ? 'none' : 'flex';
  };
  updateBanner();
  window.addEventListener('online',  updateBanner);
  window.addEventListener('offline', updateBanner);

  // Sync on online
  _onlineHandler = async () => {
    await syncPendingWrites();
    await syncFromSupabase();
    _calendar?.refetchEvents();
    updateBanner();
  };
  window.addEventListener('online', _onlineHandler);

  // Pull fresh data from Supabase into IndexedDB
  await syncFromSupabase();

  // Load FullCalendar
  await loadFullCalendar();

  // Init calendar
  const mountEl = document.getElementById('cal-mount');
  if (!mountEl) return;

  _calendar = new FullCalendar.Calendar(mountEl, {
    initialView:     'dayGridMonth',
    initialDate:     new Date(),
    headerToolbar: {
      left:   'prev,next today',
      center: 'title',
      right:  'dayGridMonth,dayGridWeek,listMonth',
    },
    height:          'auto',
    events:          loadAllEvents,
    eventClick:      showDetailModal,
    eventDidMount:   info => {
      info.el.style.cursor = 'pointer';
      info.el.style.borderRadius = 'var(--radius-sm)';
    },
    dayCellDidMount: info => {
      const today = new Date().toISOString().split('T')[0];
      if (info.dateStr === today) {
        info.el.classList.add('fc-today-custom');
      }
    },
  });
  _calendar.render();

  // Event detail modal close
  document.getElementById('cal-modal-close').addEventListener('click', () => {
    document.getElementById('cal-modal-overlay').style.display = 'none';
  });
  document.getElementById('cal-modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
  });

  // Add event button
  document.getElementById('cal-add-btn').addEventListener('click', showAddEventModal);
  document.getElementById('cal-add-modal-close').addEventListener('click', () => {
    document.getElementById('cal-add-overlay').style.display = 'none';
  });
  document.getElementById('cal-add-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
  });
  document.getElementById('cal-add-cancel').addEventListener('click', () => {
    document.getElementById('cal-add-overlay').style.display = 'none';
  });

  // Add event form submit
  document.getElementById('cal-add-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('cal-add-submit');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    await createCustomEvent({
      title:       document.getElementById('cal-field-title').value.trim(),
      start_date:  document.getElementById('cal-field-date').value,
      start_time:  document.getElementById('cal-field-time').value || null,
      description: document.getElementById('cal-field-desc').value.trim() || null,
    }, profile.id);

    document.getElementById('cal-add-overlay').style.display = 'none';
    btn.disabled = false;
    btn.textContent = 'Save Event';
    _calendar.refetchEvents();
  });

  // Realtime subscription — cleanup old one first
  if (_realtimeSub) _realtimeSub.unsubscribe();
  _realtimeSub = subscribeToCalendarEvents(() => {
    _calendar?.refetchEvents();
  });
}
