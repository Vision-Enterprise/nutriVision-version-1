import { supabase } from '../../core/supabase.js';
import { upgradeLegacyBatchCodes } from '../batches/batches.service.js';

export async function fetchReleases() {
  try {
    const { data, error } = await supabase
      .from('releases')
      .select(`
        id, quantity, barangay, recipient_name, notes, released_at,
        batches (
          id,
          batch_number,
          delivery_date,
          expiration_date,
          supplier,
          commodity_id,
          commodities ( id, name, commodity_code, unit )
        ),
        profiles:released_by ( full_name )
      `)
      .order('released_at', { ascending: false });

    if (error) throw error;

    // Ensure all referenced batches (including depleted/archived ones) use standardized batch codes
    const uniqueBatches = [];
    const seenIds = new Set();
    for (const r of (data || [])) {
      if (r.batches?.id && !seenIds.has(r.batches.id)) {
        seenIds.add(r.batches.id);
        uniqueBatches.push(r.batches);
      }
    }
    if (uniqueBatches.length > 0) {
      await upgradeLegacyBatchCodes(uniqueBatches);
    }

    return { releases: data || [], error: null };
  } catch (err) {
    console.error('[ReleasesService] fetchReleases:', err);
    return { releases: [], error: 'Failed to load releases.' };
  }
}
