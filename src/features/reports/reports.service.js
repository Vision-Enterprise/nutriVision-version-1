import { supabase } from '../../core/supabase.js';
import { RECORD_STATUS } from '../../shared/constants/app.constants.js';

/**
 * Helper to fetch profiles for name mapping.
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
 * NOTE on PostgREST nested filters:
 * Filtering on related-table columns via dot notation (e.g. `.is('batches.commodities.deleted_at', null)`)
 * causes 400 errors in PostgREST. Instead we:
 *   1. Remove those filters from the DB query.
 *   2. Apply them client-side after fetch (safe for LGU data volumes).
 *   3. Use the `!inner` join to restrict to rows that HAVE a matching commodity.
 */

// ─── 1. Distribution & Dispatch Ledger ────────────────────────────────────────

export async function fetchDistributionLedger(filters = {}) {
  try {
    let query = supabase
      .from('releases')
      .select(`
        id, quantity, barangay, recipient_name, notes, released_at, released_by,
        batches!inner (
          id, batch_number, record_status,
          commodities!inner ( id, name, commodity_code, unit, deleted_at )
        )
      `)
      .order('released_at', { ascending: false });

    // Date range filters (on top-level column — OK)
    if (filters.dateFrom) query = query.gte('released_at', filters.dateFrom);
    if (filters.dateTo)   query = query.lte('released_at', filters.dateTo + 'T23:59:59.999Z');

    // Barangay filter (top-level column — OK)
    if (filters.barangay && filters.barangay !== 'all') {
      query = query.eq('barangay', filters.barangay);
    }

    const [res, profileMap] = await Promise.all([query, _getProfileMap()]);
    if (res.error) throw res.error;

    // Client-side filters (PostgREST nested null/eq filters cause 400)
    let data = res.data.filter(r => {
      const batch = r.batches;
      const comm  = batch?.commodities;
      if (!batch || !comm) return false;
      // Exclude VOIDED batches
      if (batch.record_status === RECORD_STATUS.VOIDED) return false;
      // Exclude soft-deleted commodities
      if (comm.deleted_at) return false;
      // Commodity filter
      if (filters.commodityId && filters.commodityId !== 'all') {
        if (comm.id !== filters.commodityId) return false;
      }
      return true;
    });

    data = data.map(r => ({
      ...r,
      released_by_name: profileMap[r.released_by] || 'Unknown Staff'
    }));

    console.log(`[ReportsService] fetchDistributionLedger: ${data.length} rows`);
    return { data, error: null };
  } catch (err) {
    console.error('[ReportsService] fetchDistributionLedger:', err);
    return { data: [], error: 'Failed to load distribution ledger.' };
  }
}

// ─── 2. FEFO Wastage & Expiry Risk ────────────────────────────────────────────

export async function fetchFefoRiskBatches(filters = {}) {
  try {
    // Only filter on direct batch columns — no nested column filters
    const { data, error } = await supabase
      .from('batches')
      .select(`
        id, batch_number, quantity, expiration_date, record_status,
        commodities!inner ( id, name, commodity_code, unit, deleted_at )
      `)
      .eq('record_status', RECORD_STATUS.ACTIVE)
      .not('expiration_date', 'is', null)
      .order('expiration_date', { ascending: true });

    if (error) throw error;

    const thresholdDays = filters.thresholdDays ? parseInt(filters.thresholdDays, 10) : 90;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + thresholdDays);

    // Client-side: exclude soft-deleted commodities, apply commodity + date filters
    const filtered = data.filter(b => {
      const comm = b.commodities;
      if (!comm) return false;
      if (comm.deleted_at) return false;
      if (filters.commodityId && filters.commodityId !== 'all') {
        if (comm.id !== filters.commodityId) return false;
      }
      return new Date(b.expiration_date) <= thresholdDate;
    });

    console.log(`[ReportsService] fetchFefoRiskBatches: ${filtered.length} rows`);
    return { data: filtered, error: null };
  } catch (err) {
    console.error('[ReportsService] fetchFefoRiskBatches:', err);
    return { data: [], error: 'Failed to load FEFO risk report.' };
  }
}

// ─── 3. Current Allocation Balances ───────────────────────────────────────────

export async function fetchAllocationBalances(filters = {}) {
  try {
    const { data, error } = await supabase
      .from('batches')
      .select(`
        id, quantity, expiration_date, record_status,
        commodities!inner ( id, name, commodity_code, unit, category, deleted_at )
      `)
      .eq('record_status', RECORD_STATUS.ACTIVE);

    if (error) throw error;

    // Client-side: exclude soft-deleted commodities, apply commodity filter
    const validData = data.filter(b => {
      const comm = b.commodities;
      if (!comm || comm.deleted_at) return false;
      if (filters.commodityId && filters.commodityId !== 'all') {
        if (comm.id !== filters.commodityId) return false;
      }
      return true;
    });

    // Group and aggregate by commodity
    const grouped = {};
    for (const batch of validData) {
      const cId = batch.commodities.id;
      if (!grouped[cId]) {
        grouped[cId] = {
          commodity: batch.commodities,
          totalQuantity: 0,
          batchCount: 0,
          oldestExpiry: null
        };
      }
      grouped[cId].totalQuantity += batch.quantity;
      grouped[cId].batchCount += 1;
      if (batch.expiration_date) {
        if (!grouped[cId].oldestExpiry || new Date(batch.expiration_date) < new Date(grouped[cId].oldestExpiry)) {
          grouped[cId].oldestExpiry = batch.expiration_date;
        }
      }
    }

    const result = Object.values(grouped).sort((a, b) => a.commodity.name.localeCompare(b.commodity.name));
    console.log(`[ReportsService] fetchAllocationBalances: ${result.length} commodities`);
    return { data: result, error: null };
  } catch (err) {
    console.error('[ReportsService] fetchAllocationBalances:', err);
    return { data: [], error: 'Failed to load allocation balances.' };
  }
}

// ─── Filter option helpers ─────────────────────────────────────────────────────

export async function fetchCommodityOptions() {
  try {
    const { data, error } = await supabase
      .from('commodities')
      .select('id, name, unit')
      .is('deleted_at', null)
      .order('name', { ascending: true });
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('[ReportsService] fetchCommodityOptions:', err);
    return { data: [], error: err.message };
  }
}

export async function fetchBarangayOptions() {
  try {
    const { data, error } = await supabase
      .from('releases')
      .select('barangay')
      .not('barangay', 'is', null);
    if (error) throw error;
    const unique = [...new Set(data.map(r => r.barangay))].filter(Boolean).sort();
    return { data: unique, error: null };
  } catch (err) {
    console.error('[ReportsService] fetchBarangayOptions:', err);
    return { data: [], error: err.message };
  }
}
