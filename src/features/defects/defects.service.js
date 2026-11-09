/**
 * Defects & Quarantine Service
 * All Supabase interactions for the Defect & Quarantine Log module.
 */

import { supabase } from '../../core/supabase.js';
import { RECORD_STATUS, AUDIT_ACTIONS } from '../../shared/constants/app.constants.js';
import { upgradeLegacyBatchCodes } from '../batches/batches.service.js';

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
 * @param {'all'|'Returned'|'Spoiled'|'Quarantined'|'Disposed'} filter
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
          id, batch_number, quantity, commodity_id, delivery_date, expiration_date, supplier, created_at,
          commodities!inner ( id, name, commodity_code, unit, category )
        )
      `)
      .order('reported_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    // Fetch reporter names
    const ids = [...new Set((data || []).map(i => i.reported_by).filter(Boolean))];
    let nameMap = {};
    if (ids.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', ids);
      nameMap = (profiles || []).reduce((acc, p) => { acc[p.id] = p.full_name; return acc; }, {});
    }

    // Auto-upgrade legacy batch codes on referenced batches
    const batchList = (data || []).map(i => i.batches).filter(Boolean);
    await upgradeLegacyBatchCodes(batchList);

    const incidents = (data || []).map(i => {
      let resolvedAction = i.action_taken;
      if (i.action_taken === 'Returned' || i.action_taken === 'Spoiled') {
        resolvedAction = i.action_taken;
      } else if (i.remarks && i.remarks.startsWith('[Action: Returned]')) {
        resolvedAction = 'Returned';
      } else if (i.remarks && i.remarks.startsWith('[Action: Spoiled]')) {
        resolvedAction = 'Spoiled';
      }

      // Clean display remarks if action tag was prepended
      let cleanRemarks = i.remarks || '';
      if (cleanRemarks.startsWith('[Action: Returned]\n')) {
        cleanRemarks = cleanRemarks.replace('[Action: Returned]\n', '');
      } else if (cleanRemarks.startsWith('[Action: Spoiled]\n')) {
        cleanRemarks = cleanRemarks.replace('[Action: Spoiled]\n', '');
      }

      return {
        ...i,
        resolved_action: resolvedAction,
        display_remarks: cleanRemarks,
        reporter_name:   nameMap[i.reported_by] || 'Unknown'
      };
    });

    const filtered = filter === 'all'
      ? incidents
      : incidents.filter(i => {
          if (filter === 'Returned') return i.resolved_action === 'Returned';
          if (filter === 'Spoiled')  return i.resolved_action === 'Spoiled';
          if (filter === 'Quarantined') return i.resolved_action === 'Quarantined';
          if (filter === 'Disposed') return i.resolved_action === 'Disposed';
          return i.resolved_action === filter || i.action_taken === filter;
        });

    console.log(`${MODULE} fetchDefectIncidents [${filter}]: ${filtered.length} rows`);
    return { data: filtered, error: null };
  } catch (err) {
    console.error(`${MODULE} fetchDefectIncidents:`, err);
    return { data: [], error: 'Failed to load defect incidents.' };
  }
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Log a defect incident and update the batch status.
 * Supports:
 *   - 'Returned' (Returned to LGU / Supplier)
 *   - 'Spoiled'  (In-House Spoilage / Condemned for Nutribun & kitchen prep)
 *   - 'Quarantined' & 'Disposed' (legacy compatibility)
 *
 * Automatically falls back to DB-supported actions with metadata tag
 * if Supabase constraint hasn't been migrated yet.
 */
export async function logDefectIncident(incidentData, profile) {
  const { batchId, classification, quantityAffected, actionTaken, remarks, imageData } = incidentData;

  const lowerAction   = String(actionTaken || '').toLowerCase();
  const isEntireBatch = lowerAction.includes('entire');
  const scope         = isEntireBatch ? 'entire_batch' : 'partial';

  let primaryAction = 'Returned';
  if (lowerAction.includes('spoil')) {
    primaryAction = 'Spoiled';
  } else if (lowerAction.includes('quarantin')) {
    primaryAction = 'Quarantined';
  } else if (lowerAction.includes('dispos')) {
    primaryAction = 'Disposed';
  } else {
    primaryAction = 'Returned';
  }

  const remainingQuarantined = primaryAction === 'Quarantined' ? quantityAffected : null;
  let finalRemarks = remarks ? String(remarks).trim() : null;

  try {
    // 1. Try to insert with primaryAction
    let incident = null;
    const { data: directData, error: insertErr } = await supabase
      .from('defect_incidents')
      .insert({
        batch_id:              batchId,
        classification,
        quantity_affected:     quantityAffected,
        action_taken:          primaryAction,
        scope,
        remaining_quarantined: remainingQuarantined,
        remarks:               finalRemarks,
        evidence_url:          imageData || null,
        reported_by:           profile.id,
        reported_at:           new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) {
      // Check if constraint error (table check constraint rejects 'Returned' or 'Spoiled')
      const isConstraintErr = insertErr.code === '23514' || String(insertErr.message).includes('defect_incidents_action_taken_check');
      if (isConstraintErr) {
        console.warn(`${MODULE} Migration 13 pending in DB. Falling back to Disposed with [Action: ${primaryAction}] metadata.`);
        const fallbackDbAction = primaryAction === 'Quarantined' ? 'Quarantined' : 'Disposed';
        const taggedRemarks = `[Action: ${primaryAction}]\n${finalRemarks || ''}`.trim();
        const retry = await supabase
          .from('defect_incidents')
          .insert({
            batch_id:              batchId,
            classification,
            quantity_affected:     quantityAffected,
            action_taken:          fallbackDbAction,
            scope,
            remaining_quarantined: fallbackDbAction === 'Quarantined' ? quantityAffected : null,
            remarks:               taggedRemarks,
            evidence_url:          imageData || null,
            reported_by:           profile.id,
            reported_at:           new Date().toISOString(),
          })
          .select()
          .single();
        if (retry.error) throw retry.error;
        incident = retry.data;
      } else {
        throw insertErr;
      }
    } else {
      incident = directData;
    }

    // 2. Update batch inventory quantity and status
    const { data: current, error: fetchErr } = await supabase
      .from('batches')
      .select('quantity, record_status')
      .eq('id', batchId)
      .single();

    if (fetchErr) throw fetchErr;

    const newQuantity = scope === 'entire_batch'
      ? 0
      : Math.max(0, (current.quantity || 0) - quantityAffected);

    let newStatus = current.record_status;
    if (newQuantity === 0 || scope === 'entire_batch') {
      newStatus = primaryAction === 'Quarantined' ? RECORD_STATUS.QUARANTINED : RECORD_STATUS.DISPOSED;
    } else {
      newStatus = RECORD_STATUS.ACTIVE;
    }

    const { error: updateErr } = await supabase
      .from('batches')
      .update({ record_status: newStatus, quantity: newQuantity })
      .eq('id', batchId);

    if (updateErr) throw updateErr;

    // 3. Audit log (best-effort)
    try {
      await supabase.from('audit_logs').insert({
        user_id:     profile.id,
        action:      AUDIT_ACTIONS.FLAG_DEFECT,
        entity_type: 'batch',
        entity_id:   batchId,
        description: `${primaryAction} batch (${scope}). Classification: ${classification}. Qty affected: ${quantityAffected}.`,
      });
    } catch (auditErr) {
      console.warn(`${MODULE} audit log failed (non-blocking):`, auditErr);
    }

    console.log(`${MODULE} logDefectIncident: incident ${incident?.id} logged (${primaryAction}), batch ${batchId} → ${newStatus}`);
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
