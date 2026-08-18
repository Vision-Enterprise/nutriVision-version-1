/**
 * Batch Management Service
 *
 * All Supabase interactions for the Batch Management feature.
 * Each mutating operation writes an audit log entry.
 */

import { supabase } from '../../core/supabase.js';
import { AUDIT_ACTIONS } from '../../shared/constants/app.constants.js';

// ── Read ─────────────────────────────────────────────────────────────────────

/**
 * Fetch all active batches with their parent commodity details.
 * Ordered by expiration_date ascending so soonest-expiring appear first.
 * @returns {Promise<{ batches: Array, error: string|null }>}
 */
export async function fetchBatches() {
  try {
    const { data, error } = await supabase
      .from('batches')
      .select(`
        id, batch_number, quantity,
        delivery_date, expiration_date,
        supplier, notes, commodity_id,
        commodities (
          id, name, commodity_code, unit
        )
      `)
      .is('deleted_at', null)
      .order('expiration_date', { ascending: true });

    if (error) throw error;
    return { batches: data, error: null };
  } catch (err) {
    console.error('[BatchService] fetchBatches:', err);
    return { batches: [], error: 'Failed to load batches.' };
  }
}

/**
 * Fetch all active commodities for use in the batch form dropdown.
 * @returns {Promise<{ commodities: Array, error: string|null }>}
 */
export async function fetchActiveCommodities() {
  try {
    const { data, error } = await supabase
      .from('commodities')
      .select('id, name, commodity_code, unit')
      .is('deleted_at', null)
      .order('name');

    if (error) throw error;
    return { commodities: data, error: null };
  } catch (err) {
    console.error('[BatchService] fetchActiveCommodities:', err);
    return { commodities: [], error: 'Failed to load commodities.' };
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

/**
 * Insert a new batch record and write an audit log entry.
 * @param {{ commodity_id, batch_number, quantity, delivery_date, expiration_date, supplier, notes }} formData
 * @param {Object} profile
 * @returns {Promise<{ batch: Object|null, error: string|null }>}
 */
export async function createBatch(formData, profile) {
  try {
    const { data, error } = await supabase
      .from('batches')
      .insert({
        commodity_id:    formData.commodity_id,
        batch_number:    formData.batch_number.trim().toUpperCase(),
        quantity:        parseInt(formData.quantity, 10),
        delivery_date:   formData.delivery_date,
        expiration_date: formData.expiration_date,
        supplier:        formData.supplier?.trim()  || null,
        notes:           formData.notes?.trim()     || null,
        created_by:      profile.id,
      })
      .select(`
        id, batch_number, quantity,
        delivery_date, expiration_date,
        supplier, notes, commodity_id,
        commodities ( id, name, commodity_code, unit )
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        return { batch: null, error: 'A batch with this number already exists for this commodity.' };
      }
      throw error;
    }

    await supabase.from('audit_logs').insert({
      user_id:     profile.id,
      action:      AUDIT_ACTIONS.CREATE_BATCH,
      entity_type: 'batch',
      entity_id:   data.id,
      description: `${profile.full_name} added batch "${data.batch_number}" for ${data.commodities.name}.`,
    });

    return { batch: data, error: null };
  } catch (err) {
    console.error('[BatchService] createBatch:', err);
    return { batch: null, error: 'Failed to create batch. Please try again.' };
  }
}

// ── Update ────────────────────────────────────────────────────────────────────

/**
 * Update an existing batch record and write an audit log entry.
 * @param {string} id
 * @param {Object} formData
 * @param {Object} profile
 * @returns {Promise<{ batch: Object|null, error: string|null }>}
 */
export async function updateBatch(id, formData, profile) {
  try {
    const { data, error } = await supabase
      .from('batches')
      .update({
        commodity_id:    formData.commodity_id,
        batch_number:    formData.batch_number.trim().toUpperCase(),
        quantity:        parseInt(formData.quantity, 10),
        delivery_date:   formData.delivery_date,
        expiration_date: formData.expiration_date,
        supplier:        formData.supplier?.trim()  || null,
        notes:           formData.notes?.trim()     || null,
        updated_by:      profile.id,
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select(`
        id, batch_number, quantity,
        delivery_date, expiration_date,
        supplier, notes, commodity_id,
        commodities ( id, name, commodity_code, unit )
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        return { batch: null, error: 'A batch with this number already exists for this commodity.' };
      }
      throw error;
    }

    await supabase.from('audit_logs').insert({
      user_id:     profile.id,
      action:      AUDIT_ACTIONS.UPDATE_BATCH,
      entity_type: 'batch',
      entity_id:   data.id,
      description: `${profile.full_name} updated batch "${data.batch_number}" for ${data.commodities.name}.`,
    });

    return { batch: data, error: null };
  } catch (err) {
    console.error('[BatchService] updateBatch:', err);
    return { batch: null, error: 'Failed to update batch. Please try again.' };
  }
}

// ── Delete (Soft) ─────────────────────────────────────────────────────────────

/**
 * Soft-delete a batch by setting deleted_at = NOW().
 * @param {string} id
 * @param {string} batchNumber
 * @param {string} commodityName
 * @param {Object} profile
 * @returns {Promise<{ error: string|null }>}
 */
export async function deleteBatch(id, batchNumber, commodityName, profile) {
  try {
    const { error } = await supabase
      .from('batches')
      .update({ deleted_at: new Date().toISOString(), updated_by: profile.id })
      .eq('id', id);

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id:     profile.id,
      action:      AUDIT_ACTIONS.DELETE_BATCH,
      entity_type: 'batch',
      entity_id:   id,
      description: `${profile.full_name} deleted batch "${batchNumber}" for ${commodityName}.`,
    });

    return { error: null };
  } catch (err) {
    console.error('[BatchService] deleteBatch:', err);
    return { error: 'Failed to delete batch. Please try again.' };
  }
}
