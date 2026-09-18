/**
 * Defects & Quarantine Service
 * All Supabase interactions for the Defect & Quarantine Log module.
 */

import { supabase } from '../../core/supabase.js';
import { RECORD_STATUS, AUDIT_ACTIONS } from '../../shared/constants/app.constants.js';

const MODULE = '[DefectsService]';

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Fetch all ACTIVE batches for the batch search/selector.
 * Returns id, batch_number, quantity, commodity name + unit.
 */
export async function fetchActiveBatchesForSelector() {
  try {
    const { data, error } = await supabase
      .from('batches')
      .select(`
        id, batch_number, quantity, expiration_date,
        commodities!inner ( id, name, unit, deleted_at )
      `)
      .eq('record_status', RECORD_STATUS.ACTIVE)
      .is('deleted_at', null)
      .order('batch_number', { ascending: true });

    if (error) throw error;

    // Client-side: exclude batches whose commodity was soft-deleted
    const clean = (data || []).filter(b => b.commodities && !b.commodities.deleted_at);
    console.log(`${MODULE} fetchActiveBatchesForSelector: ${clean.length} batches`);
    return { data: clean, error: null };
  } catch (err) {
    console.error(`${MODULE} fetchActiveBatchesForSelector:`, err);
    return { data: [], error: 'Failed to load active batches.' };
  }
}

/**
 * Fetch all defect incidents, newest first, with batch + commodity info.
 * @param {'all'|'Disposed'|'Quarantined'} filter
 */
