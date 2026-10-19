/**
 * Milk Bank Service
 * Handles all database operations for Milk Batches, Donation Intake, and Dispensing.
 */

import { supabase } from '../../core/supabase.js';
import { AUDIT_ACTIONS } from '../../shared/constants/app.constants.js';

const MODULE = '[MilkBankService]';

export const SHELF_LOCATIONS = [
  'Shelf 1',
  'Shelf 2',
  'Shelf 3',
  'Shelf 4',
  'Shelf 5',
  'Shelf 6',
  'Bottom Bin'
];

export const DISPENSE_INDICATIONS = [
  'Preterm / Low Birth Weight',
  'Maternal Illness',
  'Infant Malnutrition',
  'Orphaned / Abandoned',
  'Other'
];

/**
 * Fetch all pasteurized batches (BM-XXX) ordered by pasteurization date DESC.
 */
export async function fetchMilkBatches() {
  try {
    const { data, error } = await supabase
      .from('milk_batches')
      .select('*')
      .order('date_pasteurized', { ascending: true })
      .order('batch_number', { ascending: true });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error(`${MODULE} fetchMilkBatches error:`, err);
    return { data: [], error: 'Failed to load pasteurized milk batches.' };
  }
}

/**
 * Fetch all raw milk donation intake logs (Form MH.MNAO.FM.002.00)
 */
