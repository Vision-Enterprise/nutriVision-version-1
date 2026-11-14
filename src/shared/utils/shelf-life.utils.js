/**
 * Per-Commodity Shelf-Life & Expiration Status Policy Utilities (#98)
 *
 * Implements NutriVision's Hybrid Literature Expiration Model:
 *   1. Standard Shelf-Stable Profile (USAID DELIVER, 2011):
 *      - Good > 180 days, Moderate 91–180 days, Near Expiry 1–90 days, Expired <= 0 days
 *   2. Weekly Perishable / Nutribun Profile (DOST-FNRI E-Nutribun Guidelines + WFP RSL%):
 *      - 7-day ambient shelf life (auto-sets Expiration = Delivery + 7 days)
 *      - Good 5–7+ days (> 4d), Moderate 3–4 days, Near Expiry 1–2 days, Expired <= 0 days
 *   3. Chilled / Short-Term Perishable Profile (DOST-FNRI Chilled E-Nutribun + WFP RSL%):
 *      - 14-day refrigerated shelf life (auto-sets Expiration = Delivery + 14 days)
 *      - Good 8–14+ days (> 7d), Moderate 5–7 days, Near Expiry 1–4 days, Expired <= 0 days
 *   4. Custom Policy Profile:
 *      - Commodity-specific Good (> X days), Near Expiry (<= Y days), and optional +N days auto-expiry
 *   5. Proportional Remaining Shelf Life (RSL%) Fallback (Hertog et al., 2014; WFP LOG):
 *      - For unconfigured short-life perishable batches (< 180d total shelf life), dynamically
 *        computes 50% RSL (Good) and 25% RSL (Near Expiry) cutoffs.
 *
 * Includes localStorage fallback persistence ('nv_commodity_shelf_configs_v1') so custom
 * commodity policies work immediately on live deployments even prior to SQL column migration.
 */

import { EXPIRATION_THRESHOLDS, SHELF_LIFE_MODES } from '../constants/app.constants.js';

const STORAGE_KEY = 'nv_commodity_shelf_configs_v1';

const NUTRIBUN_RE = /\b(?:e-?nutri[\s-]?buns?|nutri[\s-]?buns?)\b/i;
const PERISHABLE_NAME_RE = /\b(?:e-?nutri[\s-]?buns?|nutri[\s-]?buns?|breads?|buns?|pastry|pastries|loaf|loaves|pandecoco|pandesal|mamon|ensaymada|cakes?|fresh\s+milk|yogurt|eggs?|fruits?|vegetables?)\b/i;
const PERISHABLE_CATEGORY_RE = /\b(?:bakery|perishables?|bread|fresh|chilled|prepared)\b/i;

export const SHELF_LIFE_PROFILES = {
  [SHELF_LIFE_MODES.STANDARD]: {
    mode: SHELF_LIFE_MODES.STANDARD,
    label: 'Standard Shelf-Stable (Original: Good >180d, Mod 91–180d, Near ≤90d)',
    shortLabel: 'Standard (90d / 180d)',
    badgeLabel: null,
    goodDays: EXPIRATION_THRESHOLDS.GOOD_DAYS,
    nearExpiryDays: EXPIRATION_THRESHOLDS.NEAR_EXPIRY_DAYS,
    defaultShelfLifeDays: null,
  },
  [SHELF_LIFE_MODES.WEEKLY_PERISHABLE]: {
    mode: SHELF_LIFE_MODES.WEEKLY_PERISHABLE,
    label: 'Weekly Perishable / Nutribun (7-Day Dispatch: Good 5–7d, Mod 3–4d, Near 1–2d)',
    shortLabel: '7-Day Weekly',
    badgeLabel: '7-Day Dispatch',
    goodDays: 4,
    nearExpiryDays: 2,
    defaultShelfLifeDays: 7,
  },
  [SHELF_LIFE_MODES.CHILLED_SHORT]: {
    mode: SHELF_LIFE_MODES.CHILLED_SHORT,
    label: 'Chilled / Short-Term Perishable (14-Day RSL%: Good 8–14d, Mod 5–7d, Near 1–4d)',
    shortLabel: '14-Day Chilled',
    badgeLabel: '14-Day Chilled',
    goodDays: 7,
    nearExpiryDays: 4,
    defaultShelfLifeDays: 14,
  },
  [SHELF_LIFE_MODES.CUSTOM]: {
    mode: SHELF_LIFE_MODES.CUSTOM,
    label: 'Custom Thresholds (Configure Days)',
    shortLabel: 'Custom Policy',
    badgeLabel: 'Custom Shelf-Life',
    goodDays: 30,
    nearExpiryDays: 10,
    defaultShelfLifeDays: null,
  },
};

