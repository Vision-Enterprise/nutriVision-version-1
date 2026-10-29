/**
 * Authentication Validation
 *
 * Validates login form inputs before sending them to Supabase.
 * Supports signing in with just an Account ID (e.g. "20260001")
 * by normalizing it to "20260001@mnao.ph".
 */

import { normalizeStaffEmail } from '../users/users.service.js';

/**
 * Validate the login form inputs.
 *
 * @param {Object} fields
 * @param {string} fields.email
 * @param {string} fields.password
 * @returns {{ valid: boolean, errors: Object }}
 */
export function validateLoginForm({ email, password }) {
  const errors = {};
  const normalized = normalizeStaffEmail(email);

  // Email / Account ID validation
  if (!normalized) {
    errors.email = 'Account ID or email address is required.';
  } else if (!isValidEmailFormat(normalized)) {
    errors.email = 'Please enter a valid Account ID (e.g. 20260001) or email address.';
  }

  // Password validation
  if (!password || password.trim() === '') {
    errors.password = 'Password is required.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Basic email format check after normalization.
 *
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmailFormat(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