export async function fetchDefectIncidents(filter = 'all') {
  try {
    let query = supabase
      .from('defect_incidents')
      .select(`
        id, classification, quantity_affected, action_taken,
        evidence_url, remarks, reported_at, reported_by,
        scope, remaining_quarantined,
        batches!inner (
          id, batch_number, quantity,
          commodities!inner ( id, name, unit )
        )
      `)
      .order('reported_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('action_taken', filter);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Fetch reporter names
    const ids = [...new Set((data || []).map(i => i.reported_by).filter(Boolean))];
    let nameMap = {};
    if (ids.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', ids);
      nameMap = (profiles || []).reduce((acc, p) => { acc[p.id] = p.full_name; return acc; }, {});
    }

    const incidents = (data || []).map(i => ({
      ...i,
      reporter_name: nameMap[i.reported_by] || 'Unknown'
    }));

    console.log(`${MODULE} fetchDefectIncidents [${filter}]: ${incidents.length} rows`);
    return { data: incidents, error: null };
  } catch (err) {
    console.error(`${MODULE} fetchDefectIncidents:`, err);
    return { data: [], error: 'Failed to load defect incidents.' };
  }
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Log a defect incident and update the batch status.
 * Called ONLY after user confirms print in the preview modal.
 *
 * @param {{
 *   batchId: string,
 *   classification: string,
 *   quantityAffected: number,
 *   actionTaken: 'Dispose'|'Quarantine'|'Dispose Entire Batch'|'Quarantine Entire Batch',
 *   remarks: string
 * }} incidentData
 * @param {Object} profile - logged-in user profile
 * @returns {Promise<{ data: Object|null, error: string|null }>}
 */
export async function logDefectIncident(incidentData, profile) {
  const { batchId, classification, quantityAffected, actionTaken, remarks } = incidentData;

  const dbActionTaken = actionTaken.includes('Dispose') ? 'Disposed' : 'Quarantined';
  const scope = actionTaken.includes('Entire Batch') ? 'entire_batch' : 'partial';
  const remainingQuarantined = dbActionTaken === 'Quarantined' ? quantityAffected : null;

  try {
    // 1. Insert the incident record
    const { data: incident, error: insertErr } = await supabase
      .from('defect_incidents')
      .insert({
        batch_id:          batchId,
        classification,
        quantity_affected: quantityAffected,
        action_taken:      dbActionTaken,
        scope,
        remaining_quarantined: remainingQuarantined,
        remarks:           remarks || null,
        reported_by:       profile.id,
        reported_at:       new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // 2. Fetch current quantity to compute remainder
    const { data: current, error: fetchErr } = await supabase
      .from('batches')
      .select('quantity, record_status')
      .eq('id', batchId)
      .single();

    if (fetchErr) throw fetchErr;

    // Calculate new quantity
    const newQuantity = scope === 'entire_batch' 
      ? 0 
      : Math.max(0, (current.quantity || 0) - quantityAffected);

    // Calculate new status
    let newStatus = current.record_status;
    if (newQuantity === 0 || scope === 'entire_batch') {
      newStatus = dbActionTaken; // 'Disposed' or 'Quarantined'
    } else {
      newStatus = RECORD_STATUS.ACTIVE;
    }

    const { error: updateErr } = await supabase
      .from('batches')
      .update({ record_status: newStatus, quantity: newQuantity })
      .eq('id', batchId);

    if (updateErr) throw updateErr;

    // 3. Audit log (best-effort, non-blocking)
    try {
      await supabase.from('audit_logs').insert({
        user_id:     profile.id,
        action:      AUDIT_ACTIONS.FLAG_DEFECT,
        entity_type: 'batch',
        entity_id:   batchId,
        description: `${actionTaken} batch. Classification: ${classification}. Qty affected: ${quantityAffected}.`,
      });
    } catch (auditErr) {
      console.warn(`${MODULE} audit log failed (non-blocking):`, auditErr);
    }

    console.log(`${MODULE} logDefectIncident: incident ${incident.id} logged, batch ${batchId} → ${newStatus}`);
    return { data: incident, error: null };
  } catch (err) {
    console.error(`${MODULE} logDefectIncident:`, err);
    return { data: null, error: err.message || 'Failed to log incident.' };
  }
}

/**
 * Restores a quantity of quarantined items back to the active batch.
 */
export async function restoreFromQuarantine(incidentId, batchId, restoreQty, profile, notes = '') {
  try {
    // 1. Fetch current incident and batch state
    const [ { data: incident, error: incErr }, { data: batch, error: batchErr } ] = await Promise.all([
      supabase.from('defect_incidents').select('remaining_quarantined, quantity_affected').eq('id', incidentId).single(),
      supabase.from('batches').select('quantity, record_status').eq('id', batchId).single()
    ]);

    if (incErr) throw incErr;
    if (batchErr) throw batchErr;

    const remaining = incident.remaining_quarantined !== null 
      ? incident.remaining_quarantined 
      : incident.quantity_affected;

    if (remaining < restoreQty) {
      throw new Error('Restore quantity exceeds remaining quarantined stock.');
    }

    // 2. Update incident remaining_quarantined
    const newRemaining = remaining - restoreQty;
    const { error: incUpdateErr } = await supabase
      .from('defect_incidents')
      .update({ remaining_quarantined: newRemaining })
      .eq('id', incidentId);
      
    if (incUpdateErr) throw incUpdateErr;

    // 3. Update batch quantity and status
    const newBatchQty = batch.quantity + restoreQty;
    let newBatchStatus = batch.record_status;
    
    // If the batch receives restored stock, it becomes Active again
    // (Regardless of whether it was Quarantined, Disposed, or Depleted)
    if (newBatchQty > 0) {
      newBatchStatus = RECORD_STATUS.ACTIVE;
    }

    const { error: batchUpdateErr } = await supabase
      .from('batches')
      .update({ quantity: newBatchQty, record_status: newBatchStatus })
      .eq('id', batchId);
      
    if (batchUpdateErr) throw batchUpdateErr;

    // 4. Log the restore in defect_restores
    const { error: restoreErr } = await supabase
      .from('defect_restores')
      .insert({
        incident_id: incidentId,
        batch_id: batchId,
        restored_quantity: restoreQty,
        restored_by: profile.id,
        notes: notes || null
      });

    if (restoreErr) throw restoreErr;

    // 5. Audit Log (best-effort)
    try {
      await supabase.from('audit_logs').insert({
        user_id: profile.id,
        action: AUDIT_ACTIONS.RESTORE_QUARANTINE,
        entity_type: 'batch',
        entity_id: batchId,
        description: `Restored ${restoreQty} units from quarantine.`
      });
    } catch (auditErr) {
      console.warn(`${MODULE} audit log failed:`, auditErr);
    }

    console.log(`${MODULE} restored ${restoreQty} units to batch ${batchId}`);
    return { error: null };
  } catch (err) {
    console.error(`${MODULE} restoreFromQuarantine:`, err);
    return { error: err.message || 'Failed to restore quarantine stock.' };
  }
}
