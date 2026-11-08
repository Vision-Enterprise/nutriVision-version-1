/**
 * System Notification Center Service (#94)
 *
 * Aggregates actionable, real-time operational alerts across NutriVision:
 *   1. Commodity Batches — Expired & Near-Expiry (including 7-day Nutribun & custom perishable policies)
 *   2. Milk Bank — Expired/Near-Expiry pasteurized BM-XXX batches & raw milk awaiting pasteurization
 *   3. Program Calendar — Today's & upcoming (next 7 days) scheduled events with Person in Charge
 *   4. Defect & Quarantine Log — Active Quarantined holds awaiting Restore / Dispose resolution
 *
 * Read/unread state is persisted per user in localStorage (zero DB schema dependency).
 */

import { supabase } from '../../core/supabase.js';
import {
  EXPIRATION_STATUS,
  EXPIRATION_THRESHOLDS,
  RECORD_STATUS,
} from '../constants/app.constants.js';
import {
  getExpirationStatus,
  getDaysRemaining,
} from '../utils/date.utils.js';
import {
  hydrateCommodityShelfLife,
  resolveShelfLifePolicy,
} from '../utils/shelf-life.utils.js';
import {
  fetchMilkBatches,
  fetchMilkDonations,
  isMilkBatchExpired,
} from '../../features/milk/milk.service.js';
import {
  syncFromSupabase as syncCalendarFromSupabase,
  fetchCustomEvents,
} from '../../features/calendar/calendar.service.js';
import { formatTime12h } from '../../features/calendar/calendar.render.js';

const READ_STORAGE_PREFIX = 'nutrivision_notif_read_v1_';
let _calendarSyncedOnce = false;

function _getReadKey(userId) {
  return `${READ_STORAGE_PREFIX}${userId || 'anon'}`;
}

