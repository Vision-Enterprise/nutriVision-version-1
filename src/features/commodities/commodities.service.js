/**
 * Commodities Service
 *
 * All Supabase interactions for the Commodity Management feature.
 * Each mutating operation writes an audit log entry as part of the same call.
 */

import { supabase } from '../../core/supabase.js';
import { AUDIT_ACTIONS, RECORD_STATUS } from '../../shared/constants/app.constants.js';
import { generateCommoditySKU } from '../../shared/utils/code-generator.util.js';
import {
  hydrateCommodityShelfLife,
  normalizeShelfLifeConfig,
  saveLocalShelfLifeConfig,
} from '../../shared/utils/shelf-life.utils.js';

const LEGACY_SKU_SUFFIX_RE = /-(SAC|TAB|PAC|BOT|CAP|PIE|UNT)$/i;

// ── Read ────────────────────────────────────────────────────────────────────

/**
 * Fetch all active (non-deleted) commodities ordered by name.
 * @returns {Promise<{ commodities: Array, error: string|null }>}
 */
export async function fetchCommodities() {
  try {
    const { data, error } = await supabase
      .from('commodities')
      .select('*')
      .is('deleted_at', null)
      .order('name');

    if (error) throw error;

    const commodities = (data || []).map(c => hydrateCommodityShelfLife(c));
    const usedCodes = new Set(commodities.map(c => (c.commodity_code || '').toUpperCase()));
    const updates = [];
    for (const c of commodities) {
      if (!c?.name || !c?.unit) continue;
      const current = (c.commodity_code || '').trim().toUpperCase();
      if (!LEGACY_SKU_SUFFIX_RE.test(current)) continue;
      try {
        const targetSku = generateCommoditySKU(c.name, c.unit);
        if (targetSku && targetSku !== current && !usedCodes.has(targetSku)) {
          usedCodes.delete(current);
          usedCodes.add(targetSku);
          c.commodity_code = targetSku;
          updates.push(
            supabase.from('commodities').update({ commodity_code: targetSku }).eq('id', c.id)
          );
        }
      } catch {}
    }
    if (updates.length > 0) await Promise.allSettled(updates);

    return { commodities, error: null };
  } catch (err) {
    console.error('[CommoditiesService] fetchCommodities:', err);
    return { commodities: [], error: 'Failed to load commodities.' };
  }
}

/**
 * Fetch a commodity with all its active batches, distributions (releases),
 * and defect/quarantine incidents for visual lineage graph rendering.
 * @param {string} commodityId
 * @returns {Promise<{ commodity: Object|null, batches: Array, error: string|null }>}
 */
