import { supabase } from '../../core/supabase.js';
import { RECORD_STATUS } from '../../shared/constants/app.constants.js';

/**
 * Fetch profile ID -> full_name mapping for display in archives & audit views.
 */
async function _getProfileMap() {
  try {
    const { data } = await supabase.from('profiles').select('id, full_name');
    return (data || []).reduce((acc, p) => {
      acc[p.id] = p.full_name;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

/**
 * Fetch depleted batches for the Historical Inventory tab.
 */
export async function fetchDepletedBatches() {
  try {
    const [batchesRes, profileMap] = await Promise.all([
      supabase
        .from('batches')
        .select(`
          id,
          batch_number,
          quantity,
          updated_at,
          created_at,
          supplier,
          record_status,
          commodities ( name, commodity_code, unit ),
          releases ( quantity, barangay, recipient_name, notes, released_by, released_at )
        `)
        .eq('record_status', RECORD_STATUS.DEPLETED)
        .order('updated_at', { ascending: false }),
      _getProfileMap()
    ]);

    if (batchesRes.error) {
      console.error('[ArchiveService] fetchDepletedBatches Supabase error:', batchesRes.error);
      throw batchesRes.error;
    }

    const formattedData = (batchesRes.data || []).map(batch => {
      const totalDistributed = batch.releases 
        ? batch.releases.reduce((sum, r) => sum + r.quantity, 0)
        : 0;

      const releases = (batch.releases || []).map(r => ({
        ...r,
        released_by_name: profileMap[r.released_by] || 'Unknown Staff'
      }));

      return {
        ...batch,
        totalDistributed,
        releases
      };
    });

    return { batches: formattedData, error: null };
  } catch (err) {
    console.error('[ArchiveService] fetchDepletedBatches CAUGHT:', err);
    return { batches: [], error: 'Failed to load depleted batches: ' + (err.message || JSON.stringify(err)) };
  }
}

/**
 * Fetch voided batches for the Audit Trail tab.
 */
export async function fetchVoidedBatches() {
  try {
    const [batchesRes, profileMap] = await Promise.all([
      supabase
        .from('batches')
        .select(`
          id,
          batch_number,
          void_reason,
          deleted_at,
          voided_by,
          record_status,
          commodities ( name, commodity_code, unit )
        `)
        .eq('record_status', RECORD_STATUS.VOIDED)
        .order('deleted_at', { ascending: false }),
      _getProfileMap()
    ]);

    if (batchesRes.error) {
      console.error('[ArchiveService] fetchVoidedBatches Supabase error:', batchesRes.error);
      throw batchesRes.error;
    }

    const formatted = (batchesRes.data || []).map(b => ({
      ...b,
      voided_by_name: profileMap[b.voided_by] || b.voided_by || 'Unknown'
    }));

    return { batches: formatted, error: null };
  } catch (err) {
    console.error('[ArchiveService] fetchVoidedBatches CAUGHT:', err);
    return { batches: [], error: 'Failed to load voided batches: ' + (err.message || JSON.stringify(err)) };
  }
}

/**
 * Restore a voided batch back to Active.
 */
export async function restoreBatch(batchId, profile) {
  try {
    const { error } = await supabase
      .from('batches')
      .update({
        record_status: RECORD_STATUS.ACTIVE,
        void_reason: null,
        voided_by: null,
        deleted_at: null,
        updated_by: profile.id
      })
      .eq('id', batchId);

    if (error) {
      console.error('[ArchiveService] restoreBatch Supabase error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }
    return { error: null };
  } catch (err) {
    console.error('[ArchiveService] restoreBatch CAUGHT:', err);
    return { error: 'Failed to restore batch: ' + (err.message || JSON.stringify(err)) };
  }
}
