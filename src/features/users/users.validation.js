/**
 * User Form Validation
 *
 * Client-side validation for creating new user accounts.
 */

import { ROLES } from '../../shared/constants/app.constants.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate the Create User form inputs.
 *
 * @param {{ full_name, email, password, role }} data
 * @returns {{ isValid: boolean, errors: Object }}
 */
export function validateUserForm(data) {
  const errors = {};

  // Full Name
  if (!data.full_name || !data.full_name.trim()) {
    errors.full_name = 'Full name is required.';
  } else if (data.full_name.trim().length < 2) {
    errors.full_name = 'Full name must be at least 2 characters.';
  }

  // Email / Username
  if (!data.email || !data.email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_REGEX.test(data.email.trim())) {
    errors.email = 'Please enter a valid email address (e.g. staff.maria@nutrivision.mnao).';
  }

  // Password
  if (!data.password) {
    errors.password = 'Initial password is required.';
  } else if (data.password.length < 6) {
    errors.password = 'Password must be at least 6 characters long.';
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