export async function fetchMilkDonations() {
  try {
    const { data, error } = await supabase
      .from('milk_donations')
      .select('*')
      .order('arrival_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error(`${MODULE} fetchMilkDonations error:`, err);
    return { data: [], error: 'Failed to load milk donations.' };
  }
}

/**
 * Fetch dispensing log history with linked batch number
 */
export async function fetchMilkDispatches() {
  try {
    const { data, error } = await supabase
      .from('milk_dispatches')
      .select(`
        id, recipient_name, barangay, bags_dispensed, indication,
        dispensed_date, dispensed_at, released_by_name, remarks,
        milk_batches ( batch_number, freezer_shelf )
      `)
      .order('dispensed_date', { ascending: true })
      .order('dispensed_at', { ascending: true });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error(`${MODULE} fetchMilkDispatches error:`, err);
    return { data: [], error: 'Failed to load milk dispatches.' };
  }
}

/**
 * Get summary metrics for the top metrics bar
 */
export async function fetchMilkMetrics() {
  try {
    const [batchesRes, donationsRes, dispatchesRes] = await Promise.all([
      fetchMilkBatches(),
      fetchMilkDonations(),
      fetchMilkDispatches()
    ]);

    const batches = batchesRes.data || [];
    const donations = donationsRes.data || [];
    const dispatches = dispatchesRes.data || [];

    const now = new Date();
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(now.getDate() + 30);

    const availableBags = batches.reduce((sum, b) => sum + (b.remaining_bags || 0), 0);
    const rawBags = donations.filter(d => d.status === 'stored_raw').length;

    const expiringSoonBags = batches
      .filter(b => {
        if (!b.remaining_bags || b.remaining_bags <= 0) return false;
        const exp = new Date(b.expiry_date);
        return exp >= now && exp <= thirtyDaysAhead;
      })
      .reduce((sum, b) => sum + b.remaining_bags, 0);

    // Current calendar month dispatches
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const dispensedThisMonth = dispatches
      .filter(d => {
        const date = new Date(d.dispensed_date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((sum, d) => sum + (d.bags_dispensed || 0), 0);

    return {
      availableBags,
      rawBags,
      expiringSoonBags,
      dispensedThisMonth
    };
  } catch (err) {
    console.error(`${MODULE} fetchMilkMetrics error:`, err);
    return {
      availableBags: 0,
      rawBags: 0,
      expiringSoonBags: 0,
      dispensedThisMonth: 0
    };
  }
}

/**
 * Calculate the next recommended batch number based on existing batches (e.g. 'BM-096')
 */
export async function getNextBatchNumber() {
  try {
    const { data } = await supabase
      .from('milk_batches')
      .select('batch_number')
      .order('batch_number', { ascending: false });

    if (!data || data.length === 0) {
      return 'BM-096'; // Starts right after notebook's BM-095
    }

    let maxNum = 95;
    for (const b of data) {
      const match = (b.batch_number || '').match(/BM-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }

    const next = maxNum + 1;
    return `BM-${String(next).padStart(3, '0')}`;
  } catch (err) {
    console.warn(`${MODULE} getNextBatchNumber fallback:`, err);
    return 'BM-096';
  }
}

/**
 * Write a Milk Bank activity entry to the central audit_logs table
 */
export async function logMilkAudit(action, entityType, entityId, description, profile) {
  if (!profile?.id) return;
  try {
    await supabase.from('audit_logs').insert({
      user_id:     profile.id,
      action,
      entity_type: entityType,
      entity_id:   entityId || null,
      description: `${profile.full_name || 'Staff'}: ${description}`
    });
  } catch (err) {
    console.warn(`${MODULE} Audit log insert failed:`, err);
  }
}

/**
 * Fetch all Milk Bank activity logs for the in-module Audit Trail tab
 */
export async function fetchMilkAuditLogs() {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        entity_type,
        entity_id,
        description,
        created_at,
        profiles ( full_name )
      `)
      .in('entity_type', ['milk_batch', 'milk_donation', 'milk_dispatch', 'cold_chain'])
      .order('created_at', { ascending: true })
      .limit(300);

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error(`${MODULE} fetchMilkAuditLogs error:`, err);
    return { data: [], error: err.message || 'Failed to fetch audit logs.' };
  }
}

/**
 * Create a new pasteurized batch (BM-XXX)
 */
export async function createMilkBatch({
  batch_number,
  date_pasteurized,
  expiry_date,
  total_bags,
  freezer_shelf,
  remarks,
  profileId,
  profileName
}) {
  try {
    const numBags = parseInt(total_bags, 10) || 1;
    let { data, error } = await supabase
      .from('milk_batches')
      .insert({
        batch_number: batch_number.trim().toUpperCase(),
        date_pasteurized,
        expiry_date,
        total_bags: numBags,
        remaining_bags: numBags,
        freezer_shelf: freezer_shelf || 'Shelf 1',
        status: 'available',
        remarks: remarks?.trim() || null,
        created_by: profileId || null
      })
      .select()
      .single();

    // Auto-fallback if database still has legacy constraint checking exact shelf literals
    if (error && error.message && error.message.includes('milk_batches_freezer_shelf_check') && (freezer_shelf || '').includes(' / ')) {
      const fallbackShelf = (freezer_shelf || '').split(' / ').pop().trim();
      const retry = await supabase
        .from('milk_batches')
        .insert({
          batch_number: batch_number.trim().toUpperCase(),
          date_pasteurized,
          expiry_date,
          total_bags: numBags,
          remaining_bags: numBags,
          freezer_shelf: fallbackShelf,
          status: 'available',
          remarks: remarks?.trim() || null,
          created_by: profileId || null
        })
        .select()
        .single();

      if (!retry.error) {
        data = retry.data;
        error = null;
      }
    }

    if (error) throw error;

    // Record audit trail
    if (profileId) {
      await logMilkAudit(
        AUDIT_ACTIONS.CREATE_MILK_BATCH,
        'milk_batch',
        data.id,
        `Logged new pasteurized batch "${data.batch_number}" (${numBags} bags, ${freezer_shelf || 'Shelf 1'}).`,
        { id: profileId, full_name: profileName }
      );
    }

    return { data, error: null };
  } catch (err) {
    console.error(`${MODULE} createMilkBatch error:`, err);
    return { data: null, error: err.message || 'Failed to create pasteurized batch.' };
  }
}

/**
 * Log a new raw donation intake (Form MH.MNAO.FM.002.00)
 */
export async function createMilkDonation({
  donor_code,
  bags_count,
  volume_ml,
  expression_date_notes,
  expression_time,
  transport_date,
  transport_time,
  condition_at_collection,
  arrival_date,
  arrival_time,
  condition_at_arrival,
  transport_condition,
  profileId,
  profileName
}) {
  try {
    const { data, error } = await supabase
      .from('milk_donations')
      .insert({
        donor_code: donor_code.trim(),
        bags_count: bags_count ? parseInt(bags_count, 10) : 1,
        volume_ml: volume_ml ? parseInt(volume_ml, 10) : null,
        expression_date_notes: expression_date_notes?.trim() || '@see donor log',
        expression_time: expression_time?.trim() || null,
        transport_date: transport_date?.trim() || null,
        transport_time: transport_time || '12:00 PM',
        condition_at_collection: condition_at_collection || 'ok',
        arrival_date: arrival_date || new Date().toISOString().split('T')[0],
        arrival_time: arrival_time || '12:30 PM',
        condition_at_arrival: condition_at_arrival || 'ok',
        transport_condition: transport_condition?.trim() || null,
        status: 'stored_raw',
        received_by: profileId || null,
        received_by_name: profileName || null
      })
      .select()
      .single();

    if (error) throw error;

    // Record audit trail
    if (profileId) {
      await logMilkAudit(
        AUDIT_ACTIONS.CREATE_MILK_DONATION,
        'milk_donation',
        data.id,
        `Logged donor milk intake from "${donor_code.trim()}" (Form FM.002.00).`,
        { id: profileId, full_name: profileName }
      );
    }

    return { data, error: null };
  } catch (err) {
    console.error(`${MODULE} createMilkDonation error:`, err);
    return { data: null, error: err.message || 'Failed to record donation intake.' };
  }
}

/**
 * Dispense milk bags to a recipient and decrement remaining batch stock
 */
export async function dispenseMilk({
  batch_id,
  recipient_name,
  barangay,
  bags_dispensed,
  indication,
  dispensed_date,
  remarks,
  profileId,
  profileName
}) {
  try {
    const qty = parseInt(bags_dispensed, 10);
    if (!qty || qty <= 0) throw new Error('Invalid bag quantity');

    // 1. Fetch current batch
    const { data: batch, error: batchError } = await supabase
      .from('milk_batches')
      .select('*')
      .eq('id', batch_id)
      .single();

    if (batchError || !batch) throw new Error('Selected batch not found');
    if (batch.remaining_bags < qty) {
      throw new Error(`Insufficient stock. Only ${batch.remaining_bags} bags available in ${batch.batch_number}.`);
    }

    const newRemaining = batch.remaining_bags - qty;
    const newStatus = newRemaining === 0 ? 'depleted' : (newRemaining <= 3 ? 'low_stock' : 'available');

    // 2. Record dispatch - strictly validate against database check constraint
    const validIndication = DISPENSE_INDICATIONS.includes(indication)
      ? indication
      : 'Preterm / Low Birth Weight';

    let { data: dispatch, error: dispatchError } = await supabase
      .from('milk_dispatches')
      .insert({
        batch_id,
        recipient_name: recipient_name.trim(),
        barangay: barangay.trim(),
        bags_dispensed: qty,
        indication: validIndication,
        dispensed_date: dispensed_date || new Date().toISOString().split('T')[0],
        remarks: remarks?.trim() || null,
        released_by: profileId || null,
        released_by_name: profileName || null
      })
      .select()
      .single();

    // Auto-fallback if database still enforces strict legacy indication check
    if (dispatchError && dispatchError.message && dispatchError.message.includes('milk_dispatches_indication_check')) {
      const retry = await supabase
        .from('milk_dispatches')
        .insert({
          batch_id,
          recipient_name: recipient_name.trim(),
          barangay: barangay.trim(),
          bags_dispensed: qty,
          indication: 'Preterm / Low Birth Weight',
          dispensed_date: dispensed_date || new Date().toISOString().split('T')[0],
          remarks: remarks?.trim() || null,
          released_by: profileId || null,
          released_by_name: profileName || null
        })
        .select()
        .single();
      dispatch = retry.data;
      dispatchError = retry.error;
    }

    if (dispatchError) throw dispatchError;

    // 3. Decrement batch
    const { error: updateError } = await supabase
      .from('milk_batches')
      .update({
        remaining_bags: newRemaining,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', batch_id);

    if (updateError) throw updateError;

    // Record audit trail
    if (profileId) {
      await logMilkAudit(
        AUDIT_ACTIONS.DISPENSE_MILK_BATCH,
        'milk_dispatch',
        dispatch.id,
        `Dispensed ${qty} bag(s) of batch "${batch.batch_number}" to ${recipient_name.trim()} (${barangay.trim()}).`,
        { id: profileId, full_name: profileName }
      );
    }

    return { data: dispatch, error: null };
  } catch (err) {
    console.error(`${MODULE} dispenseMilk error:`, err);
    return { data: null, error: err.message || 'Failed to process milk dispensing.' };
  }
}

/**
 * Update freezer shelf location of a batch
 */
export async function updateBatchShelf(batchId, newShelf, batchNumber = '', profile = null) {
  try {
    let shelfToSave = newShelf;
    let { data, error } = await supabase
      .from('milk_batches')
      .update({
        freezer_shelf: shelfToSave,
        updated_at: new Date().toISOString()
      })
      .eq('id', batchId)
      .select()
      .single();

    // Auto-fallback if database still has legacy constraint checking exact shelf literals
    if (error && error.message && error.message.includes('milk_batches_freezer_shelf_check') && shelfToSave.includes(' / ')) {
      const fallbackShelf = shelfToSave.split(' / ').pop().trim();
      const retry = await supabase
        .from('milk_batches')
        .update({
          freezer_shelf: fallbackShelf,
          updated_at: new Date().toISOString()
        })
        .eq('id', batchId)
        .select()
        .single();

      if (!retry.error) {
        data = retry.data;
        error = null;
      }
    }

    if (error) throw error;

    // Log shelf movement to audit trail if profile provided
    if (profile?.id) {
      await logMilkAudit(
        AUDIT_ACTIONS.MOVE_MILK_SHELF,
        'milk_batch',
        batchId,
        `Relocated milk batch "${batchNumber || data.batch_number}" to location "${newShelf}".`,
        profile
      );
    }

    return { data, error: null };
  } catch (err) {
    console.error(`${MODULE} updateBatchShelf error:`, err);
    return { data: null, error: err.message || 'Failed to update shelf position.' };
  }
}

/**
 * Update full milk batch attributes (from Edit Modal)
 */
export async function updateMilkBatch(batchId, updates, profile = null) {
  try {
    const totalBags = parseInt(updates.total_bags, 10);
    const remainingBags = updates.remaining_bags !== undefined ? parseInt(updates.remaining_bags, 10) : totalBags;

    const payload = {
      date_pasteurized: updates.date_pasteurized,
      expiry_date: updates.expiry_date,
      total_bags: totalBags,
      remaining_bags: remainingBags,
      freezer_shelf: updates.freezer_shelf,
      remarks: updates.remarks?.trim() || null,
      updated_at: new Date().toISOString()
    };

    if (updates.batch_number) {
      payload.batch_number = updates.batch_number.trim().toUpperCase();
    }

    const { data, error } = await supabase
      .from('milk_batches')
      .update(payload)
      .eq('id', batchId)
      .select()
      .single();

    if (error) throw error;

    // Audit log
    if (profile?.id) {
      try {
        await supabase.from('audit_logs').insert({
          user_id:     profile.id,
          action:      AUDIT_ACTIONS.UPDATE_MILK_BATCH,
          entity_type: 'milk_batch',
          entity_id:   batchId,
          description: `${profile.full_name || 'User'} edited milk batch "${data.batch_number}" (${data.freezer_shelf}, ${data.remaining_bags} bags).`
        });
      } catch (auditErr) {
        console.warn(`${MODULE} Audit log failed for batch edit:`, auditErr);
      }
    }

    return { data, error: null };
  } catch (err) {
    console.error(`${MODULE} updateMilkBatch error:`, err);
    return { data: null, error: err.message || 'Failed to update batch details.' };
  }
}

/**
 * Delete a milk batch (from Delete Modal)
 */
export async function deleteMilkBatch(batchId, batchNumber, profile = null) {
  try {
    const { error } = await supabase
      .from('milk_batches')
      .delete()
      .eq('id', batchId);

    if (error) throw error;

    // Audit log
    if (profile?.id) {
      try {
        await supabase.from('audit_logs').insert({
          user_id:     profile.id,
          action:      AUDIT_ACTIONS.DELETE_MILK_BATCH,
          entity_type: 'milk_batch',
          entity_id:   batchId,
          description: `${profile.full_name || 'User'} deleted milk batch "${batchNumber || batchId}".`
        });
      } catch (auditErr) {
        console.warn(`${MODULE} Audit log failed for batch delete:`, auditErr);
      }
    }

    return { error: null };
  } catch (err) {
    console.error(`${MODULE} deleteMilkBatch error:`, err);
    return { error: err.message || 'Failed to delete milk batch.' };
  }
}

// ── Multi-Freezer & Shelf Customization ──────────────────────────────────────

const FREEZERS_KEY = 'nutrivision_milk_freezers_v2';
const ACTIVE_FREEZER_KEY = 'nutrivision_active_freezer_v2';

const DEFAULT_FREEZERS = [
  {
    id: 'freezer-1',
    name: 'Upright Freezer A',
    shelves: ['Shelf 1', 'Shelf 2', 'Shelf 3', 'Shelf 4', 'Shelf 5', 'Shelf 6', 'Shelf 7']
  }
];

export function getFreezers() {
  try {
    const stored = localStorage.getItem(FREEZERS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn(`${MODULE} getFreezers parse error:`, e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_FREEZERS));
}

export function saveFreezers(freezers) {
  try {
    localStorage.setItem(FREEZERS_KEY, JSON.stringify(freezers));
  } catch (e) {
    console.error(`${MODULE} saveFreezers error:`, e);
  }
}

export function getActiveFreezerId() {
  const freezers = getFreezers();
  const stored = localStorage.getItem(ACTIVE_FREEZER_KEY);
  if (stored && freezers.some(f => f.id === stored)) {
    return stored;
  }
  return freezers[0]?.id || 'freezer-1';
}

export function setActiveFreezerId(id) {
  localStorage.setItem(ACTIVE_FREEZER_KEY, id);
}

export function addFreezer(name, profile = null) {
  const freezers = getFreezers();
  const trimmedName = name?.trim() || `Freezer ${String.fromCharCode(65 + freezers.length)}`;
  const newFreezer = {
    id: `freezer-${Date.now()}`,
    name: trimmedName,
    shelves: ['Shelf 1', 'Shelf 2', 'Shelf 3', 'Shelf 4']
  };
  freezers.push(newFreezer);
  saveFreezers(freezers);
  setActiveFreezerId(newFreezer.id);

  if (profile?.id) {
    logMilkAudit(
      AUDIT_ACTIONS.CREATE_FREEZER_UNIT,
      'cold_chain',
      newFreezer.id,
      `Added new cold-chain freezer unit "${trimmedName}" (4 shelves).`,
      profile
    );
  }
  return freezers;
}

export function renameFreezer(id, newName, profile = null) {
  const freezers = getFreezers();
  const freezer = freezers.find(f => f.id === id);
  if (freezer && newName?.trim()) {
    const oldName = freezer.name;
    freezer.name = newName.trim();
    saveFreezers(freezers);

    if (profile?.id) {
      logMilkAudit(
        AUDIT_ACTIONS.UPDATE_FREEZER_UNIT,
        'cold_chain',
        id,
        `Renamed freezer unit from "${oldName}" to "${freezer.name}".`,
        profile
      );
    }
  }
  return freezers;
}

export function deleteFreezer(id, profile = null) {
  let freezers = getFreezers();
  if (freezers.length <= 1) return freezers; // Keep at least one freezer
  const target = freezers.find(f => f.id === id);
  freezers = freezers.filter(f => f.id !== id);
  saveFreezers(freezers);
  setActiveFreezerId(freezers[0].id);

  if (profile?.id && target) {
    logMilkAudit(
      AUDIT_ACTIONS.DELETE_FREEZER_UNIT,
      'cold_chain',
      id,
      `Deleted cold-chain freezer unit "${target.name}".`,
      profile
    );
  }
  return freezers;
}

export function addShelfToFreezer(freezerId, customName) {
  const freezers = getFreezers();
  const freezer = freezers.find(f => f.id === freezerId) || freezers[0];
  if (!freezer) return getFreezerShelves();

  const name = customName?.trim() || `Shelf ${freezer.shelves.length + 1}`;
  if (!freezer.shelves.includes(name)) {
    freezer.shelves.push(name);
    saveFreezers(freezers);
  }
  return freezer.shelves;
}

export function removeShelfFromFreezer(freezerId, shelfName) {
  const freezers = getFreezers();
  const freezer = freezers.find(f => f.id === freezerId) || freezers[0];
  if (!freezer || freezer.shelves.length <= 2) return freezer?.shelves || [];

  if (shelfName) {
    freezer.shelves = freezer.shelves.filter(s => s !== shelfName);
  } else {
    freezer.shelves.pop();
  }
  saveFreezers(freezers);
  return freezer.shelves;
}

/**
 * Robustly parses a batch's freezer_shelf string into { freezerName, freezerId, shelfName }
 * Batches without a prefix strictly belong to the primary default freezer (Freezer A).
 */
export function getBatchFreezerAndShelf(batch, freezers = []) {
  const activeFreezers = freezers.length > 0 ? freezers : getFreezers();
  const defaultFreezer = activeFreezers[0] || { id: 'freezer-1', name: 'Upright Freezer A', shelves: ['Shelf 1', 'Shelf 2', 'Shelf 3', 'Shelf 4'] };
  const raw = (batch?.freezer_shelf || '').trim();

  if (raw.includes(' / ')) {
    const parts = raw.split(' / ');
    const fName = parts[0].trim();
    const sName = parts.slice(1).join(' / ').trim();
    const matched = activeFreezers.find(f => f.name.toLowerCase() === fName.toLowerCase());
    return {
      freezerName: matched ? matched.name : fName,
      freezerId: matched ? matched.id : null,
      shelfName: sName || 'Shelf 1'
    };
  }

  // Legacy or un-prefixed batch belongs strictly to default first freezer
  return {
    freezerName: defaultFreezer.name,
    freezerId: defaultFreezer.id,
    shelfName: raw || 'Shelf 1'
  };
}

export function formatFreezerShelf(freezerName, shelfName) {
  if (!freezerName) return shelfName || 'Shelf 1';
  return `${freezerName.trim()} / ${(shelfName || 'Shelf 1').trim()}`;
}

/**
 * Calculates current bag distribution across shelves for a specific freezer.
 * Accounts for 20-bag shelf limit and roll-over overflow, optionally excluding a specific batchId.
 */
export function getFreezerShelfAllocations(freezerName, batches = [], freezers = [], excludeBatchId = null) {
  const activeFreezers = freezers.length > 0 ? freezers : getFreezers();
  const freezer = activeFreezers.find(f => f.name.toLowerCase() === (freezerName || '').toLowerCase()) || activeFreezers[0];
  const configuredShelves = (freezer && freezer.shelves && freezer.shelves.length > 0)
    ? [...freezer.shelves]
    : ['Shelf 1', 'Shelf 2', 'Shelf 3', 'Shelf 4'];

  const allocations = configuredShelves.map(name => ({
    shelfName: name,
    usedBags: 0,
    batches: []
  }));

  const activeBatches = batches.filter(b => {
    if (!b || (b.remaining_bags !== undefined && b.remaining_bags <= 0)) return false;
    if (excludeBatchId && b.id === excludeBatchId) return false;
    const loc = getBatchFreezerAndShelf(b, activeFreezers);
    return loc.freezerName.toLowerCase() === (freezer ? freezer.name.toLowerCase() : '');
  });

  // Sort by expiry_date (FEFO) with tie-breakers: earlier pasteurization, lower batch number, created_at
  activeBatches.sort((a, b) => {
    const diffExpiry = new Date(a.expiry_date || 0) - new Date(b.expiry_date || 0);
    if (diffExpiry !== 0) return diffExpiry;
    const diffPast = new Date(a.date_pasteurized || 0) - new Date(b.date_pasteurized || 0);
    if (diffPast !== 0) return diffPast;
    const numA = parseInt((a.batch_number || '').replace(/\D/g, ''), 10) || 0;
    const numB = parseInt((b.batch_number || '').replace(/\D/g, ''), 10) || 0;
    if (numA !== numB) return numA - numB;
    return new Date(a.created_at || 0) - new Date(b.created_at || 0);
  });

  activeBatches.forEach(b => {
    const loc = getBatchFreezerAndShelf(b, activeFreezers);
    let startIdx = allocations.findIndex(s => s.shelfName.toLowerCase() === loc.shelfName.toLowerCase());
    if (startIdx === -1) startIdx = 0;

    let remaining = b.remaining_bags !== undefined ? b.remaining_bags : (b.total_bags || 0);
    let currIdx = startIdx;

    while (remaining > 0) {
      if (currIdx >= allocations.length) {
        allocations.push({
          shelfName: `Shelf ${allocations.length + 1}`,
          usedBags: 0,
          batches: []
        });
      }

      const shelfObj = allocations[currIdx];
      const avail = Math.max(0, 20 - shelfObj.usedBags);
      if (avail > 0) {
        const place = Math.min(avail, remaining);
        shelfObj.batches.push({ batch: b, bags: place });
        shelfObj.usedBags += place;
        remaining -= place;
      }
      currIdx++;
    }
  });

  return allocations;
}

/**
 * Returns total bags currently on a specific shelf in a freezer.
 */
export function getShelfLoad(freezerName, shelfName, batches = [], freezers = [], excludeBatchId = null) {
  const allocations = getFreezerShelfAllocations(freezerName, batches, freezers, excludeBatchId);
  const found = allocations.find(s => s.shelfName.toLowerCase() === (shelfName || '').toLowerCase());
  return found ? found.usedBags : 0;
}

/**
 * Computes the actual physical shelf location(s) where a batch's bags reside in the freezer,
 * taking into account 20-bag shelf limits, prior batches filling shelves, and multi-shelf roll-over.
 */
export function getBatchActualShelfInfo(batch, batches = [], freezers = []) {
  if (!batch) {
    return {
      freezerName: 'Upright Freezer A',
      startingShelf: 'Shelf 1',
      shelfDisplay: 'Shelf 1',
      shelves: ['Shelf 1']
    };
  }

  const parsed = getBatchFreezerAndShelf(batch, freezers);
  const allocations = getFreezerShelfAllocations(parsed.freezerName, batches, freezers, null);

  const holdingShelves = [];
  allocations.forEach(shelf => {
    const hasBatch = shelf.batches && shelf.batches.some(item => item.batch && item.batch.id === batch.id && item.bags > 0);
    if (hasBatch) {
      holdingShelves.push(shelf.shelfName);
    }
  });

  if (holdingShelves.length === 0) {
    return {
      freezerName: parsed.freezerName,
      startingShelf: parsed.shelfName,
      shelfDisplay: parsed.shelfName,
      shelves: [parsed.shelfName]
    };
  }

  const startingShelf = holdingShelves[0];
  let shelfDisplay = startingShelf;
  if (holdingShelves.length > 1) {
    const lastShelf = holdingShelves[holdingShelves.length - 1];
    shelfDisplay = `${startingShelf} – ${lastShelf}`;
  }

  return {
    freezerName: parsed.freezerName,
    startingShelf,
    shelfDisplay,
    shelves: holdingShelves
  };
}

// Backward-compatible shelf functions
export function getFreezerShelves() {
  const activeId = getActiveFreezerId();
  const freezers = getFreezers();
  const active = freezers.find(f => f.id === activeId) || freezers[0];
  return active ? active.shelves : [...SHELF_LOCATIONS];
}

export function saveFreezerShelves(shelves) {
  const activeId = getActiveFreezerId();
  const freezers = getFreezers();
  const active = freezers.find(f => f.id === activeId) || freezers[0];
  if (active) {
    active.shelves = shelves;
    saveFreezers(freezers);
  }
}

export function addFreezerShelf(customName) {
  return addShelfToFreezer(getActiveFreezerId(), customName);
}

export function removeFreezerShelf(shelfName) {
  return removeShelfFromFreezer(getActiveFreezerId(), shelfName);
}

// ── Bulk Insert Helpers ─────────────────────────────────────────────────────

/**
 * Bulk create multiple donation intake rows at once
 */
export async function createMilkDonationsBulk(donationList, profileId, profileName) {
  try {
    const formatted = donationList.map(d => ({
      donor_code: d.donor_code.trim(),
      bags_count: d.bags_count ? parseInt(d.bags_count, 10) : 1,
      volume_ml: d.volume_ml ? parseInt(d.volume_ml, 10) : null,
      expression_date_notes: d.expression_date_notes?.trim() || '@see donor log',
      expression_time: d.expression_time?.trim() || null,
      transport_date: d.transport_date?.trim() || null,
      transport_time: d.transport_time || '12:00 PM',
      condition_at_collection: d.condition_at_collection || 'ok',
      arrival_date: d.arrival_date || new Date().toISOString().split('T')[0],
      arrival_time: d.arrival_time || '12:30 PM',
      condition_at_arrival: d.condition_at_arrival || 'ok',
      transport_condition: d.transport_condition?.trim() || null,
      status: 'stored_raw',
      received_by: profileId || null,
      received_by_name: profileName || null
    }));

    const { data, error } = await supabase
      .from('milk_donations')
      .insert(formatted)
      .select();

    if (error) throw error;

    // Record audit trail
    if (profileId) {
      await logMilkAudit(
        AUDIT_ACTIONS.CREATE_MILK_DONATION,
        'milk_donation',
        null,
        `Bulk logged ${donationList.length} raw donor milk intake entries.`,
        { id: profileId, full_name: profileName }
      );
    }

    return { data, error: null };
  } catch (err) {
    console.error(`${MODULE} createMilkDonationsBulk error:`, err);
    return { data: null, error: err.message || 'Failed to bulk-save intake rows.' };
  }
}

/**
 * Bulk create multiple pasteurized batches at once
 */
export async function createMilkBatchesBulk(batchList, profileId, profileName = null) {
  try {
    const formatted = batchList.map(b => {
      const numBags = parseInt(b.total_bags, 10);
      return {
        batch_number: b.batch_number.trim().toUpperCase(),
        date_pasteurized: b.date_pasteurized,
        expiry_date: b.expiry_date,
        total_bags: numBags,
        remaining_bags: numBags,
        freezer_shelf: b.freezer_shelf || 'Shelf 1',
        status: 'available',
        remarks: b.remarks?.trim() || null,
        created_by: profileId || null
      };
    });

    const { data, error } = await supabase
      .from('milk_batches')
      .insert(formatted)
      .select();

    if (error) throw error;

    // Record audit trail
    if (profileId) {
      await logMilkAudit(
        AUDIT_ACTIONS.CREATE_MILK_BATCH,
        'milk_batch',
        null,
        `Bulk created ${batchList.length} pasteurized batch(es) in cold storage.`,
        { id: profileId, full_name: profileName }
      );
    }

    return { data, error: null };
  } catch (err) {
    console.error(`${MODULE} createMilkBatchesBulk error:`, err);
    return { data: null, error: err.message || 'Failed to bulk-save batches.' };
  }
}

/**
 * Find the FEFO priority batch (earliest expiration among active batches with remaining bags)
 */
export function getFefoPriorityBatch(batches = []) {
  const available = (batches || []).filter(b => (b.remaining_bags || 0) > 0 && b.expiry_date);
  if (available.length === 0) return null;

  return available.slice().sort((a, b) => {
    // 1. Primary: Earliest expiration date (FEFO)
    const diffExpiry = new Date(a.expiry_date) - new Date(b.expiry_date);
    if (diffExpiry !== 0) return diffExpiry;

    // 2. Tie-breaker 1: Earlier pasteurization date (FIFO)
    const diffPast = new Date(a.date_pasteurized || 0) - new Date(b.date_pasteurized || 0);
    if (diffPast !== 0) return diffPast;

    // 3. Tie-breaker 2: Lower numeric batch number (e.g., BM-096 before BM-097)
    const numA = parseInt((a.batch_number || '').replace(/\D/g, ''), 10) || 0;
    const numB = parseInt((b.batch_number || '').replace(/\D/g, ''), 10) || 0;
    if (numA !== numB) return numA - numB;

    // 4. Tie-breaker 3: Earlier creation timestamp
    return new Date(a.created_at || 0) - new Date(b.created_at || 0);
  })[0];
}
