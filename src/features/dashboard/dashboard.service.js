/**
 * Dashboard Service
 *
 * Handles fetching dashboard statistics and recent activity from Supabase.
 */

import { supabase } from '../../core/supabase.js';
import { getExpirationStatus } from '../../shared/utils/date.utils.js';
import { EXPIRATION_STATUS } from '../../shared/constants/app.constants.js';

/**
 * Fetch top-level dashboard statistics and expiration summary.
 *
 * @returns {Promise<{
 *   totalCommodities: number,
 *   totalBatches: number,
 *   expiredBatches: number,
 *   nearExpiryBatches: number,
 *   expirationSummary: {
 *     GOOD: number,
 *     MODERATE: number,
 *     NEAR_EXPIRY: number,
 *     EXPIRED: number
 *   },
 *   error: string|null
 * }>}
 */
export async function fetchDashboardStats() {
  try {
    // 1. Get total active commodities
    const { count: commoditiesCount, error: commoditiesError } = await supabase
      .from('commodities')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    if (commoditiesError) throw commoditiesError;

    // 2. Get all active batches with their expiration dates
    // For V1, we pull the active batches and compute in JS.
    // If the database gets huge, this logic might move to a PostgreSQL View or RPC.
    const { data: batches, error: batchesError } = await supabase
      .from('batches')
      .select('expiration_date')
      .is('deleted_at', null);

    if (batchesError) throw batchesError;

    // 3. Compute expiration breakdown
    const summary = {
      [EXPIRATION_STATUS.GOOD]: 0,
      [EXPIRATION_STATUS.MODERATE]: 0,
      [EXPIRATION_STATUS.NEAR_EXPIRY]: 0,
      [EXPIRATION_STATUS.EXPIRED]: 0,
    };

    batches.forEach(batch => {
      const status = getExpirationStatus(batch.expiration_date);
      summary[status]++;
    });

    return {
      totalCommodities: commoditiesCount || 0,
      totalBatches: batches.length,
      expiredBatches: summary[EXPIRATION_STATUS.EXPIRED],
      nearExpiryBatches: summary[EXPIRATION_STATUS.NEAR_EXPIRY],
      expirationSummary: summary,
      error: null
    };

  } catch (err) {
    console.error('[DashboardService] fetchDashboardStats error:', err);
    return {
      totalCommodities: 0,
      totalBatches: 0,
      expiredBatches: 0,
      nearExpiryBatches: 0,
      expirationSummary: {
        [EXPIRATION_STATUS.GOOD]: 0,
        [EXPIRATION_STATUS.MODERATE]: 0,
        [EXPIRATION_STATUS.NEAR_EXPIRY]: 0,
        [EXPIRATION_STATUS.EXPIRED]: 0,
      },
      error: 'Failed to load dashboard statistics.'
    };
  }
}

/**
 * Fetch the most recent system activity (audit logs).
 *
 * @param {number} limit
 * @returns {Promise<{ logs: Array, error: string|null }>}
 */
export async function fetchRecentActivity(limit = 5) {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        description,
        created_at,
        profiles (
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { logs: data, error: null };
  } catch (err) {
    console.error('[DashboardService] fetchRecentActivity error:', err);
    return { logs: [], error: 'Failed to load recent activity.' };
  }
}


/**
 * Fetch data required for dashboard charts.
 * 
 * @returns {Promise<{
 *   releases: Array,
 *   batches: Array,
 *   error: string|null
 * }>}
 */
export async function fetchChartData() {
  try {
    // 1. Fetch releases for distribution trends and barangay distribution
    const { data: releases, error: releasesError } = await supabase
      .from('releases')
      .select('quantity, barangay, released_at');
      
    if (releasesError) throw releasesError;

    // 2. Fetch active batches with commodity names for stock per commodity
    const { data: batches, error: batchesError } = await supabase
      .from('batches')
      .select(`
        quantity,
        expiration_date,
        commodities ( name )
      `)
      .is('deleted_at', null);
      
    if (batchesError) throw batchesError;

    return { releases, batches, error: null };
  } catch (err) {
    console.error('[DashboardService] fetchChartData error:', err);
    return { releases: [], batches: [], error: 'Failed to load chart data.' };
  }
}