/**
 * Returns true if the product name indicates DOST-FNRI Nutribun / E-Nutribun.
 * @param {string} name
 * @returns {boolean}
 */
export function isNutribunName(name) {
  return Boolean(name && NUTRIBUN_RE.test(String(name)));
}

/**
 * Returns true if name or category indicates a bakery or short-term perishable item.
 * @param {string} [name]
 * @param {string} [category]
 * @returns {boolean}
 */
export function isPerishableItem(name = '', category = '') {
  return Boolean(
    (name && PERISHABLE_NAME_RE.test(String(name))) ||
    (category && PERISHABLE_CATEGORY_RE.test(String(category)))
  );
}

/**
 * Calculate whole calendar days between startDate and endDate.
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 * @returns {number|null}
 */
function _daysBetween(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  return Math.round((e.getTime() - s.getTime()) / 86400000);
}

function _readConfigStore() {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function _writeConfigStore(store) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

/**
 * Normalize and validate a raw shelf_life_config object or JSON string.
 * @param {Object|string|null} raw
 * @returns {Object|null}
 */
export function normalizeShelfLifeConfig(raw) {
  if (!raw) return null;
  let obj = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== 'object') return null;

  const mode = String(obj.mode || '').trim();
  if (
    mode === SHELF_LIFE_MODES.STANDARD ||
    mode === SHELF_LIFE_MODES.WEEKLY_PERISHABLE ||
    mode === SHELF_LIFE_MODES.CHILLED_SHORT
  ) {
    const preset = SHELF_LIFE_PROFILES[mode];
    return {
      mode: preset.mode,
      goodDays: preset.goodDays,
      nearExpiryDays: preset.nearExpiryDays,
      defaultShelfLifeDays: preset.defaultShelfLifeDays,
    };
  }

  if (mode === SHELF_LIFE_MODES.CUSTOM) {
    const near = parseInt(obj.nearExpiryDays, 10);
    const good = parseInt(obj.goodDays, 10);
    const rawDefault = obj.defaultShelfLifeDays !== null && obj.defaultShelfLifeDays !== undefined && String(obj.defaultShelfLifeDays).trim() !== ''
      ? parseInt(obj.defaultShelfLifeDays, 10)
      : null;
    if (isNaN(near) || near < 1 || isNaN(good) || good <= near) {
      return null;
    }
    return {
      mode: SHELF_LIFE_MODES.CUSTOM,
      goodDays: good,
      nearExpiryDays: near,
      defaultShelfLifeDays: !isNaN(rawDefault) && rawDefault > 0 ? rawDefault : null,
    };
  }

  return null;
}

/**
 * Persist a commodity's shelf-life policy into localStorage fallback cache.
 * Keyed by both commodity UUID and SKU code for fast lookup across views.
 *
 * @param {Object} commodity
 * @param {Object|null} config
 */
export function saveLocalShelfLifeConfig(commodity, config) {
  if (!commodity) return;
  const normalized = normalizeShelfLifeConfig(config);
  const store = _readConfigStore();

  const idKey = commodity.id ? `id:${commodity.id}` : null;
  const codeKey = commodity.commodity_code
    ? `code:${String(commodity.commodity_code).trim().toUpperCase()}`
    : null;

  if (!normalized) {
    if (idKey) delete store[idKey];
    if (codeKey) delete store[codeKey];
  } else {
    if (idKey) store[idKey] = normalized;
    if (codeKey) store[codeKey] = normalized;
  }

  _writeConfigStore(store);
}

/**
 * Retrieve cached shelf-life config for a commodity from localStorage.
 * @param {Object|null} commodity
 * @returns {Object|null}
 */
export function getLocalShelfLifeConfig(commodity) {
  if (!commodity) return null;
  const store = _readConfigStore();
  if (commodity.id && store[`id:${commodity.id}`]) {
    return normalizeShelfLifeConfig(store[`id:${commodity.id}`]);
  }
  if (commodity.commodity_code) {
    const codeKey = `code:${String(commodity.commodity_code).trim().toUpperCase()}`;
    if (store[codeKey]) return normalizeShelfLifeConfig(store[codeKey]);
  }
  return null;
}

