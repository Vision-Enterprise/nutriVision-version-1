/**
 * Calendar Service — Offline-First Data Layer
 *
 * Strategy:
 *  1. IndexedDB is the single source of truth for the UI (instant reads).
 *  2. Supabase is the source of truth for cross-device sync.
 *  3. On load: flush pending writes -> fetch from Supabase -> populate IndexedDB cache.
 *  4. On create/update/delete: write to IndexedDB first, sync to Supabase (or queue).
 *  5. Graceful pre-migration fallback for `person_in_charge` (#99):
 *     - Writes `person_in_charge` column directly when present in Supabase.
 *     - Falls back to structured description metadata + localStorage cache if the
 *       SQL column has not been applied yet, then auto-backfills once available.
 */

import { supabase } from '../../core/supabase.js';
import { BARANGAYS } from '../../shared/constants/app.constants.js';

const DB_NAME              = 'nutrivision_calendar';
const DB_VERSION           = 1;
const STORE                = 'calendar_events';
const PENDING              = 'pending_sync';
const PIC_STORAGE_KEY      = 'nutrivision_calendar_pic_v1';
const LOC_STORAGE_KEY      = 'nutrivision_calendar_loc_v1';
const CUSTOM_LOCATIONS_KEY = 'nutrivision_calendar_custom_locations_v1';
const STAFF_CACHE_KEY      = 'nutrivision_calendar_staff_v1';
const PIC_DESC_REGEX       = /^\[PIC:\s*([^\]]+)\]\r?\n?/;
const LOC_DESC_REGEX       = /^\[LOC:\s*([^\]]+)\]\r?\n?/;
const DEFAULT_LOCATIONS    = ['MNAO Office', 'Municipal Hall', ...BARANGAYS];

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

// Person-in-Charge Fallback & Hydration Helpers (#99)

