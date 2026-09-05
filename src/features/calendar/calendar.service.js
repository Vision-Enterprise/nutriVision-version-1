/**
 * Calendar Service — Offline-First Data Layer
 *
 * Strategy:
 *  1. IndexedDB is the single source of truth for the UI (instant reads).
 *  2. Supabase is the source of truth for cross-device sync.
 *  3. On load: fetch from Supabase -> populate IndexedDB cache.
 *  4. On create/update/delete: write to IndexedDB first, queue Supabase sync.
 *  5. On window.ononline: flush pending queue to Supabase.
 */

import { supabase } from '../../core/supabase.js';

const DB_NAME    = 'nutrivision_calendar';
const DB_VERSION = 1;
const STORE      = 'calendar_events';
const PENDING    = 'pending_sync';

// IndexedDB Bootstrap

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PENDING)) {
        db.createObjectStore(PENDING, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror   = e => reject(e.target.error);
  });
}

function idbGet(store, key) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = e => reject(e.target.error);
  }));
}

function idbGetAll(store) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = e => reject(e.target.error);
  }));
}

function idbPut(store, value) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = e => reject(e.target.error);
  }));
}

function idbDelete(store, key) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  }));
}

function idbClear(store) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).clear();
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  }));
}

// Supabase Sync

export async function syncFromSupabase() {
  if (!navigator.onLine) return;
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .is('deleted_at', null);
    if (error) throw error;
    await idbClear(STORE);
    for (const row of data) await idbPut(STORE, row);
  } catch (err) {
    console.warn('[CalendarService] Supabase sync failed - using cache.', err);
  }
}

export async function syncPendingWrites() {
  const pending = await idbGetAll(PENDING);
  if (!pending.length) return;
  for (const op of pending) {
    try {
      if (op.type === 'insert') {
        await supabase.from('calendar_events').upsert(op.data);
      } else if (op.type === 'update') {
        await supabase.from('calendar_events').update(op.data).eq('id', op.data.id);
      } else if (op.type === 'delete') {
        await supabase.from('calendar_events').update({ deleted_at: new Date().toISOString() }).eq('id', op.data.id);
      }
      await idbDelete(PENDING, op.id);
    } catch (err) {
      console.error('[CalendarService] Pending write failed:', op, err);
    }
  }
}

// CRUD

export async function fetchCustomEvents() {
  const rows = await idbGetAll(STORE);
  return rows.filter(r => !r.deleted_at);
}

export async function createCustomEvent(event, userId) {
  const record = {
    id:          crypto.randomUUID(),
    title:       event.title,
    start_date:  event.start_date,
    start_time:  event.start_time || null,
    end_date:    event.end_date || null,
    description: event.description || null,
    created_by:  userId,
    created_at:  new Date().toISOString(),
    updated_at:  new Date().toISOString(),
    deleted_at:  null,
  };
  await idbPut(STORE, record);
  if (navigator.onLine) {
    try {
      const { error } = await supabase.from('calendar_events').insert(record);
      if (error) throw error;
    } catch (err) {
      console.warn('[CalendarService] Insert failed - queued.', err);
      await idbPut(PENDING, { type: 'insert', data: record });
    }
  } else {
    await idbPut(PENDING, { type: 'insert', data: record });
  }
  return record;
}

export async function updateCustomEvent(id, changes) {
  const existing = await idbGet(STORE, id);
  if (!existing) return;
  const updated = { ...existing, ...changes, updated_at: new Date().toISOString() };
  await idbPut(STORE, updated);
  if (navigator.onLine) {
    try {
      const { error } = await supabase.from('calendar_events').update(updated).eq('id', id);
      if (error) throw error;
    } catch (err) {
      await idbPut(PENDING, { type: 'update', data: updated });
    }
  } else {
    await idbPut(PENDING, { type: 'update', data: updated });
  }
}

export async function deleteCustomEvent(id) {
  const existing = await idbGet(STORE, id);
  if (!existing) return;
  const updated = { ...existing, deleted_at: new Date().toISOString() };
  await idbPut(STORE, updated);
  if (navigator.onLine) {
    try {
      const { error } = await supabase.from('calendar_events')
        .update({ deleted_at: updated.deleted_at }).eq('id', id);
      if (error) throw error;
    } catch (err) {
      await idbPut(PENDING, { type: 'delete', data: updated });
    }
  } else {
    await idbPut(PENDING, { type: 'delete', data: updated });
  }
}

export function subscribeToCalendarEvents(onUpdate) {
  return supabase
    .channel('calendar_events_changes')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'calendar_events',
    }, async payload => {
      const row = payload.new || payload.old;
      if (!row) return;
      if (payload.eventType === 'DELETE' || row.deleted_at) {
        await idbDelete(STORE, row.id);
      } else {
        await idbPut(STORE, row);
      }
      onUpdate();
    })
    .subscribe();
}
