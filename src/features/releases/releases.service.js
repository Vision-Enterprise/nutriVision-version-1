import { supabase } from '../../core/supabase.js';

export async function fetchReleases() {
  try {
    const { data, error } = await supabase
      .from('releases')
      .select(`
        id, quantity, barangay, notes, released_at,
        batches (
          batch_number,
          commodities ( name, commodity_code, unit )
        ),
        profiles:released_by ( full_name )
      `)
      .order('released_at', { ascending: false });

    if (error) throw error;
    return { releases: data, error: null };
  } catch (err) {
    console.error('[ReleasesService] fetchReleases:', err);
    return { releases: [], error: 'Failed to load releases.' };
  }
}
