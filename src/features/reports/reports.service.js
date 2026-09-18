import { supabase } from '../../core/supabase.js';
import { RECORD_STATUS } from '../../shared/constants/app.constants.js';

/**
 * Helper to fetch profiles for name mapping
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
 * 1. Distribution & Dispatch Ledger
 * Fetches releases, joining batches and commodities.
 * Strictly excludes VOIDED batches and archived commodities.
 */
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
      .neq('batches.record_status', RECORD_STATUS.VOIDED)
      .is('batches.commodities.deleted_at', null)
      .order('released_at', { ascending: false });

    if (filters.dateFrom) query = query.gte('released_at', filters.dateFrom);
    if (filters.dateTo) query = query.lte('released_at', filters.dateTo + 'T23:59:59.999Z');
    if (filters.commodityId && filters.commodityId !== 'all') {
      query = query.eq('batches.commodities.id', filters.commodityId);
    }
    if (filters.barangay && filters.barangay !== 'all') {
      query = query.eq('barangay', filters.barangay);
    }

    const [res, profileMap] = await Promise.all([query, _getProfileMap()]);
    if (res.error) throw res.error;

    // Filter out if any got through due to inner join quirks in PostgREST
    let data = res.data.filter(r => r.batches && r.batches.commodities);

    data = data.map(r => ({
      ...r,
      released_by_name: profileMap[r.released_by] || 'Unknown Staff'
    }));

    return { data, error: null };
  } catch (err) {
    console.error('[ReportsService] fetchDistributionLedger:', err);
    return { data: [], error: 'Failed to load distribution ledger.' };
  }
}

/**
 * 2. FEFO Wastage & Expiry Risk
 * Fetches ACTIVE batches nearing expiry.
 */
export async function fetchFefoRiskBatches(filters = {}) {
  try {
    let query = supabase
      .from('batches')
      .select(`
        id, batch_number, quantity, expiry_date, record_status,
        commodities!inner ( id, name, commodity_code, unit, deleted_at )
      `)
      .eq('record_status', RECORD_STATUS.ACTIVE)
      .is('commodities.deleted_at', null)
      .not('expiry_date', 'is', null)
      .order('expiry_date', { ascending: true });

    if (filters.commodityId && filters.commodityId !== 'all') {
      query = query.eq('commodities.id', filters.commodityId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const thresholdDays = filters.thresholdDays ? parseInt(filters.thresholdDays, 10) : 90;
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(now.getDate() + thresholdDays);

    let filteredData = data.filter(b => b.commodities);
    
    // Filter by date threshold manually since doing it in DB with exact days is tricky via PostgREST
    filteredData = filteredData.filter(b => {
      const exp = new Date(b.expiry_date);
      return exp <= thresholdDate;
    });

    return { data: filteredData, error: null };
  } catch (err) {
    console.error('[ReportsService] fetchFefoRiskBatches:', err);
    return { data: [], error: 'Failed to load FEFO risk report.' };
  }
}

/**
 * 3. Current Allocation Balances
 * Sums quantities of ACTIVE batches per commodity.
 */
export async function fetchAllocationBalances(filters = {}) {
  try {
    let query = supabase
      .from('batches')
      .select(`
        id, quantity, expiry_date, record_status,
        commodities!inner ( id, name, commodity_code, unit, category, deleted_at )
      `)
      .eq('record_status', RECORD_STATUS.ACTIVE)
      .is('commodities.deleted_at', null);

    if (filters.commodityId && filters.commodityId !== 'all') {
      query = query.eq('commodities.id', filters.commodityId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const validData = data.filter(b => b.commodities);
    
    // Group and aggregate
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
      
      if (batch.expiry_date) {
        if (!grouped[cId].oldestExpiry || new Date(batch.expiry_date) < new Date(grouped[cId].oldestExpiry)) {
          grouped[cId].oldestExpiry = batch.expiry_date;
        }
      }
    }

    const result = Object.values(grouped).sort((a, b) => a.commodity.name.localeCompare(b.commodity.name));
    return { data: result, error: null };
  } catch (err) {
    console.error('[ReportsService] fetchAllocationBalances:', err);
    return { data: [], error: 'Failed to load allocation balances.' };
  }
}

/**
 * Fetch filter options: Active Commodities
 */
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
    return { data: [], error: err.message };
  }
}

/**
 * Fetch filter options: Distinct Barangays from releases
 */
export async function fetchBarangayOptions() {
  try {
    // We can just get all releases and find unique barangays, or use a view if one exists.
    // For now, getting all releases is fine for typical LGU sizes.
    const { data, error } = await supabase
      .from('releases')
      .select('barangay')
      .neq('barangay', null);
    
    if (error) throw error;
    
    const unique = [...new Set(data.map(r => r.barangay))].sort();
    return { data: unique, error: null };
  } catch (err) {
    return { data: [], error: err.message };
  }
}
