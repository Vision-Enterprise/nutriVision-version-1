import { supabase } from '../../core/supabase.js';
import { RECORD_STATUS, EXPIRATION_STATUS } from '../../shared/constants/app.constants.js';
import { getExpirationStatus, getDaysRemaining } from '../../shared/utils/date.utils.js';
import { upgradeLegacyBatchCodes } from '../batches/batches.service.js';

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

// ─── 1. Active Batch Inventory & Expiry Status Report ('batches' / 'fefo') ──

export async function fetchBatchInventoryReport(filters = {}) {
  try {
    const { data, error } = await supabase
      .from('batches')
      .select(`
        id, batch_number, quantity, delivery_date, expiration_date, supplier, notes, commodity_id, record_status,
        commodities!inner ( id, name, commodity_code, unit, category, deleted_at )
      `)
      .eq('record_status', RECORD_STATUS.ACTIVE)
      .is('deleted_at', null)
      .order('expiration_date', { ascending: true });

    if (error) throw error;

    const cleanBatches = (data || []).filter(b => b.commodities && !b.commodities.deleted_at);
    await upgradeLegacyBatchCodes(cleanBatches);

    const statusFilter = filters.expiryStatus || 'all';

    const filtered = cleanBatches
      .map(b => {
        const status = getExpirationStatus(b.expiration_date);
        const daysLeft = getDaysRemaining(b.expiration_date);
        return {
          ...b,
          expiry_status: status,
          days_left: daysLeft,
        };
      })
      .filter(b => {
        if (filters.commodityId && filters.commodityId !== 'all') {
          if (b.commodities.id !== filters.commodityId) return false;
        }
        if (statusFilter === 'all') return true;
        if (statusFilter === 'fefo_risk') {
          return b.expiry_status === EXPIRATION_STATUS.NEAR_EXPIRY || b.expiry_status === EXPIRATION_STATUS.EXPIRED;
        }
        return b.expiry_status === statusFilter;
      });

    return { data: filtered, error: null };
  } catch (err) {
    console.error('[ReportsService] fetchBatchInventoryReport:', err);
    return { data: [], error: 'Failed to load batch inventory report.' };
  }
}

// Keep alias for backward compatibility with archived reports
export const fetchFefoRiskBatches = fetchBatchInventoryReport;

// ─── 2. Barangay Distribution & Dispatch Report ('distribution') ────────────

export async function fetchDistributionLedger(filters = {}) {
  try {
    let query = supabase
      .from('releases')
      .select(`
        id, quantity, barangay, recipient_name, notes, released_at, released_by,
        batches!inner (
          id, batch_number, delivery_date, expiration_date, supplier, commodity_id, record_status,
          commodities!inner ( id, name, commodity_code, unit, category, deleted_at )
        )
      `)
      .order('released_at', { ascending: false });

    if (filters.dateFrom) query = query.gte('released_at', filters.dateFrom);
    if (filters.dateTo)   query = query.lte('released_at', filters.dateTo + 'T23:59:59.999Z');

    if (filters.barangay && filters.barangay !== 'all') {
      query = query.eq('barangay', filters.barangay);
    }

    const [res, profileMap] = await Promise.all([query, _getProfileMap()]);
    if (res.error) throw res.error;

    let data = (res.data || []).filter(r => {
      const batch = r.batches;
      const comm  = batch?.commodities;
      if (!batch || !comm) return false;
      if (batch.record_status === RECORD_STATUS.VOIDED) return false;
      if (comm.deleted_at) return false;
      if (filters.commodityId && filters.commodityId !== 'all') {
        if (comm.id !== filters.commodityId) return false;
      }
      return true;
    });

    const uniqueBatches = [];
    const seenIds = new Set();
    for (const r of data) {
      if (r.batches?.id && !seenIds.has(r.batches.id)) {
        seenIds.add(r.batches.id);
        uniqueBatches.push(r.batches);
      }
    }
    if (uniqueBatches.length > 0) {
      await upgradeLegacyBatchCodes(uniqueBatches);
    }

    data = data.map(r => ({
      ...r,
      released_by_name: profileMap[r.released_by] || 'Staff'
    }));

    return { data, error: null };
  } catch (err) {
    console.error('[ReportsService] fetchDistributionLedger:', err);
    return { data: [], error: 'Failed to load distribution ledger.' };
  }
}

// ─── 3. Commodity Stock Summary Report ('allocation') ───────────────────────

