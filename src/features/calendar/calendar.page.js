/**
 * Calendar Page (Controller)
 *
 * Coordinates FullCalendar lifecycle, offline sync, Supabase events,
 * and custom IndexedDB events.
 *
 * MVC Controller: delegates layout to .render.js and popups to .modals.js.
 */

import { supabase }              from '../../core/supabase.js';
import { EXPIRATION_THRESHOLDS, RECORD_STATUS } from '../../shared/constants/app.constants.js';
import {
  syncFromSupabase,
  syncPendingWrites,
  fetchCustomEvents,
  subscribeToCalendarEvents,
} from './calendar.service.js';
import { renderCalendarLayout } from './calendar.render.js';
import { showDetailModal, attachModalListeners } from './calendar.modals.js';

let _calendar      = null;
let _profile       = null;
let _realtimeSub   = null;
let _onlineHandler = null;

function getExpColor(dateStr) {
  if (!dateStr) return null;
  const diff = (new Date(dateStr) - new Date()) / 86400000;
  if (diff <= 0)                                return { bg: 'var(--color-exp-expired)',  border: '#991b1b' };
  if (diff <= EXPIRATION_THRESHOLDS.NEAR_EXPIRY_DAYS) return { bg: 'var(--color-exp-near)',     border: '#92400e' };
  if (diff <= EXPIRATION_THRESHOLDS.GOOD_DAYS)        return { bg: 'var(--color-exp-moderate)', border: '#1e40af' };
  return                                              { bg: 'var(--color-exp-good)',     border: '#065f46' };
}

function loadFullCalendar() {
  if (window.FullCalendar) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.js';
    script.onload  = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function loadAllEvents(info, successCb, failCb) {
  try {
    const start = info.startStr.split('T')[0];
    const end   = info.endStr.split('T')[0];

    // 1. Batch events from Supabase (strictly active batches with available stock)
    const { data: rawBatches } = await supabase
      .from('batches')
      .select('id, batch_number, quantity, delivery_date, expiration_date, supplier, record_status, deleted_at, commodities(name, unit, deleted_at)')
      .is('deleted_at', null)
      .eq('record_status', RECORD_STATUS.ACTIVE)
      .gt('quantity', 0)
      .or(`delivery_date.gte.${start},expiration_date.gte.${start}`)
      .lte('delivery_date', end);

    const batches = (rawBatches || []).filter(b => 
      b.record_status === RECORD_STATUS.ACTIVE &&
      b.deleted_at === null &&
      (b.quantity || 0) > 0 &&
      (!b.commodities || b.commodities.deleted_at === null)
    );

    const batchEvents = [];
    (batches || []).forEach(b => {
      const name = b.commodities?.name || 'Unknown';
      if (b.delivery_date) {
        batchEvents.push({
          id:              `del-${b.id}`,
          title:           name,
          start:           b.delivery_date,
          allDay:          true,
          backgroundColor: '#1565C0',
          borderColor:     '#0d47a1',
          textColor:       '#fff',
          extendedProps:   { type: 'delivery', batch: b },
        });
      }
      if (b.expiration_date) {
        const col = getExpColor(b.expiration_date);
        batchEvents.push({
          id:              `exp-${b.id}`,
          title:           name,
          start:           b.expiration_date,
          allDay:          true,
          backgroundColor: col.bg,
          borderColor:     col.border,
          textColor:       '#fff',
          extendedProps:   { type: 'expiration', batch: b },
        });
      }
    });

    // 2. Custom events from IndexedDB
    const custom = await fetchCustomEvents();
    const customEvents = custom
      .filter(e => e.start_date >= start && e.start_date <= end)
      .map(e => ({
        id:              `custom-${e.id}`,
        title:           e.title,
        start:           e.start_time ? `${e.start_date}T${e.start_time}` : e.start_date,
        end:             e.end_date || null,
        allDay:          !e.start_time,
        backgroundColor: '#7C3AED',
        borderColor:     '#5b21b6',
        textColor:       '#fff',
        extendedProps:   { type: 'custom', event: e },
      }));

    successCb([...batchEvents, ...customEvents]);
  } catch (err) {
    console.error('[Calendar] Event load error:', err);
    failCb(err);
  }
}

export async function renderCalendarPage(profile) {
  _profile = profile;

  const content = document.getElementById('page-content');
  if (!content) return;
  content.innerHTML = renderCalendarLayout();

  // Inject CSS once
  if (!document.getElementById('cal-css')) {
    const link = document.createElement('link');
    link.id   = 'cal-css';
    link.rel  = 'stylesheet';
    link.href = new URL('./calendar.css', import.meta.url).href;
    document.head.appendChild(link);
  }

  // Offline banner & sync listeners
  const banner = document.getElementById('cal-offline-banner');
  const updateBanner = () => {
    if (banner) banner.style.display = navigator.onLine ? 'none' : 'flex';
  };
  updateBanner();
  window.addEventListener('online',  updateBanner);
  window.addEventListener('offline', updateBanner);

  _onlineHandler = async () => {
    await syncPendingWrites();
    await syncFromSupabase();
    _calendar?.refetchEvents();
    updateBanner();
  };
  window.addEventListener('online', _onlineHandler);

  await syncFromSupabase();
  await loadFullCalendar();

  const mountEl = document.getElementById('cal-mount');
  if (!mountEl) return;

  _calendar = new FullCalendar.Calendar(mountEl, {
    initialView:   'dayGridMonth',
    initialDate:   new Date(),
    headerToolbar: {
      left:   'prev,next today',
      center: 'title',
      right:  'dayGridMonth,dayGridWeek,listMonth',
    },
    height:        'auto',
    events:        loadAllEvents,
    eventClick:    info => showDetailModal(info, _calendar),
    eventDidMount: info => {
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

  attachModalListeners(_calendar, _profile);

  // Realtime updates
  if (_realtimeSub) _realtimeSub.unsubscribe();
  _realtimeSub = subscribeToCalendarEvents(() => {
    _calendar?.refetchEvents();
  });
}
