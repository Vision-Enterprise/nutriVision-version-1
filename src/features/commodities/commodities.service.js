/**
 * Commodities Service
 *
 * All Supabase interactions for the Commodity Management feature.
 * Each mutating operation writes an audit log entry as part of the same call.
 */

import { supabase } from '../../core/supabase.js';
import { AUDIT_ACTIONS } from '../../shared/constants/app.constants.js';

// ── Read ────────────────────────────────────────────────────────────────────

/**
 * Fetch all active (non-deleted) commodities ordered by name.
 * @returns {Promise<{ commodities: Array, error: string|null }>}
 */
export async function fetchCommodities() {
  try {
    const { data, error } = await supabase
      .from('commodities')
      .select('id, commodity_code, name, description, category, unit, created_at')
      .is('deleted_at', null)
      .order('name');

    if (error) throw error;
    return { commodities: data, error: null };
  } catch (err) {
    console.error('[CommoditiesService] fetchCommodities:', err);
    return { commodities: [], error: 'Failed to load commodities.' };
  }
}

// ── Create ──────────────────────────────────────────────────────────────────

/**
 * Insert a new commodity and write an audit log entry.
 * @param {{ commodity_code, name, description, category, unit }} formData
 * @param {Object} profile
 * @returns {Promise<{ commodity: Object|null, error: string|null }>}
 */
export async function createCommodity(formData, profile) {
  try {
    const { data, error } = await supabase
      .from('commodities')
      .insert({
        commodity_code: formData.commodity_code.trim().toUpperCase(),
        name:           formData.name.trim(),
        description:    formData.description?.trim() || null,
        category:       formData.category,
        unit:           formData.unit,
        created_by:     profile.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { commodity: null, error: 'A commodity with this code already exists.' };
      }
      throw error;
    }

    await supabase.from('audit_logs').insert({
      user_id:     profile.id,
      action:      AUDIT_ACTIONS.CREATE_COMMODITY,
      entity_type: 'commodity',
      entity_id:   data.id,
      description: `${profile.full_name} added commodity "${data.name}" (${data.commodity_code}).`,
    });

    return { commodity: data, error: null };
  } catch (err) {
    console.error('[CommoditiesService] createCommodity:', err);
    return { commodity: null, error: 'Failed to create commodity. Please try again.' };
  }
}

// ── Update ──────────────────────────────────────────────────────────────────

/**
 * Update an existing commodity and write an audit log entry.
 * @param {string} id
 * @param {{ commodity_code, name, description, category, unit }} formData
 * @param {Object} profile
 * @returns {Promise<{ commodity: Object|null, error: string|null }>}
 */
export async function updateCommodity(id, formData, profile) {
  try {
    const { data, error } = await supabase
      .from('commodities')
      .update({
        commodity_code: formData.commodity_code.trim().toUpperCase(),
        name:           formData.name.trim(),
        description:    formData.description?.trim() || null,
        category:       formData.category,
        unit:           formData.unit,
        updated_by:     profile.id,
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { commodity: null, error: 'A commodity with this code already exists.' };
      }
      throw error;
    }

    await supabase.from('audit_logs').insert({
      user_id:     profile.id,
      action:      AUDIT_ACTIONS.UPDATE_COMMODITY,
      entity_type: 'commodity',
      entity_id:   data.id,
      description: `${profile.full_name} updated commodity "${data.name}" (${data.commodity_code}).`,
    });

    return { commodity: data, error: null };
  } catch (err) {
    console.error('[CommoditiesService] updateCommodity:', err);
    return { commodity: null, error: 'Failed to update commodity. Please try again.' };
  }
}

// ── Delete (Soft) ───────────────────────────────────────────────────────────

/**
 * Soft-delete a commodity by setting deleted_at to NOW().
 * The record stays in the DB for audit purposes — hard deletes are never done.
 * @param {string} id
 * @param {string} name
 * @param {string} code
 * @param {Object} profile
 * @returns {Promise<{ error: string|null }>}
 */
export async function deleteCommodity(id, name, code, profile) {
  try {
    const { error } = await supabase
      .from('commodities')
      .update({ deleted_at: new Date().toISOString(), updated_by: profile.id })
      .eq('id', id);

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id:     profile.id,
      action:      AUDIT_ACTIONS.DELETE_COMMODITY,
      entity_type: 'commodity',
      entity_id:   id,
      description: `${profile.full_name} deleted commodity "${name}" (${code}).`,
    });

    return { error: null };
  } catch (err) {
    console.error('[CommoditiesService] deleteCommodity:', err);
    return { error: 'Failed to delete commodity. Please try again.' };
  }
}