/**
 * Hydrates a commodity object with its normalized shelf_life_config (DB first, then localStorage).
 * Also syncs DB-stored config into localStorage for offline/cross-module consistency.
 *
 * @param {Object} commodity
 * @returns {Object}
 */
export function hydrateCommodityShelfLife(commodity) {
  if (!commodity || typeof commodity !== 'object') return commodity;
  const dbConfig = normalizeShelfLifeConfig(commodity.shelf_life_config);
  if (dbConfig) {
    saveLocalShelfLifeConfig(commodity, dbConfig);
    commodity.shelf_life_config = dbConfig;
    return commodity;
  }
  const localConfig = getLocalShelfLifeConfig(commodity);
  if (localConfig) {
    commodity.shelf_life_config = localConfig;
  }
  return commodity;
}

/**
 * Build a full policy descriptor with display labels from normalized config.
 */
function _toPolicyDescriptor(config, isInferred = false) {
  const base = SHELF_LIFE_PROFILES[config.mode] || SHELF_LIFE_PROFILES[SHELF_LIFE_MODES.STANDARD];
  if (config.mode === SHELF_LIFE_MODES.CUSTOM) {
    const shelfTag = config.defaultShelfLifeDays ? `${config.defaultShelfLifeDays}d Custom` : `Custom (${config.nearExpiryDays}d/${config.goodDays}d)`;
    return {
      mode: SHELF_LIFE_MODES.CUSTOM,
      label: base.label,
      shortLabel: shelfTag,
      badgeLabel: shelfTag,
      goodDays: config.goodDays,
      nearExpiryDays: config.nearExpiryDays,
      defaultShelfLifeDays: config.defaultShelfLifeDays ?? null,
      isInferred,
    };
  }
  return {
    ...base,
    goodDays: config.goodDays,
    nearExpiryDays: config.nearExpiryDays,
    defaultShelfLifeDays: config.defaultShelfLifeDays ?? base.defaultShelfLifeDays,
    isInferred,
  };
}

/**
 * Resolve active Shelf-Life & Expiration Status Policy for a batch, commodity, or raw input context.
 *
 * @param {Object|null} [context=null] - Batch object (with embedded `commodities`), Commodity object, or `{ commodityName, category, deliveryDate, expirationDate }`
 * @returns {{
 *   mode: string,
 *   label: string,
 *   shortLabel: string,
 *   badgeLabel: string|null,
 *   goodDays: number,
 *   nearExpiryDays: number,
 *   defaultShelfLifeDays: number|null,
 *   isInferred: boolean
 * }}
 */
export function resolveShelfLifePolicy(context = null) {
  if (!context || typeof context !== 'object') {
    return { ...SHELF_LIFE_PROFILES[SHELF_LIFE_MODES.STANDARD], isInferred: false };
  }

  // Extract commodity entity if context is a batch, wrapper, or commodity itself
  const commodity = context.commodities || context.commodity || (
    (context.commodity_code !== undefined || context.unit !== undefined || context.shelf_life_config !== undefined) &&
    context.batch_number === undefined
      ? context
      : null
  );

  // 1. Explicit Commodity Policy (DB column or localStorage cache)
  if (commodity) {
    const explicit = normalizeShelfLifeConfig(commodity.shelf_life_config) || getLocalShelfLifeConfig(commodity);
    if (explicit) {
      return _toPolicyDescriptor(explicit, false);
    }
  } else if (context.shelf_life_config) {
    const explicit = normalizeShelfLifeConfig(context.shelf_life_config);
    if (explicit) {
      return _toPolicyDescriptor(explicit, false);
    }
  }

  // 2. Universal Standard Policy (Good >180d, Moderate 91–180d, Near Expiry 1–90d, Expired <=0d).
  // Short-life commodities automatically fall into Near Expiry upon intake and are prioritized via LSFO.
  return { ...SHELF_LIFE_PROFILES[SHELF_LIFE_MODES.STANDARD], isInferred: false };
}

/**
 * Compute universal LSFO (Least-Shelf-Life, First-Out) metrics from a batch's
 * Delivery Date and Expiration Date without hardcoding specific commodity names.
 *
 * @param {Object} batch
 * @returns {{ totalShelfLifeDays: number|null, daysRemaining: number|null, rslPercent: number|null, isShortLife: boolean }}
 */
