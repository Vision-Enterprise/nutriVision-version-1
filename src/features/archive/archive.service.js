import { supabase } from '../../core/supabase.js';
import { RECORD_STATUS } from '../../shared/constants/app.constants.js';

/**
 * Fetch depleted batches for the Historical Inventory tab.
 */
export async function fetchDepletedBatches() {
  try {
    const { data, error } = await supabase
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
        releases ( quantity, barangay, recipient_name, notes )
      `)
      .eq('record_status', RECORD_STATUS.DEPLETED)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[ArchiveService] fetchDepletedBatches Supabase error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }

    const formattedData = data.map(batch => {
      const totalDistributed = batch.releases 
        ? batch.releases.reduce((sum, r) => sum + r.quantity, 0)
        : 0;

      return {
        ...batch,
        totalDistributed
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
    const { data, error } = await supabase
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
      .order('deleted_at', { ascending: false });

    if (error) {
      console.error('[ArchiveService] fetchVoidedBatches Supabase error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }

    return { batches: data, error: null };
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