export function getReadNotificationMap(userId) {
  try {
    const raw = localStorage.getItem(_getReadKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function markNotificationRead(userId, notifId) {
  if (!notifId) return;
  try {
    const map = getReadNotificationMap(userId);
    map[notifId] = Date.now();
    localStorage.setItem(_getReadKey(userId), JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

export function markAllNotificationsRead(userId, notifIds = []) {
  try {
    const map = getReadNotificationMap(userId);
    const now = Date.now();
    for (const id of notifIds) {
      if (id) map[id] = now;
    }
    localStorage.setItem(_getReadKey(userId), JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

async function _fetchBatchAlerts() {
  const { data: rawBatches, error } = await supabase
    .from('batches')
    .select(`
      id,
      batch_number,
      quantity,
      delivery_date,
      expiration_date,
      record_status,
      deleted_at,
      commodities ( * )
    `)
    .is('deleted_at', null)
    .eq('record_status', RECORD_STATUS.ACTIVE)
    .gt('quantity', 0);

  if (error) throw error;

  const activeBatches = (rawBatches || []).filter(b =>
    b.record_status === RECORD_STATUS.ACTIVE &&
    b.deleted_at === null &&
    (b.quantity || 0) > 0 &&
    (!b.commodities || b.commodities.deleted_at === null)
  );

  const alerts = [];

  for (const b of activeBatches) {
    if (b.commodities) hydrateCommodityShelfLife(b.commodities);
    const status = getExpirationStatus(b.expiration_date, b);
    if (status !== EXPIRATION_STATUS.EXPIRED && status !== EXPIRATION_STATUS.NEAR_EXPIRY) {
      continue;
    }

    const days = getDaysRemaining(b.expiration_date);
    const policy = resolveShelfLifePolicy(b);
    const commName = b.commodities?.name || 'Commodity';
    const unit = b.commodities?.unit || 'units';
    const qty = Number(b.quantity || 0).toLocaleString();
    const targetHash = `#/batches?highlight=${encodeURIComponent(b.batch_number || '')}`;

    if (status === EXPIRATION_STATUS.EXPIRED) {
      const overdueLabel = days === 0 ? 'Expires today' : `${Math.abs(days)}d overdue`;
      alerts.push({
        id:       `batch-expired-${b.id}`,
        category: 'batches',
        urgent:   true,
        severity: 'critical',
        priority: 1,
        sortVal:  days,
        icon:     'error',
        tag:      'Expired Batch',
        title:    `${commName} is Expired`,
        subtitle: `${b.batch_number} · ${qty} ${unit} (${overdueLabel}) — void/archive to isolate stock`,
        route:    targetHash,
      });
    } else {
      const isShortPerishable = policy.isPerishable || (policy.shelfLifeDays && policy.shelfLifeDays <= 30);
      alerts.push({
        id:       `batch-near-${b.id}`,
        category: 'batches',
        urgent:   true,
        severity: 'warning',
        priority: 2,
        sortVal:  days,
        icon:     isShortPerishable ? 'bakery_dining' : 'schedule',
        tag:      isShortPerishable ? 'Perishable FEFO' : 'Near Expiry',
        title:    `${commName} (${days}d left)`,
        subtitle: `${b.batch_number} · ${qty} ${unit} — prioritize FEFO barangay release`,
        route:    targetHash,
      });
    }
  }

  return alerts;
}

async function _fetchMilkAlerts() {
  const [batchesRes, donationsRes] = await Promise.all([
    fetchMilkBatches(),
    fetchMilkDonations(),
  ]);

  const milkBatches = batchesRes.data || [];
  const donations   = donationsRes.data || [];
  const alerts      = [];

  for (const mb of milkBatches) {
    const rem = Number(mb.remaining_bags || 0);
    if (rem <= 0) continue;

    const days = getDaysRemaining(mb.expiry_date);
    const shelfLabel = mb.freezer_shelf || 'Freezer';

    if (isMilkBatchExpired(mb)) {
      alerts.push({
        id:       `milk-expired-${mb.id}`,
        category: 'milk',
        urgent:   true,
        severity: 'critical',
        priority: 1,
        sortVal:  days,
        icon:     'water_drop',
        tag:      'Milk Bank · Expired',
        title:    `Pasteurized Batch ${mb.batch_number} Expired`,
        subtitle: `${rem} bag${rem !== 1 ? 's' : ''} in ${shelfLabel} — blocked from infant dispensing`,
        route:    '#/milk',
      });
    } else if (days > 0 && days <= EXPIRATION_THRESHOLDS.NEAR_EXPIRY_DAYS) {
      alerts.push({
        id:       `milk-near-${mb.id}`,
        category: 'milk',
        urgent:   true,
        severity: 'warning',
        priority: 2,
        sortVal:  days,
        icon:     'water_drop',
        tag:      'Milk Bank · Near Expiry',
        title:    `Milk Batch ${mb.batch_number} (${days}d left)`,
        subtitle: `${rem} bag${rem !== 1 ? 's' : ''} in ${shelfLabel} — prioritize dispensing`,
        route:    '#/milk',
      });
    }
  }

  const rawDonations = donations.filter(d => d.status === 'stored_raw');
  if (rawDonations.length > 0) {
    const latestId = rawDonations[rawDonations.length - 1]?.id || rawDonations.length;
    alerts.push({
      id:       `milk-raw-pool-${rawDonations.length}-${latestId}`,
      category: 'milk',
      urgent:   false,
      severity: 'milk',
      priority: 3,
      sortVal:  100,
      icon:     'science',
      tag:      'Milk Bank · Raw Pool',
      title:    `${rawDonations.length} Raw Milk Donation${rawDonations.length !== 1 ? 's' : ''} Awaiting Pasteurization`,
      subtitle: 'Pool stored raw breastmilk into a pasteurized BM-XXX batch',
      route:    '#/milk',
    });
  }

  return alerts;
}

async function _fetchCalendarAlerts() {
  if (!_calendarSyncedOnce && navigator.onLine) {
    _calendarSyncedOnce = true;
    await syncCalendarFromSupabase().catch(() => {});
  }

  const events = await fetchCustomEvents();
  const alerts = [];

  for (const ev of events) {
    if (!ev.start_date) continue;
    const daysUntil = getDaysRemaining(ev.start_date);
    if (daysUntil < 0 || daysUntil > 7) continue;

    const pic = ev.person_in_charge || 'Unassigned';
    const timeStr = ev.start_time ? ` · ${formatTime12h(ev.start_time)}` : '';

    if (daysUntil === 0) {
      alerts.push({
        id:       `cal-today-${ev.id}-${ev.start_date}`,
        category: 'schedule',
        urgent:   true,
        severity: 'warning',
        priority: 2,
        sortVal:  0,
        icon:     'event_available',
        tag:      'Today\'s Schedule',
        title:    `Today: ${ev.title}`,
        subtitle: `Person in Charge: ${pic}${timeStr}`,
        route:    '#/calendar',
      });
    } else {
      const whenLabel = daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`;
      alerts.push({
        id:       `cal-upcoming-${ev.id}-${ev.start_date}`,
        category: 'schedule',
        urgent:   false,
        severity: 'schedule',
        priority: 4,
        sortVal:  daysUntil,
        icon:     'calendar_month',
        tag:      `Schedule · ${whenLabel}`,
        title:    ev.title,
        subtitle: `${ev.start_date}${timeStr} · PIC: ${pic}`,
        route:    '#/calendar',
      });
    }
  }

  return alerts;
}

async function _fetchQuarantineAlerts() {
  const { data, error } = await supabase
    .from('defect_incidents')
    .select(`
      id,
      classification,
      quantity_affected,
      remaining_quarantined,
      action_taken,
      reported_at,
      batches (
        batch_number,
        commodities ( name, unit )
      )
    `)
    .eq('action_taken', 'Quarantined')
    .order('reported_at', { ascending: false });

  if (error) throw error;

  const alerts = [];
  for (const inc of data || []) {
    const rem = inc.remaining_quarantined !== null && inc.remaining_quarantined !== undefined
      ? Number(inc.remaining_quarantined)
      : Number(inc.quantity_affected || 0);

    if (rem <= 0) continue;

    const commName = inc.batches?.commodities?.name || 'Commodity';
    const unit     = inc.batches?.commodities?.unit || 'units';
    const batchNum = inc.batches?.batch_number || 'Batch';

    alerts.push({
      id:       `defect-quarantine-${inc.id}`,
      category: 'defects',
      urgent:   true,
      severity: 'warning',
      priority: 2,
      sortVal:  15,
      icon:     'gpp_maybe',
      tag:      'Quarantine Hold',
      title:    `Quarantined: ${commName}`,
      subtitle: `${batchNum} · ${rem.toLocaleString()} ${unit} (${inc.classification || 'Defect'}) — Restore or Dispose`,
      route:    '#/defects',
    });
  }

  return alerts;
}

export async function fetchSystemNotifications(userId) {
  const results = await Promise.allSettled([
    _fetchBatchAlerts(),
    _fetchMilkAlerts(),
    _fetchCalendarAlerts(),
    _fetchQuarantineAlerts(),
  ]);

  const combined = [];
  for (const res of results) {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      combined.push(...res.value);
    }
  }

  combined.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return (a.sortVal ?? 999) - (b.sortVal ?? 999);
  });

  const readMap = getReadNotificationMap(userId);
  const notifications = combined.map(item => ({
    ...item,
    isRead: Boolean(readMap[item.id]),
  }));

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return {
    notifications,
    unreadCount,
  };
}