export async function fetchAllocationBalances(filters = {}) {
  try {
    const [batchesRes, releasesRes] = await Promise.all([
      supabase
        .from('batches')
        .select(`
          id, quantity, expiration_date, record_status, deleted_at,
          commodities!inner ( id, name, commodity_code, unit, category, deleted_at )
        `)
        .eq('record_status', RECORD_STATUS.ACTIVE)
        .is('deleted_at', null),
      supabase
        .from('releases')
        .select(`
          quantity,
          batches!inner ( commodity_id, record_status )
        `)
    ]);

    if (batchesRes.error) throw batchesRes.error;

    const releasedByComm = {};
    for (const r of (releasesRes.data || [])) {
      if (r.batches?.record_status === RECORD_STATUS.VOIDED) continue;
      const cId = r.batches?.commodity_id;
      if (cId) {
        releasedByComm[cId] = (releasedByComm[cId] || 0) + (r.quantity || 0);
      }
    }

    const validData = (batchesRes.data || []).filter(b => {
      const comm = b.commodities;
      if (!comm || comm.deleted_at) return false;
      if (filters.commodityId && filters.commodityId !== 'all') {
        if (comm.id !== filters.commodityId) return false;
      }
      return true;
    });

    const grouped = {};
    for (const batch of validData) {
      const cId = batch.commodities.id;
      if (!grouped[cId]) {
        grouped[cId] = {
          commodity: batch.commodities,
          totalQuantity: 0,
          totalReleased: releasedByComm[cId] || 0,
          batchCount: 0,
          nearExpiryCount: 0,
          oldestExpiry: null
        };
      }
      grouped[cId].totalQuantity += batch.quantity;
      grouped[cId].batchCount += 1;

      const status = getExpirationStatus(batch.expiration_date);
      if (status === EXPIRATION_STATUS.NEAR_EXPIRY || status === EXPIRATION_STATUS.EXPIRED) {
        grouped[cId].nearExpiryCount += 1;
      }

      if (batch.expiration_date) {
        if (!grouped[cId].oldestExpiry || new Date(batch.expiration_date) < new Date(grouped[cId].oldestExpiry)) {
          grouped[cId].oldestExpiry = batch.expiration_date;
        }
      }
    }

    const result = Object.values(grouped).sort((a, b) => a.commodity.name.localeCompare(b.commodity.name));
    return { data: result, error: null };
  } catch (err) {
    console.error('[ReportsService] fetchAllocationBalances:', err);
    return { data: [], error: 'Failed to load commodity stock summary.' };
  }
}

// ─── 4. Defect, Quarantine & Wastage Report ('defects') ─────────────────────

export async function fetchDefectWastageReport(filters = {}) {
  try {
    let query = supabase
      .from('defect_incidents')
      .select(`
        id, classification, quantity_affected, action_taken,
        remarks, reported_at, reported_by, scope, remaining_quarantined,
        batches!inner (
          id, batch_number, delivery_date, expiration_date, supplier, commodity_id,
          commodities!inner ( id, name, commodity_code, unit, category, deleted_at )
        )
      `)
      .order('reported_at', { ascending: false });

    if (filters.dateFrom) query = query.gte('reported_at', filters.dateFrom);
    if (filters.dateTo)   query = query.lte('reported_at', filters.dateTo + 'T23:59:59.999Z');

    if (filters.defectAction && filters.defectAction !== 'all') {
      query = query.eq('action_taken', filters.defectAction);
    }

    const [res, profileMap] = await Promise.all([query, _getProfileMap()]);
    if (res.error) throw res.error;

    let data = (res.data || []).filter(item => {
      const comm = item.batches?.commodities;
      if (!comm || comm.deleted_at) return false;
      if (filters.commodityId && filters.commodityId !== 'all') {
        if (comm.id !== filters.commodityId) return false;
      }
      return true;
    });

    const uniqueBatches = [];
    const seenIds = new Set();
    for (const item of data) {
      if (item.batches?.id && !seenIds.has(item.batches.id)) {
        seenIds.add(item.batches.id);
        uniqueBatches.push(item.batches);
      }
    }
    if (uniqueBatches.length > 0) {
      await upgradeLegacyBatchCodes(uniqueBatches);
    }

    data = data.map(item => ({
      ...item,
      reported_by_name: profileMap[item.reported_by] || 'Staff'
    }));

    return { data, error: null };
  } catch (err) {
    console.error('[ReportsService] fetchDefectWastageReport:', err);
    return { data: [], error: 'Failed to load defect & wastage report.' };
  }
}

// ─── Filter option helpers ──────────────────────────────────────────────────

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