function _readPicMap() {
  try {
    const raw = localStorage.getItem(PIC_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function _writePicEntry(eventId, personInCharge) {
  if (!eventId) return;
  try {
    const map = _readPicMap();
    const cleaned = String(personInCharge ?? '').trim();
    if (cleaned) {
      map[eventId] = cleaned;
    } else {
      delete map[eventId];
    }
    localStorage.setItem(PIC_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

function _readLocMap() {
  try {
    const raw = localStorage.getItem(LOC_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function _writeLocEntry(eventId, location) {
  if (!eventId) return;
  try {
    const map = _readLocMap();
    const cleaned = String(location ?? '').trim();
    if (cleaned) {
      map[eventId] = cleaned;
    } else {
      delete map[eventId];
    }
    localStorage.setItem(LOC_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

export function saveCustomLocationOption(location) {
  const cleaned = String(location ?? '').trim();
  if (!cleaned) return;
  const isDefault = DEFAULT_LOCATIONS.some(d => d.toLowerCase() === cleaned.toLowerCase());
  if (isDefault) return;
  try {
    const raw = localStorage.getItem(CUSTOM_LOCATIONS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const exists = Array.isArray(list) && list.some(x => String(x).toLowerCase() === cleaned.toLowerCase());
    if (!exists) {
      localStorage.setItem(CUSTOM_LOCATIONS_KEY, JSON.stringify([...(Array.isArray(list) ? list : []), cleaned]));
    }
  } catch {
    // Ignore storage quota errors
  }
}

export async function getLocationSuggestions() {
  const merged = new Map();
  const add = val => {
    const cleaned = String(val ?? '').trim();
    if (!cleaned) return;
    const key = cleaned.toLowerCase();
    if (!merged.has(key)) merged.set(key, cleaned);
  };

  DEFAULT_LOCATIONS.forEach(add);

  try {
    const raw = localStorage.getItem(CUSTOM_LOCATIONS_KEY);
    const saved = raw ? JSON.parse(raw) : [];
    if (Array.isArray(saved)) saved.forEach(add);
  } catch {
    // Ignore parse error
  }

  try {
    const cachedEvents = await idbGetAll(STORE);
    cachedEvents.filter(r => !r.deleted_at).forEach(r => {
      const hydrated = hydrateCalendarEvent(r);
      if (hydrated.location) add(hydrated.location);
    });
  } catch {
    // Ignore IDB error
  }

  return Array.from(merged.values());
}

function _encodeFallbackDescription(personInCharge, location, cleanDescription) {
  const safePic = String(personInCharge ?? '').replace(/[\r\n\]]+/g, ' ').trim();
  const safeLoc = String(location ?? '').replace(/[\r\n\]]+/g, ' ').trim();
  const safeDesc = String(cleanDescription ?? '').trim();
  const tags = [];
  if (safePic) tags.push(`[PIC: ${safePic}]`);
  if (safeLoc) tags.push(`[LOC: ${safeLoc}]`);
  if (!tags.length) return safeDesc || null;
  return safeDesc ? `${tags.join('\n')}\n${safeDesc}` : tags.join('\n');
}

export function hydrateCalendarEvent(rawRow) {
  if (!rawRow || typeof rawRow !== 'object') return rawRow;
  const row = { ...rawRow };

  let extractedPic = '';
  let extractedLoc = '';
  let cleanDesc = row.description ?? null;

  if (typeof cleanDesc === 'string') {
    let changed = true;
    while (changed) {
      changed = false;
      const picMatch = cleanDesc.match(PIC_DESC_REGEX);
      if (picMatch) {
        extractedPic = picMatch[1].trim();
        cleanDesc = cleanDesc.slice(picMatch[0].length);
        changed = true;
      }
      const locMatch = cleanDesc.match(LOC_DESC_REGEX);
      if (locMatch) {
        extractedLoc = locMatch[1].trim();
        cleanDesc = cleanDesc.slice(locMatch[0].length);
        changed = true;
      }
    }
    cleanDesc = cleanDesc.trim() || null;
  }

  const picMap = _readPicMap();
  const resolvedPic = String(
    row.person_in_charge || extractedPic || picMap[row.id] || ''
  ).trim() || null;

  const locMap = _readLocMap();
  const resolvedLoc = String(
    row.location || extractedLoc || locMap[row.id] || ''
  ).trim() || null;

  row.person_in_charge = resolvedPic;
  row.location = resolvedLoc;
  row.description = cleanDesc;

  if (row.id && resolvedPic) {
    _writePicEntry(row.id, resolvedPic);
  }
  if (row.id && resolvedLoc) {
    _writeLocEntry(row.id, resolvedLoc);
  }

  return row;
}

function _isMissingPicColumnError(err) {
  const text = `${err?.code || ''} ${err?.message || ''} ${err?.details || ''} ${err?.hint || ''}`.toLowerCase();
  return text.includes('person_in_charge') || text.includes('location') || text.includes('pgrst204') || text.includes('42703');
}

function _buildDbPayload(record, includePicColumn = true) {
  const base = {
    id:          record.id,
    title:       record.title,
    start_date:  record.start_date,
    start_time:  record.start_time || null,
    end_date:    record.end_date || null,
    description: includePicColumn
      ? (record.description || null)
      : _encodeFallbackDescription(record.person_in_charge, record.location, record.description),
    created_by:  record.created_by,
    created_at:  record.created_at,
    updated_at:  record.updated_at,
    deleted_at:  record.deleted_at || null,
  };

  if (includePicColumn) {
    base.person_in_charge = record.person_in_charge || null;
    base.location = record.location || null;
  }

  return base;
}

async function _syncEventRecordToSupabase(record, mode = 'insert') {
  const primaryPayload = _buildDbPayload(record, true);
  let res;

  if (mode === 'insert') {
    res = await supabase.from('calendar_events').insert(primaryPayload);
  } else if (mode === 'update') {
    res = await supabase.from('calendar_events').update(primaryPayload).eq('id', record.id);
  } else {
    res = await supabase.from('calendar_events').upsert(primaryPayload);
  }

  if (!res.error) return;

  if (_isMissingPicColumnError(res.error)) {
    const fallbackPayload = _buildDbPayload(record, false);
    let fallbackRes;
    if (mode === 'insert') {
      fallbackRes = await supabase.from('calendar_events').insert(fallbackPayload);
    } else if (mode === 'update') {
      fallbackRes = await supabase.from('calendar_events').update(fallbackPayload).eq('id', record.id);
    } else {
      fallbackRes = await supabase.from('calendar_events').upsert(fallbackPayload);
    }
    if (fallbackRes.error) throw fallbackRes.error;
    return;
  }

  throw res.error;
}

// Supabase Sync

export async function syncFromSupabase() {
  if (!navigator.onLine) return;
  try {
    await syncPendingWrites();

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .is('deleted_at', null);
    if (error) throw error;

    // Preserve any local rows that still have pending offline operations
    const stillPending = await idbGetAll(PENDING);
    const pendingById = new Map();
    for (const op of stillPending) {
      if (op.data?.id) {
        const existingLocal = await idbGet(STORE, op.data.id);
        pendingById.set(op.data.id, existingLocal || op.data);
      }
    }

    const rows = Array.isArray(data) ? data : [];
    const dbHasPicCol = rows.length > 0 && Object.prototype.hasOwnProperty.call(rows[0], 'person_in_charge');

    await idbClear(STORE);

    for (const rawRow of rows) {
      const hydrated = hydrateCalendarEvent(rawRow);
      await idbPut(STORE, hydrated);

      // Auto-backfill native column once SQL migration is executed
      if (dbHasPicCol && !rawRow.person_in_charge && hydrated.person_in_charge) {
        supabase
          .from('calendar_events')
          .update({
            person_in_charge: hydrated.person_in_charge,
            description: hydrated.description || null,
          })
          .eq('id', hydrated.id)
          .then(() => {})
          .catch(() => {});
      }
    }

    for (const [pendingId, localRecord] of pendingById.entries()) {
      if (localRecord?.deleted_at) {
        await idbDelete(STORE, pendingId);
      } else if (localRecord) {
        await idbPut(STORE, hydrateCalendarEvent(localRecord));
      }
    }
  } catch (err) {
    console.warn('[CalendarService] Supabase sync failed - using cache.', err);
  }
}

export async function syncPendingWrites() {
  if (!navigator.onLine) return;
  const pending = await idbGetAll(PENDING);
  if (!pending.length) return;
  for (const op of pending) {
    try {
      if (op.type === 'insert') {
        await _syncEventRecordToSupabase(hydrateCalendarEvent(op.data), 'upsert');
      } else if (op.type === 'update') {
        await _syncEventRecordToSupabase(hydrateCalendarEvent(op.data), 'update');
      } else if (op.type === 'delete') {
        const { error } = await supabase
          .from('calendar_events')
          .update({ deleted_at: op.data.deleted_at || new Date().toISOString() })
          .eq('id', op.data.id);
        if (error) throw error;
      }
      await idbDelete(PENDING, op.id);
    } catch (err) {
      console.error('[CalendarService] Pending write failed:', op, err);
    }
  }
}

// Staff Suggestions (#99)

export async function fetchStaffSuggestions(currentProfile = null) {
  let staffNames = [];

  if (navigator.onLine) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, is_active')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (!error && Array.isArray(data)) {
        staffNames = data
          .map(p => String(p.full_name ?? '').trim())
          .filter(Boolean);
        try {
          localStorage.setItem(STAFF_CACHE_KEY, JSON.stringify(staffNames));
        } catch {
          // Ignore storage quota errors
        }
      }
    } catch {
      // Fall back to cached staff list below
    }
  }

  if (!staffNames.length) {
    try {
      const cached = JSON.parse(localStorage.getItem(STAFF_CACHE_KEY) || '[]');
      if (Array.isArray(cached)) staffNames = cached;
    } catch {
      staffNames = [];
    }
  }

  const customEvents = await fetchCustomEvents().catch(() => []);
  const previousPics = customEvents
    .map(ev => String(ev.person_in_charge ?? '').trim())
    .filter(Boolean);

  const ownName = String(currentProfile?.full_name ?? '').trim();
  const merged = new Map();

  for (const candidate of [ownName, ...staffNames, ...previousPics]) {
    if (!candidate) continue;
    const key = candidate.toLowerCase();
    if (!merged.has(key)) merged.set(key, candidate);
  }

  return Array.from(merged.values());
}

// CRUD

export async function fetchCustomEvents() {
  const rows = await idbGetAll(STORE);
  return rows
    .filter(r => !r.deleted_at)
    .map(r => hydrateCalendarEvent(r));
}

export async function createCustomEvent(event, userId) {
  const now = new Date().toISOString();
  const record = {
    id:               crypto.randomUUID(),
    title:            String(event.title ?? '').trim(),
    person_in_charge: String(event.person_in_charge ?? '').trim() || null,
    location:         String(event.location ?? '').trim() || null,
    start_date:       event.start_date,
    start_time:       event.start_time || null,
    end_date:         event.end_date || null,
    description:      String(event.description ?? '').trim() || null,
    created_by:       userId,
    created_at:       now,
    updated_at:       now,
    deleted_at:       null,
  };

  if (record.person_in_charge) {
    _writePicEntry(record.id, record.person_in_charge);
  }
  if (record.location) {
    _writeLocEntry(record.id, record.location);
    saveCustomLocationOption(record.location);
  }

  await idbPut(STORE, record);
  if (navigator.onLine) {
    try {
      await _syncEventRecordToSupabase(record, 'insert');
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
  if (!existing) return null;

  const base = hydrateCalendarEvent(existing);
  const updated = {
    ...base,
    title:            changes.title !== undefined ? String(changes.title ?? '').trim() : base.title,
    person_in_charge: changes.person_in_charge !== undefined
      ? (String(changes.person_in_charge ?? '').trim() || null)
      : base.person_in_charge,
    location:         changes.location !== undefined
      ? (String(changes.location ?? '').trim() || null)
      : base.location,
    start_date:       changes.start_date !== undefined ? changes.start_date : base.start_date,
    start_time:       changes.start_time !== undefined ? (changes.start_time || null) : base.start_time,
    end_date:         changes.end_date !== undefined ? (changes.end_date || null) : base.end_date,
    description:      changes.description !== undefined
      ? (String(changes.description ?? '').trim() || null)
      : base.description,
    updated_at:       new Date().toISOString(),
  };

  _writePicEntry(updated.id, updated.person_in_charge);
  _writeLocEntry(updated.id, updated.location);
  if (updated.location) saveCustomLocationOption(updated.location);
  await idbPut(STORE, updated);

  if (navigator.onLine) {
    try {
      await _syncEventRecordToSupabase(updated, 'update');
    } catch (err) {
      console.warn('[CalendarService] Update failed - queued.', err);
      await idbPut(PENDING, { type: 'update', data: updated });
    }
  } else {
    await idbPut(PENDING, { type: 'update', data: updated });
  }

  return updated;
}

export async function deleteCustomEvent(id) {
  const existing = await idbGet(STORE, id);
  if (!existing) return;
  const updated = { ...hydrateCalendarEvent(existing), deleted_at: new Date().toISOString() };
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
        await idbPut(STORE, hydrateCalendarEvent(row));
      }
      onUpdate();
    })
    .subscribe();
}
