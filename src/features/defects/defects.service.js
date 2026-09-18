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
 *   actionTaken: 'Disposed'|'Quarantined',
 *   remarks: string
 * }} incidentData
 * @param {Object} profile - logged-in user profile
 * @returns {Promise<{ data: Object|null, error: string|null }>}
 */
export async function logDefectIncident(incidentData, profile) {
  const { batchId, classification, quantityAffected, actionTaken, remarks } = incidentData;

  try {
    // 1. Insert the incident record
    const { data: incident, error: insertErr } = await supabase
      .from('defect_incidents')
      .insert({
        batch_id:          batchId,
        classification,
        quantity_affected: quantityAffected,
        action_taken:      actionTaken,
        remarks:           remarks || null,
        reported_by:       profile.id,
        reported_at:       new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // 2. Update the batch status to remove it from active inventory
    const newStatus = actionTaken === 'Disposed'
      ? RECORD_STATUS.DISPOSED
      : RECORD_STATUS.QUARANTINED;

    const { error: updateErr } = await supabase
      .from('batches')
      .update({ record_status: newStatus })
      .eq('id', batchId);

    if (updateErr) throw updateErr;

    // 3. Audit log
    await supabase.from('audit_logs').insert({
      user_id:     profile.id,
      action:      AUDIT_ACTIONS.FLAG_DEFECT,
      entity_type: 'batch',
      entity_id:   batchId,
      description: `${actionTaken} batch. Classification: ${classification}. Qty affected: ${quantityAffected}.`,
    }).catch(e => console.warn(`${MODULE} audit log failed (non-blocking):`, e));

    console.log(`${MODULE} logDefectIncident: incident ${incident.id} logged, batch ${batchId} → ${newStatus}`);
    return { data: incident, error: null };
  } catch (err) {
    console.error(`${MODULE} logDefectIncident:`, err);
    return { data: null, error: err.message || 'Failed to log incident.' };
  }
}
