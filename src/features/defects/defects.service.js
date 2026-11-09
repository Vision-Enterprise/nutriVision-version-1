/**
 * Defects & Quarantine Service
 * All Supabase interactions for the Defect & Quarantine Log module.
 * Standard SaaS log-sheet architecture (zero base64 DB bloat).
 */

import { supabase } from '../../core/supabase.js';
import { RECORD_STATUS, AUDIT_ACTIONS } from '../../shared/constants/app.constants.js';
import { upgradeLegacyBatchCodes } from '../batches/batches.service.js';

const MODULE = '[DefectsService]';

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Fetch all ACTIVE batches for the batch search/selector.
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

    const clean = (data || []).filter(b => b.commodities && !b.commodities.deleted_at);
    return { data: clean, error: null };
  } catch (err) {
    console.error(`${MODULE} fetchActiveBatchesForSelector:`, err);
    return { data: [], error: 'Failed to load active batches.' };
  }
}

/**
 * Fetch defect incidents, newest first.
 * @param {'Quarantined'|'Returned'|'Disposed'} filter
 */
export async function fetchDefectIncidents(filter = 'Quarantined') {
  try {
    const { data, error } = await supabase
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
      if (i.action_taken === 'Returned' || (i.remarks && i.remarks.startsWith('[Action: Returned]'))) {
        resolvedAction = 'Returned';
      } else if (i.action_taken === 'Quarantined') {
        resolvedAction = 'Quarantined';
      } else {
        // Disposed or legacy Spoiled
        resolvedAction = 'Disposed';
      }

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

    const filtered = incidents.filter(i => {
      if (filter === 'Quarantined') {
        if (i.resolved_action !== 'Quarantined') return false;
        const rem = i.remaining_quarantined !== null ? i.remaining_quarantined : i.quantity_affected;
        return rem > 0;
      }
      return i.resolved_action === filter;
    });

    return { data: filtered, allData: incidents, error: null };
  } catch (err) {
    console.error(`${MODULE} fetchDefectIncidents:`, err);
    return { data: [], allData: [], error: 'Failed to load defect incidents.' };
  }
}

// ─── Write: Log Incident ──────────────────────────────────────────────────────

/**
 * Log a defect incident (Quarantined, Returned, or Disposed).
 * SaaS Log Sheet: Does NOT store heavy base64 strings in the database.
 */
