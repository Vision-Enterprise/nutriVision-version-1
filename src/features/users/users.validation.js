/**
 * User Form Validation
 *
 * Client-side validation for creating new user accounts.
 */

import { ROLES } from '../../shared/constants/app.constants.js';
import { normalizeStaffEmail } from './users.service.js';
import { validatePasswordStrength } from '../../shared/utils/password.utils.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate the Create User form inputs.
 *
 * @param {{ first_name, last_name, full_name, email, password, role }} data
 * @returns {{ isValid: boolean, errors: Object }}
 */
export function validateUserForm(data) {
  const errors = {};

  // Separate First & Last Name validation
  if (!data.first_name || !data.first_name.trim()) {
    errors.first_name = 'First name is required.';
  } else if (data.first_name.trim().length < 2) {
    errors.first_name = 'First name must be at least 2 characters.';
  }

  if (!data.last_name || !data.last_name.trim()) {
    errors.last_name = 'Last name is required.';
  } else if (data.last_name.trim().length < 2) {
    errors.last_name = 'Last name must be at least 2 characters.';
  }

  // Email / Account ID (accepts "20260001" or "20260001@mnao.ph")
  const normalizedEmail = normalizeStaffEmail(data.email);
  if (!normalizedEmail) {
    errors.email = 'Account ID / Email is required.';
  } else if (!EMAIL_REGEX.test(normalizedEmail)) {
    errors.email = 'Please enter a valid Account ID or email (e.g. 20260001@mnao.ph).';
  }

  // Strong Password Policy (#89)
  const pwCheck = validatePasswordStrength(data.password);
  if (!data.password) {
    errors.password = 'Initial password is required.';
  } else if (!pwCheck.isValid) {
    errors.password = pwCheck.error;
  }

  // Role
  const validRoles = [ROLES.ADMINISTRATOR, ROLES.NUTRITION_PERSONNEL];
  if (!data.role || !validRoles.includes(data.role)) {
    errors.role = 'Please select a valid user role.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
