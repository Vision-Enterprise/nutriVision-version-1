/**
 * Application-Wide Constants
 *
 * WHY this file exists:
 * Magic numbers and repeated string literals scattered across the codebase
 * are a maintenance hazard. If the client changes the "Near Expiry" threshold
 * from 30 to 45 days, you should update ONE line — not hunt through 20 files.
 *
 * Rule: if a value is used in more than one place, it belongs here.
 */

// ── Application Metadata ───────────────────────────────────────────────────

export const APP_NAME = 'NutriVision';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'Nutrition Commodity Inventory System';
export const APP_ORGANIZATION = 'Municipal Nutrition Action Office, Manolo Fortich, Bukidnon';

// ── User Roles ─────────────────────────────────────────────────────────────
//
// These strings MUST match exactly what is stored in the profiles.role column.
// Do not compare role strings inline — always use ROLES.ADMINISTRATOR, etc.
// This prevents typos causing silent authorization failures.

export const ROLES = {
  ADMINISTRATOR:       'administrator',
  NUTRITION_PERSONNEL: 'nutrition_personnel',
};

// ── Expiration Thresholds ──────────────────────────────────────────────────
//
// HOW the thresholds work:
//
//   days remaining > GOOD_DAYS          → GOOD
//   days remaining > NEAR_EXPIRY_DAYS   → MODERATE
//   days remaining > 0                  → NEAR_EXPIRY
//   days remaining <= 0                 → EXPIRED
//
// WHY 90 and 30?
// These are the initial thresholds agreed upon for V1.
// The exact numbers may change based on client or adviser feedback.
// Because they live here, changing them requires editing this file only.

export const EXPIRATION_THRESHOLDS = {
  GOOD_DAYS:       180,
  NEAR_EXPIRY_DAYS: 90,
};

// ── Expiration Status Labels ───────────────────────────────────────────────
//
// Used in badge text, aria-labels, and any UI that displays status.

export const EXPIRATION_STATUS = {
  GOOD:       'Good',
  MODERATE:   'Moderate',
  NEAR_EXPIRY: 'Near Expiry',
  EXPIRED:    'Expired',
};

// ── Hash Routes ────────────────────────────────────────────────────────────
//
// WHY hash routing?
// Hash routing (#/route) works without server configuration.
// The browser never sends the hash to the server, so the server
// always serves index.html, and the client-side router handles navigation.
// History API routing (/route) requires the server to redirect all
// paths to index.html — more configuration, less portable for V1.

export const ROUTES = {
  LOGIN:      '#/login',
  DASHBOARD:  '#/dashboard',
  COMMODITIES:'#/commodities',
  USERS:      '#/users',
  AUDIT_LOGS: '#/audit-logs',
  ACCOUNT:    '#/account',
};

// ── Audit Log Action Types ─────────────────────────────────────────────────
//
// Every recorded action in audit_logs.action must be one of these values.
// This creates a consistent, searchable audit trail.

export const AUDIT_ACTIONS = {
  LOGIN:              'LOGIN',
  LOGOUT:             'LOGOUT',
  CREATE_USER:        'CREATE_USER',
  ACTIVATE_USER:      'ACTIVATE_USER',
  DEACTIVATE_USER:    'DEACTIVATE_USER',
  CREATE_COMMODITY:   'CREATE_COMMODITY',
  UPDATE_COMMODITY:   'UPDATE_COMMODITY',
  DELETE_COMMODITY:   'DELETE_COMMODITY',
  CREATE_BATCH:       'CREATE_BATCH',
  UPDATE_BATCH:       'UPDATE_BATCH',
  DELETE_BATCH:       'DELETE_BATCH',
  RELEASE_BATCH:      'RELEASE_BATCH',
};

// ── Commodity Categories ───────────────────────────────────────────────────
//
// Used to populate the Category dropdown when adding a commodity.
// Kept here so future additions only require editing this file.

export const COMMODITY_CATEGORIES = [
  'Vitamins',
  'Minerals',
  'Supplements',
  'Therapeutics',
  'Equipment',
  'Other',
];

// ── Units of Measure ───────────────────────────────────────────────────────
//
// Used to populate the Unit dropdown when adding a commodity.

export const COMMODITY_UNITS = [
  'Capsule',
  'Tablet',
  'Sachet',
  'Bottle',
  'Box',
  'Pack',
  'Piece',
  'Kilogram',
  'Gram',
  'Liter',
  'Milliliter',
];

// ── Pagination ─────────────────────────────────────────────────────────────

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  AUDIT_LOG_PAGE_SIZE: 30,
};


/**
 * Official Barangays of Manolo Fortich, Bukidnon
 */
export const BARANGAYS = [
  'Agusan Canyon',
  'Alae',
  'Dahilayan',
  'Dalirig',
  'Damilag',
  'Dicklum',
  'Guilang-guilang',
  'Kalugmanan',
  'Lindaban',
  'Lingion',
  'Lunocan',
  'Maluko',
  'Mambatangan',
  'Mampayag',
  'Mantibugao',
  'Minsuro',
  'San Miguel',
  'Sankanan',
  'Santiago',
  'Santo Niño',
  'Tankulan',
  'Ticala'
];