export async function logDefectIncident(incidentData, profile) {
  const { batchId, classification, quantityAffected, actionTaken, remarks } = incidentData;

  const lowerAction = String(actionTaken || '').toLowerCase();
  let primaryAction = 'Quarantined';
  if (lowerAction.includes('return')) {
    primaryAction = 'Returned';
  } else if (lowerAction.includes('dispos') || lowerAction.includes('spoil')) {
    primaryAction = 'Disposed';
  }

  const remainingQuarantined = primaryAction === 'Quarantined' ? quantityAffected : null;
  const finalRemarks = remarks ? String(remarks).trim() : null;

  try {
    let incident = null;
    const { data: directData, error: insertErr } = await supabase
      .from('defect_incidents')
      .insert({
        batch_id:              batchId,
        classification,
        quantity_affected:     quantityAffected,
        action_taken:          primaryAction,
        scope:                 'partial',
        remaining_quarantined: remainingQuarantined,
        remarks:               finalRemarks,
        evidence_url:          null, // Keep DB lightweight! No base64 bloat.
        reported_by:           profile.id,
        reported_at:           new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) {
      // Fallback if 'Returned' constraint not in Supabase yet
      const fallbackDbAction = primaryAction === 'Quarantined' ? 'Quarantined' : 'Disposed';
      const taggedRemarks = `[Action: ${primaryAction}]\n${finalRemarks || ''}`.trim();
      const retry = await supabase
        .from('defect_incidents')
        .insert({
          batch_id:              batchId,
          classification,
          quantity_affected:     quantityAffected,
          action_taken:          fallbackDbAction,
          scope:                 'partial',
          remaining_quarantined: fallbackDbAction === 'Quarantined' ? quantityAffected : null,
          remarks:               taggedRemarks,
          evidence_url:          null,
          reported_by:           profile.id,
          reported_at:           new Date().toISOString(),
        })
        .select()
        .single();
      if (retry.error) throw retry.error;
      incident = retry.data;
    } else {
      incident = directData;
    }

    // 2. Deduct affected units from active batch
    const { data: current, error: fetchErr } = await supabase
      .from('batches')
      .select('quantity, record_status')
      .eq('id', batchId)
      .single();

    if (fetchErr) throw fetchErr;

    const newQuantity = Math.max(0, (current.quantity || 0) - quantityAffected);
    let newStatus = current.record_status;
    if (newQuantity === 0) {
      newStatus = primaryAction === 'Quarantined' ? RECORD_STATUS.QUARANTINED : RECORD_STATUS.DISPOSED;
    }

    const { error: updateErr } = await supabase
      .from('batches')
      .update({ record_status: newStatus, quantity: newQuantity })
      .eq('id', batchId);

    if (updateErr) throw updateErr;

    // 3. Audit log
    try {
      await supabase.from('audit_logs').insert({
        user_id:     profile.id,
        action:      AUDIT_ACTIONS.FLAG_DEFECT,
        entity_type: 'batch',
        entity_id:   batchId,
        description: `Logged ${primaryAction} (${quantityAffected} units). Reason: ${classification}.`,
      });
    } catch (_) {}

    return { data: incident, error: null };
  } catch (err) {
    console.error(`${MODULE} logDefectIncident:`, err);
    return { data: null, error: err.message || 'Failed to record stock event.' };
  }
}

// ─── Write: Resolve Quarantine ────────────────────────────────────────────────

/**
 * Resolves a quarantined stock record (partial or full).
 * @param {string} incidentId
 * @param {Object} resolution
 * @param {'Restore'|'Return'|'Dispose'} resolution.outcome
 * @param {number} resolution.quantity
 * @param {string} resolution.notes
 * @param {Object} profile
 */
export async function resolveQuarantineIncident(incidentId, { outcome, quantity, notes }, profile) {
  try {
    // 1. Fetch current incident and batch
    const { data: incident, error: incErr } = await supabase
      .from('defect_incidents')
      .select('id, batch_id, remaining_quarantined, quantity_affected, classification')
      .eq('id', incidentId)
      .single();

    if (incErr) throw incErr;

    const remaining = incident.remaining_quarantined !== null
      ? incident.remaining_quarantined
      : incident.quantity_affected;

    if (quantity > remaining || quantity <= 0) {
      throw new Error(`Invalid quantity. Max available quarantined: ${remaining}`);
    }

    const batchId = incident.batch_id;
    const { data: batch, error: batchErr } = await supabase
      .from('batches')
      .select('id, quantity, record_status')
      .eq('id', batchId)
      .single();

    if (batchErr) throw batchErr;

    const newRemaining = remaining - quantity;

    // 2. Perform outcome action
    if (outcome === 'Restore') {
      // Return units to usable active stock
      const newBatchQty = (batch.quantity || 0) + quantity;
      const { error: bErr } = await supabase
        .from('batches')
        .update({ quantity: newBatchQty, record_status: RECORD_STATUS.ACTIVE })
        .eq('id', batchId);
      if (bErr) throw bErr;

      // Log in defect_restores
      try {
        await supabase.from('defect_restores').insert({
          incident_id:       incidentId,
          batch_id:          batchId,
          restored_quantity: quantity,
          restored_by:       profile.id,
          notes:             notes || null
        });
      } catch (_) {}

    } else if (outcome === 'Return') {
      // Stock leaves facility to supplier
      const taggedRemarks = `[Resolved from Quarantine #${incidentId.slice(0, 8)}] ${notes || 'Returned to supplier after quarantine review'}`;
      await supabase.from('defect_incidents').insert({
        batch_id:              batchId,
        classification:        incident.classification || 'Supplier Return',
        quantity_affected:     quantity,
        action_taken:          'Returned',
        scope:                 'partial',
        remaining_quarantined: null,
        remarks:               taggedRemarks,
        evidence_url:          null,
        reported_by:           profile.id,
        reported_at:           new Date().toISOString(),
      });

    } else if (outcome === 'Dispose') {
      // Stock condemned/destroyed
      const taggedRemarks = `[Resolved from Quarantine #${incidentId.slice(0, 8)}] ${notes || 'Condemned / disposed after quarantine review'}`;
      await supabase.from('defect_incidents').insert({
        batch_id:              batchId,
        classification:        incident.classification || 'Condemned / Defect',
        quantity_affected:     quantity,
        action_taken:          'Disposed',
        scope:                 'partial',
        remaining_quarantined: null,
        remarks:               taggedRemarks,
        evidence_url:          null,
        reported_by:           profile.id,
        reported_at:           new Date().toISOString(),
      });
    }

    // 3. Update remaining quarantined count on the original incident
    const { error: updErr } = await supabase
      .from('defect_incidents')
      .update({ remaining_quarantined: newRemaining })
      .eq('id', incidentId);

    if (updErr) throw updErr;

    // 4. Audit Log
    try {
      await supabase.from('audit_logs').insert({
        user_id:     profile.id,
        action:      AUDIT_ACTIONS.FLAG_DEFECT,
        entity_type: 'batch',
        entity_id:   batchId,
        description: `Quarantine resolution: ${outcome} ${quantity} units. Remainder: ${newRemaining}.`,
      });
    } catch (_) {}

    return { error: null, remaining: newRemaining };
  } catch (err) {
    console.error(`${MODULE} resolveQuarantineIncident:`, err);
    return { error: err.message || 'Failed to resolve quarantine stock.' };
  }
}
