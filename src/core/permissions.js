/**
 * Permissions Module
 *
 * Centralizes all role-based access checks.
 *
 * WHY a separate permissions module?
 * Role checks appear in many places: navigation rendering, page guards,
 * button visibility. If you inline `profile.role === 'administrator'`
 * everywhere, a role rename requires hunting through the entire codebase.
 * With this module, every check goes through one function.
 *
 * IMPORTANT: These functions control UI visibility only.
 * Real authorization is enforced by Supabase RLS policies in the database.
 * A determined user could manipulate JavaScript in the browser.
 * The database enforces the actual security boundary.
 *
 * Think of frontend permissions as: "Should we SHOW this button?"
 * Think of RLS as: "Should we ALLOW this database operation?"
 * Both are necessary. Neither alone is sufficient.
 */

import { ROLES } from '../shared/constants/app.constants.js';

/**
 * Check if the profile belongs to an administrator.
 * @param {Object} profile - The user's profile object from the database
 * @returns {boolean}
 */
export function isAdministrator(profile) {
  return profile?.role === ROLES.ADMINISTRATOR;
}

/**
 * Check if the profile belongs to nutrition personnel.
 * @param {Object} profile - The user's profile object from the database
 * @returns {boolean}
 */
export function isNutritionPersonnel(profile) {
  return profile?.role === ROLES.NUTRITION_PERSONNEL;
}

/**
 * Check if the user account is active.
 * Deactivated accounts should not be allowed into the application.
 * @param {Object} profile - The user's profile object from the database
 * @returns {boolean}
 */
export function isActive(profile) {
  return profile?.is_active === true;
}

/**
 * Check if the user can access the User Management section.
 * Administrator only.
 * @param {Object} profile
 * @returns {boolean}
 */
export function canAccessUserManagement(profile) {
  return isAdministrator(profile) && isActive(profile);
}

/**
 * Check if the user can access the Audit Logs section.
 * Administrator only.
 * @param {Object} profile
 * @returns {boolean}
 */
export function canAccessAuditLogs(profile) {
  return isAdministrator(profile) && isActive(profile);
}

/**
 * Check if the user can access Commodity Management.
 * Both roles can access commodities.
 * @param {Object} profile
 * @returns {boolean}
 */
export function canAccessCommodities(profile) {
  return isActive(profile);
}

/**
 * Return a human-readable role label for display.
 * @param {Object} profile
 * @returns {string}
 */
export function getRoleLabel(profile) {
  if (!profile) return 'Unknown';
  switch (profile.role) {
    case ROLES.ADMINISTRATOR:       return 'Administrator';
    case ROLES.NUTRITION_PERSONNEL: return 'Nutrition Personnel';
    default: return 'Unknown';
  }
}