export async function fetchCommodityLineage(commodityId) {
  try {
    const { data: commodity, error: commErr } = await supabase
      .from('commodities')
      .select('*')
      .eq('id', commodityId)
      .single();

    if (commErr) throw commErr;
    hydrateCommodityShelfLife(commodity);

    const { data: batches, error: batchErr } = await supabase
      .from('batches')
      .select('id, batch_number, quantity, delivery_date, expiration_date, supplier, notes, created_at, record_status')
      .eq('commodity_id', commodityId)
      .is('deleted_at', null)
      .order('expiration_date', { ascending: true });

    if (batchErr) throw batchErr;

    const batchIds = (batches || []).map(b => b.id);
    let releases = [];
    let defects = [];

    if (batchIds.length > 0) {
      const { data: relData, error: relErr } = await supabase
        .from('releases')
        .select('id, batch_id, quantity, barangay, recipient_name, released_at, notes')
        .in('batch_id', batchIds)
        .order('released_at', { ascending: false });

      if (!relErr && relData) releases = relData;

      const { data: defData, error: defErr } = await supabase
        .from('defect_incidents')
        .select('id, batch_id, classification, quantity_affected, action_taken, scope, remaining_quarantined, reported_at, remarks')
        .in('batch_id', batchIds)
        .order('reported_at', { ascending: false });

      if (!defErr && defData) defects = defData;
    }

    const batchesWithLineage = (batches || []).map(b => ({
      ...b,
      releases: releases.filter(r => r.batch_id === b.id),
      defects: defects.filter(d => d.batch_id === b.id),
    }));

    return {
      commodity,
      batches: batchesWithLineage,
      error: null,
    };
  } catch (err) {
    console.error('[CommoditiesService] fetchCommodityLineage:', err);
    return { commodity: null, batches: [], error: 'Failed to load commodity lineage.' };
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
    const shelfConfig = normalizeShelfLifeConfig(formData.shelf_life_config);
    const basePayload = {
      commodity_code: formData.commodity_code.trim().toUpperCase(),
      name:           formData.name.trim(),
      description:    formData.description?.trim() || null,
      category:       formData.category,
      unit:           formData.unit,
      created_by:     profile.id,
    };

    let { data, error } = await supabase
      .from('commodities')
      .insert(shelfConfig ? { ...basePayload, shelf_life_config: shelfConfig } : basePayload)
      .select()
      .single();

    if (
      error &&
      shelfConfig &&
      (error.code === '42703' || error.code === 'PGRST204' || /shelf_life_config/i.test(error.message || ''))
    ) {
      ({ data, error } = await supabase
        .from('commodities')
        .insert(basePayload)
        .select()
        .single());
    }

    if (error) {
      if (error.code === '23505') {
        return { commodity: null, error: 'A commodity with this code already exists.' };
      }
      throw error;
    }

    if (shelfConfig) {
      data.shelf_life_config = shelfConfig;
      saveLocalShelfLifeConfig(data, shelfConfig);
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
 * @param {{ commodity_code, name, description, category, unit, shelf_life_config? }} formData
 * @param {Object} profile
 * @returns {Promise<{ commodity: Object|null, error: string|null }>}
 */
export async function updateCommodity(id, formData, profile) {
  try {
    const shelfConfig = normalizeShelfLifeConfig(formData.shelf_life_config);
    const basePayload = {
      commodity_code: formData.commodity_code.trim().toUpperCase(),
      name:           formData.name.trim(),
      description:    formData.description?.trim() || null,
      category:       formData.category,
      unit:           formData.unit,
      updated_by:     profile.id,
    };

    let { data, error } = await supabase
      .from('commodities')
      .update(shelfConfig ? { ...basePayload, shelf_life_config: shelfConfig } : basePayload)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (
      error &&
      shelfConfig &&
      (error.code === '42703' || error.code === 'PGRST204' || /shelf_life_config/i.test(error.message || ''))
    ) {
      ({ data, error } = await supabase
        .from('commodities')
        .update(basePayload)
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single());
    }

    if (error) {
      if (error.code === '23505') {
        return { commodity: null, error: 'A commodity with this code already exists.' };
      }
      throw error;
    }

    if (shelfConfig) {
      data.shelf_life_config = shelfConfig;
      saveLocalShelfLifeConfig(data, shelfConfig);
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
 * Check if a commodity currently has active, in-stock batches (quantity > 0).
 * Used to guard against hiding physical warehouse stock when archiving a commodity (#100).
 *
 * @param {string} commodityId
 * @returns {Promise<{ activeBatchCount: number, totalUnits: number, batchNumbers: string[], error: string|null }>}
 */
export async function fetchActiveStockForCommodity(commodityId) {
  try {
    const { data, error } = await supabase
      .from('batches')
      .select('id, batch_number, quantity, record_status, deleted_at')
      .eq('commodity_id', commodityId)
      .is('deleted_at', null)
      .gt('quantity', 0);

    if (error) throw error;

    const activeBatches = (data || []).filter(
      b => !b.record_status || b.record_status === RECORD_STATUS.ACTIVE
    );

    const totalUnits = activeBatches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
    const batchNumbers = activeBatches.map(b => b.batch_number).filter(Boolean);

    return {
      activeBatchCount: activeBatches.length,
      totalUnits,
      batchNumbers,
      error: null,
    };
  } catch (err) {
    console.error('[CommoditiesService] fetchActiveStockForCommodity:', err);
    return {
      activeBatchCount: 0,
      totalUnits: 0,
      batchNumbers: [],
      error: 'Could not verify active batch stock for this commodity.',
    };
  }
}

/**
 * Soft-delete a commodity by setting deleted_at to NOW().
 * Blocks archiving if active in-stock batches (qty > 0) still exist (#100).
 * The record stays in the DB for audit purposes — hard deletes are never done.
 * @param {string} id
 * @param {string} name
 * @param {string} code
 * @param {Object} profile
 * @param {string} [unit='units']
 * @returns {Promise<{ error: string|null }>}
 */
export async function deleteCommodity(id, name, code, profile, unit = 'units') {
  try {
    // 0. Guard: prevent archiving commodities that still hold active physical stock (#100)
    const stockCheck = await fetchActiveStockForCommodity(id);
    if (stockCheck.error) {
      return { error: stockCheck.error };
    }
    if (stockCheck.activeBatchCount > 0) {
      const sampleCodes = stockCheck.batchNumbers.slice(0, 3).join(', ');
      const moreSuffix = stockCheck.batchNumbers.length > 3 ? `, +${stockCheck.batchNumbers.length - 3} more` : '';
      return {
        error:
          `Cannot archive "${name}" (${code}) while ${stockCheck.activeBatchCount} active batch` +
          `${stockCheck.activeBatchCount !== 1 ? 'es' : ''} (${stockCheck.totalUnits.toLocaleString()} ${unit}) remain in stock` +
          `${sampleCodes ? ` [${sampleCodes}${moreSuffix}]` : ''}. ` +
          `Please distribute, dispose, or void the remaining batches first.`
      };
    }

    // 1. Attempt RPC first (Security Definer, bypasses RLS)
    const { error: rpcErr } = await supabase.rpc('archive_commodity', { commodity_id: id });
    if (!rpcErr) {
      return { error: null };
    }

    // 2. Fallback to direct update if RPC is not yet created in Supabase
    const { error: updateErr } = await supabase
      .from('commodities')
      .update({ deleted_at: new Date().toISOString(), updated_by: profile?.id })
      .eq('id', id);

    if (updateErr) {
      console.warn('[CommoditiesService] Direct update error:', updateErr);
      throw updateErr;
    }

    if (profile?.id) {
      try {
        await supabase.from('audit_logs').insert({
          user_id:     profile.id,
          action:      AUDIT_ACTIONS.DELETE_COMMODITY,
          entity_type: 'commodity',
          entity_id:   id,
          description: `${profile.full_name || 'Staff'} archived commodity "${name}" (${code}).`,
        });
      } catch (auditErr) {
        console.warn('[CommoditiesService] Audit log insert warning:', auditErr);
      }
    }

    return { error: null };
  } catch (err) {
    console.error('[CommoditiesService] deleteCommodity error:', err);
    if (err?.code === '42501' || err?.status === 403) {
      return { 
        error: 'Permission denied (403). Please run database/04_archive_commodities.sql in your Supabase SQL Editor to allow archiving commodities.' 
      };
    }
    return { error: 'Failed to archive commodity: ' + (err.message || 'Please try again.') };
  }
}