export function computeBatchLsfoMetrics(batch) {
  if (!batch || typeof batch !== 'object') {
    return { totalShelfLifeDays: null, daysRemaining: null, rslPercent: null, isShortLife: false };
  }
  const delDate = batch.delivery_date || batch.deliveryDate || null;
  const expDate = batch.expiration_date || batch.expirationDate || null;
  const totalShelfLifeDays = _daysBetween(delDate, expDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysRemaining = _daysBetween(today, expDate);

  const rslPercent = (totalShelfLifeDays && totalShelfLifeDays > 0 && daysRemaining !== null)
    ? Math.max(0, Math.min(100, Math.round((daysRemaining / totalShelfLifeDays) * 100)))
    : null;

  const isShortLife = Boolean(
    totalShelfLifeDays !== null &&
    totalShelfLifeDays >= 1 &&
    totalShelfLifeDays <= EXPIRATION_THRESHOLDS.NEAR_EXPIRY_DAYS
  );

  return { totalShelfLifeDays, daysRemaining, rslPercent, isShortLife };
}

/**
 * Sort batches using FEFO, LSFO, or seamless Hybrid (FEFO primary + LSFO tie-breaker).
 *
 * - 'hybrid' (default): Earliest expiry first (FEFO), breaking ties by shortest total shelf life (LSFO).
 * - 'fefo': Strictly earliest expiration date first.
 * - 'lsfo': Shortest total shelf-life span (Exp - Del) first, then earliest expiry.
 *
 * @param {Array<Object>} batches
 * @param {'hybrid'|'fefo'|'lsfo'} [mode='hybrid']
 * @returns {Array<Object>}
 */
export function sortBatchesByDispatchRule(batches, mode = 'hybrid') {
  if (!Array.isArray(batches)) return [];
  const copy = [...batches];

  const metricsMap = new Map();
  for (const b of copy) {
    metricsMap.set(b, computeBatchLsfoMetrics(b));
  }

  copy.sort((a, b) => {
    const ma = metricsMap.get(a);
    const mb = metricsMap.get(b);
    const remA = ma.daysRemaining ?? Number.POSITIVE_INFINITY;
    const remB = mb.daysRemaining ?? Number.POSITIVE_INFINITY;
    const spanA = ma.totalShelfLifeDays ?? Number.POSITIVE_INFINITY;
    const spanB = mb.totalShelfLifeDays ?? Number.POSITIVE_INFINITY;

    if (mode === 'lsfo') {
      if (spanA !== spanB) return spanA - spanB;
      return remA - remB;
    }

    if (mode === 'fefo') {
      return remA - remB;
    }

    // Default: Hybrid FEFO + LSFO
    // Primary: FEFO (soonest expiration date first)
    if (remA !== remB) return remA - remB;
    // Tie-breaker: LSFO (shortest total shelf life first)
    return spanA - spanB;
  });

  return copy;
}

/**
 * Formats human-readable day range breakdown for UI previews and tooltips.
 * @param {{ goodDays: number, nearExpiryDays: number, defaultShelfLifeDays?: number|null }} policy
 * @returns {{ goodRange: string, moderateRange: string, nearRange: string, expiredRange: string, autoExpText: string }}
 */
export function formatPolicyRanges(policy) {
  const near = Number(policy?.nearExpiryDays) || EXPIRATION_THRESHOLDS.NEAR_EXPIRY_DAYS;
  const good = Number(policy?.goodDays) || EXPIRATION_THRESHOLDS.GOOD_DAYS;
  const modLow = near + 1;
  const goodLow = good + 1;
  const shelf = Number(policy?.defaultShelfLifeDays) || null;

  const goodRange = shelf && shelf >= goodLow
    ? `${goodLow}–${shelf}+ days (> ${good}d)`
    : `> ${good} days`;

  const moderateRange = modLow === good
    ? `${good} day${good !== 1 ? 's' : ''}`
    : `${modLow}–${good} days`;

  const nearRange = near === 1
    ? `1 day`
    : `1–${near} days`;

  const expiredRange = `≤ 0 days`;

  const autoExpText = shelf
    ? `Auto-sets Expiration Date = Delivery Date + ${shelf} day${shelf !== 1 ? 's' : ''} during batch intake.`
    : `Manual Expiration Date entry during batch intake (manufacturer package expiry).`;

  return { goodRange, moderateRange, nearRange, expiredRange, autoExpText };
}
