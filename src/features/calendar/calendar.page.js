/**
 * Calendar Page (Controller)
 *
 * Coordinates FullCalendar lifecycle, offline sync, Supabase events,
 * and custom IndexedDB events.
 *
 * MVC Controller: delegates layout to .render.js and popups to .modals.js.
 */

import { supabase }              from '../../core/supabase.js';
import { EXPIRATION_STATUS, RECORD_STATUS } from '../../shared/constants/app.constants.js';
import {
  syncFromSupabase,
  syncPendingWrites,
  fetchCustomEvents,
  subscribeToCalendarEvents,
} from './calendar.service.js';
import { renderCalendarLayout, escapeHtml, formatTime12h } from './calendar.render.js';
import { showDetailModal, attachModalListeners } from './calendar.modals.js';
import { getLocalDateString, getExpirationStatus, getDaysRemaining } from '../../shared/utils/date.utils.js';
import { hydrateCommodityShelfLife } from '../../shared/utils/shelf-life.utils.js';

let _calendar      = null;
let _profile       = null;
let _realtimeSub   = null;
let _onlineHandler = null;

function getExpColor(dateStr, batch = null) {
  if (!dateStr) return null;
  const status = getExpirationStatus(dateStr, batch);
  if (status === EXPIRATION_STATUS.EXPIRED) {
    return { bg: '#dc2626', border: '#b91c1c', textColor: '#ffffff' };
  }
  if (status === EXPIRATION_STATUS.NEAR_EXPIRY) {
    return { bg: '#ea580c', border: '#c2410c', textColor: '#ffffff' };
  }
  if (status === EXPIRATION_STATUS.MODERATE) {
    return { bg: '#eab308', border: '#ca8a04', textColor: '#713f12' };
  }
  return { bg: '#059669', border: '#047857', textColor: '#ffffff' };
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
      .select('id, batch_number, quantity, delivery_date, expiration_date, supplier, record_status, deleted_at, commodities(*)')
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
    batches.forEach(b => {
      if (b.commodities) hydrateCommodityShelfLife(b.commodities);
    });

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
        const col = getExpColor(b.expiration_date, b);
        batchEvents.push({
          id:              `exp-${b.id}`,
          title:           name,
          start:           b.expiration_date,
          allDay:          true,
          backgroundColor: col.bg,
          borderColor:     col.border,
          textColor:       col.textColor || '#fff',
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
    eventContent:  arg => {
      const type = arg.event.extendedProps?.type;
      const isList = arg.view.type.startsWith('list');

      // 1. Program Events (custom)
      if (type === 'custom') {
        const customEv = arg.event.extendedProps.event || {};
        const title = escapeHtml(customEv.title || arg.event.title || 'Program Event');
        const pic = String(customEv.person_in_charge ?? '').trim();

        if (isList) {
          return {
            html: `
              <div class="cal-fc-list-custom">
                <span class="cal-fc-list-title"><span class="icon" style="font-size:14px; vertical-align:middle; color:#7C3AED;">event</span> ${title}</span>
                ${pic
                  ? `<span class="cal-fc-list-pic"><span class="icon">person</span>${escapeHtml(pic)}</span>`
                  : `<span class="cal-fc-list-pic cal-fc-list-pic--muted">Unassigned</span>`
                }
              </div>
            `,
          };
        }

        const timePrefix = arg.timeText ? `<span class="cal-fc-chip-time">${escapeHtml(arg.timeText)}</span> ` : '';
        const picSuffix = pic ? ` <span class="cal-fc-chip-pic">&middot; ${escapeHtml(pic)}</span>` : '';
        return {
          html: `<div class="fc-event-main"><span class="icon">event</span><span class="fc-event-title">${timePrefix}${title}${picSuffix}</span></div>`,
        };
      }

      // 2. Batch Deliveries
      if (type === 'delivery') {
        const batch = arg.event.extendedProps.batch || {};
        const title = escapeHtml(batch.commodities?.name || arg.event.title || 'Delivery');
        const qty = batch.quantity ? `${Number(batch.quantity).toLocaleString()} ${batch.commodities?.unit || ''}`.trim() : '';

        if (isList) {
          return {
            html: `
              <div class="cal-fc-list-custom">
                <span class="cal-fc-list-title"><span class="icon" style="font-size:14px; vertical-align:middle; color:#1565C0;">local_shipping</span> Delivery: ${title}</span>
                ${qty ? `<span class="cal-fc-list-pic" style="background:#dbeafe; color:#1e40af;">${escapeHtml(qty)}</span>` : ''}
              </div>
            `,
          };
        }

        return {
          html: `<div class="fc-event-main"><span class="icon">local_shipping</span><span class="fc-event-title">Del: ${title}</span></div>`,
        };
      }

      // 3. Batch Expirations
      if (type === 'expiration') {
        const batch = arg.event.extendedProps.batch || {};
        const title = escapeHtml(batch.commodities?.name || arg.event.title || 'Expiration');
        const status = getExpirationStatus(batch.expiration_date, batch);
        const days = getDaysRemaining(batch.expiration_date);
        const diffText = days <= 0 ? 'Expired' : `${days}d left`;

        if (isList) {
          return {
            html: `
              <div class="cal-fc-list-custom">
                <span class="cal-fc-list-title"><span class="icon" style="font-size:14px; vertical-align:middle;">warning</span> Expiry: ${title}</span>
                <span class="cal-fc-list-pic" style="background:rgba(255,255,255,0.2); color:inherit; font-weight:600;">${escapeHtml(status)} (${diffText})</span>
              </div>
            `,
          };
        }

        return {
          html: `<div class="fc-event-main"><span class="icon">warning</span><span class="fc-event-title">Exp: ${title}</span></div>`,
        };
      }

      // Fallback
      return {
        html: `<div class="fc-event-main"><span class="fc-event-title">${escapeHtml(arg.event.title || '')}</span></div>`,
      };
    },
    eventClick:    info => showDetailModal(info, _calendar, _profile),
    eventDidMount: info => {
      info.el.style.cursor = 'pointer';
      info.el.style.borderRadius = 'var(--radius-sm)';

      const type = info.event.extendedProps?.type;
      if (type === 'custom') {
        const customEv = info.event.extendedProps.event || {};
        const picLabel = customEv.person_in_charge || 'Unassigned';
        const timeLabel = customEv.start_time ? ` (${formatTime12h(customEv.start_time)})` : '';
        info.el.title = `Program Event: ${customEv.title || info.event.title}${timeLabel}\nPerson in Charge: ${picLabel}`;
      } else if (type === 'delivery') {
        const batch = info.event.extendedProps.batch || {};
        const qty = batch.quantity ? `${Number(batch.quantity).toLocaleString()} ${batch.commodities?.unit || ''}` : '';
        info.el.title = `Delivery: ${batch.commodities?.name || info.event.title}\nDelivery Date: ${batch.delivery_date || '—'}\nBatch Code: ${batch.batch_number || '—'}\nQuantity: ${qty}\nSupplier: ${batch.supplier || '—'}`;
      } else if (type === 'expiration') {
        const batch = info.event.extendedProps.batch || {};
        const status = getExpirationStatus(batch.expiration_date, batch);
        const days = getDaysRemaining(batch.expiration_date);
        const diffText = days <= 0 ? 'Expired' : `${days} days left`;
        info.el.title = `Expiration: ${batch.commodities?.name || info.event.title}\nExpiration Date: ${batch.expiration_date || '—'}\nStatus: ${status} (${diffText})\nBatch Code: ${batch.batch_number || '—'}`;
      }
    },
    dayCellDidMount: info => {
      const today = getLocalDateString();
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
