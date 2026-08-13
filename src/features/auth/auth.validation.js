/**
 * Authentication Validation
 *
 * Validates login form inputs before sending them to Supabase.
 *
 * WHY validate on the frontend at all if Supabase also validates?
 * 1. User experience: show errors instantly without a network round-trip.
 *    "Email is required" should appear immediately, not after 300ms.
 * 2. Cost: fewer unnecessary Supabase API calls.
 * 3. Clarity: we control the error messages shown to users.
 *    Supabase error messages are generic; ours are specific and helpful.
 *
 * Frontend validation is NOT a security measure — it can be bypassed.
 * Supabase Auth is the actual security boundary.
 */

/**
 * Validate the login form inputs.
 *
 * @param {Object} fields
 * @param {string} fields.email
 * @param {string} fields.password
 * @returns {{ valid: boolean, errors: Object }}
 *
 * Example return when invalid:
 * {
 *   valid: false,
 *   errors: {
 *     email: 'Email address is required.',
 *     password: 'Password is required.'
 *   }
 * }
 *
 * Example return when valid:
 * { valid: true, errors: {} }
 */
export function validateLoginForm({ email, password }) {
  const errors = {};

  // Email validation
  if (!email || email.trim() === '') {
    errors.email = 'Email address is required.';
  } else if (!isValidEmailFormat(email.trim())) {
    errors.email = 'Please enter a valid email address.';
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
 * Basic email format check.
 * Checks for the presence of @ and a domain with a dot.
 * Not exhaustive — Supabase Auth handles true email validation.
 *
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmailFormat(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
