/**
 * Bulk Release Service
 *
 * Handles all Supabase interactions for the Bulk Release feature.
 * Keeps this concern separate from batches.service.js.
 */

import { supabase } from '../../core/supabase.js';
import { AUDIT_ACTIONS, RECORD_STATUS } from '../../shared/constants/app.constants.js';

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Fetch all active, in-stock batches ordered FEFO.
 * @returns {Promise<{ batches: Array, error: string|null }>}
 */
export async function fetchActiveBatchesForRelease() {
  try {
    const { data, error } = await supabase
      .from('batches')
      .select(`
        id, batch_number, quantity,
        delivery_date, expiration_date,
        supplier, notes, commodity_id,
        record_status, deleted_at,
        commodities (
          id, name, commodity_code, unit, deleted_at
        )
      `)
      .is('deleted_at', null)
      .eq('record_status', RECORD_STATUS.ACTIVE)
      .gt('quantity', 0)
      .order('expiration_date', { ascending: true });

    if (error) throw error;

    const batches = (data || []).filter(
      b => b.deleted_at === null && (!b.commodities || b.commodities.deleted_at === null)
    );

    return { batches, error: null };
  } catch (err) {
    console.error('[BulkReleaseService] fetchActiveBatchesForRelease:', err);
    return { batches: [], error: 'Failed to load available batches.' };
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Execute a bulk release for multiple batches.
 * Re-verifies live stock before writes, then processes sequentially.
 *
 * @param {Array<{ batchId, batchNumber, commodityName, commodityUnit, qty, currentQty }>} releaseItems
 * @param {{ barangay, recipientName, notes, releaseDate }} destination
 * @param {Object} profile
 * @returns {Promise<{ results, errors, error: string|null }>}
 */
export async function executeBulkRelease(releaseItems, destination, profile) {
  const results = [];
  const errors  = [];

  // Re-verify live stock
  const batchIds = releaseItems.map(i => i.batchId);
  const { data: liveBatches, error: fetchErr } = await supabase
    .from('batches')
    .select('id, quantity, record_status, deleted_at')
    .in('id', batchIds);

  if (fetchErr) {
    return { results: [], errors: [], error: 'Could not verify live stock. Please try again.' };
  }

  const liveMap = Object.fromEntries((liveBatches || []).map(b => [b.id, b]));

  // Fail-fast validation
  for (const item of releaseItems) {
    const live = liveMap[item.batchId];
    if (!live || live.deleted_at || live.record_status !== RECORD_STATUS.ACTIVE) {
      errors.push({ batchId: item.batchId, batchNumber: item.batchNumber, reason: 'Batch is no longer active.' });
      continue;
    }
    if (item.qty > live.quantity) {
      errors.push({
        batchId: item.batchId,
        batchNumber: item.batchNumber,
        reason: `Requested ${item.qty} exceeds live stock of ${live.quantity}.`
      });
    }
  }

  if (errors.length > 0) {
    return {
      results: [],
      errors,
      error: `Stock validation failed for ${errors.length} batch(es). Please review and try again.`
    };
  }

  // Sequential release
  for (const item of releaseItems) {
    try {
      const live    = liveMap[item.batchId];
      const relDate = destination.releaseDate
        ? new Date(destination.releaseDate + 'T00:00:00').toISOString()
        : new Date().toISOString();

      const { error: releaseErr } = await supabase
        .from('releases')
        .insert({
          batch_id:       item.batchId,
          quantity:       item.qty,
          barangay:       destination.barangay,
          recipient_name: destination.recipientName || null,
          notes:          destination.notes          || null,
          released_by:    profile.id,
          released_at:    relDate,
        });

      if (releaseErr) throw releaseErr;

      const newQty  = live.quantity - item.qty;
      const payload = { quantity: newQty, updated_by: profile.id };
      if (newQty <= 0) payload.record_status = RECORD_STATUS.DEPLETED;

      const { data: updatedBatch, error: updateErr } = await supabase
        .from('batches')
        .update(payload)
        .eq('id', item.batchId)
        .select('id, batch_number, quantity, record_status, commodity_id, commodities(id, name, commodity_code, unit)')
        .single();

      if (updateErr) throw updateErr;

      results.push({ batchId: item.batchId, updatedBatch });
    } catch (err) {
      console.error(`[BulkReleaseService] Failed on batch ${item.batchNumber}:`, err);
      errors.push({ batchId: item.batchId, batchNumber: item.batchNumber, reason: err.message || 'Unknown error.' });
    }
  }

  // Single audit log for the whole operation
  if (results.length > 0) {
    const summary = releaseItems
      .filter(i => results.some(r => r.batchId === i.batchId))
      .map(i => `${i.qty} x ${i.commodityName} (${i.batchNumber})`)
      .join(', ');

    await supabase.from('audit_logs').insert({
      user_id:     profile.id,
      action:      AUDIT_ACTIONS.RELEASE_BATCH,
      entity_type: 'bulk_release',
      entity_id:   results[0]?.batchId ?? null,
      description: `${profile.full_name} bulk-released to ${destination.barangay}: ${summary}.`,
    });
  }

  return {
    results,
    errors,
    error: errors.length > 0 && results.length === 0
      ? 'All releases failed. No changes were saved.'
      : null,
  };
}
