/**
 * Authentication Page
 *
 * Renders the login form and handles all login UI interactions.
 *
 * Responsibilities:
 * - Render the login page HTML
 * - Collect and validate form inputs
 * - Show loading, error, and success states
 * - Call auth.service.js login() on submit
 * - Call the onSuccess callback when login succeeds
 *
 * This file does NOT:
 * - Talk directly to Supabase (that's auth.service.js)
 * - Decide what page to show after login (that's main.js / router)
 * - Check roles or permissions (that's permissions.js)
 */

import { login } from './auth.service.js';
import logoUrl from '../../assets/logo.png';
import { validateLoginForm } from './auth.validation.js';
import { APP_NAME, APP_ORGANIZATION } from '../../shared/constants/app.constants.js';

/**
 * Render the login page into the #app element.
 *
 * @param {Function} onSuccess - Called with the profile object after successful login
 */
export function renderLoginPage(onSuccess) {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="auth-layout" role="main">

      <!-- Left panel: brand identity -->
      <div class="auth-brand" aria-hidden="true">
        <div class="auth-brand__inner">

          <div style="margin-bottom: var(--space-6);">
            <img src="${logoUrl}" alt="NutriVision Logo" style="height: 56px; width: auto; max-width: 100%; display: block;" />
          </div>
          <p class="auth-brand__description">
            Nutrition Commodity<br>Inventory System
          </p>

          <div class="auth-brand__divider"></div>

          <p class="auth-brand__org">${APP_ORGANIZATION}</p>

        </div>
      </div>

      <!-- Right panel: login form -->
      <div class="auth-form-panel">
        <div class="auth-form-wrapper">

          <!-- Mobile-only logo (hidden on desktop) -->
          <!-- Mobile-only logo (hidden on desktop) -->
          <div class="auth-mobile-logo" aria-hidden="true" style="margin-bottom: var(--space-6);">
            <img src="${logoUrl}" alt="NutriVision Logo" style="height: 36px; width: auto; max-width: 100%; display: block;" />
          </div>

          <div class="auth-form-header">
            <h2 class="auth-form-title">Welcome back</h2>
            <p class="auth-form-subtitle">Sign in to your account to continue</p>
          </div>

          <!-- Error alert â€” hidden by default -->
          <div
            id="auth-error"
            class="alert alert-error"
            role="alert"
            aria-live="polite"
            style="display: none;"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span id="auth-error-message"></span>
          </div>

          <!-- Login form -->
          <form id="login-form" novalidate>

            <div class="form-group">
              <label for="login-email" class="form-label form-label--required">
                Email Address
              </label>
              <input
                type="email"
                id="login-email"
                name="email"
                class="form-input"
                placeholder="you@example.com"
                autocomplete="email"
                required
                aria-describedby="login-email-error"
              />
              <span
                id="login-email-error"
                class="form-error"
                role="alert"
                aria-live="polite"
              ></span>
            </div>

            <div class="form-group" style="margin-top: var(--space-4);">
              <label for="login-password" class="form-label form-label--required">
                Password
              </label>
              <div class="auth-password-wrapper">
                <input
                  type="password"
                  id="login-password"
                  name="password"
                  class="form-input"
                  placeholder="Enter your password"
                  autocomplete="current-password"
                  required
                  aria-describedby="login-password-error"
                />
                <button
                  type="button"
                  id="toggle-password"
                  class="auth-password-toggle"
                  aria-label="Show password"
                  title="Show password"
                >
                  <svg id="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
              <span
                id="login-password-error"
                class="form-error"
                role="alert"
                aria-live="polite"
              ></span>
            </div>

            <button
              type="submit"
              id="login-submit"
              class="btn btn-primary btn-full"
              style="margin-top: var(--space-6);"
            >
              <span id="login-btn-text">Sign In</span>
              <span id="login-btn-spinner" class="spinner" style="display: none;" aria-hidden="true"></span>
            </button>

          </form>

          <p class="auth-footer-note">
            Contact your administrator if you do not have an account.
          </p>

        </div>
      </div>

    </div>
  `;

  // Attach event listeners after HTML is in the DOM
  attachLoginHandlers(onSuccess);
}

/**
 * Attach event listeners to the login form elements.
 * Called once after renderLoginPage() puts the HTML into the DOM.
 */
function attachLoginHandlers(onSuccess) {
  const form        = document.getElementById('login-form');
  const emailInput  = document.getElementById('login-email');
  const passInput   = document.getElementById('login-password');
  const toggleBtn   = document.getElementById('toggle-password');
  const eyeIcon     = document.getElementById('eye-icon');
  const submitBtn   = document.getElementById('login-submit');
  const btnText     = document.getElementById('login-btn-text');
  const btnSpinner  = document.getElementById('login-btn-spinner');
  const errorBox    = document.getElementById('auth-error');
  const errorMsg    = document.getElementById('auth-error-message');
  const emailError  = document.getElementById('login-email-error');
  const passError   = document.getElementById('login-password-error');

  // Clear field-level error when user starts typing
  emailInput.addEventListener('input', () => clearFieldError(emailInput, emailError));
  passInput.addEventListener('input', () => clearFieldError(passInput, passError));

  // Password visibility toggle
  toggleBtn.addEventListener('click', () => {
    const isPassword = passInput.type === 'password';
    passInput.type = isPassword ? 'text' : 'password';
    toggleBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    toggleBtn.setAttribute('title', isPassword ? 'Hide password' : 'Show password');

    // Toggle eye icon between open and closed
    eyeIcon.innerHTML = isPassword
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  });

  // Form submit
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email    = emailInput.value.trim();
    const password = passInput.value;

    // Clear previous errors
    hideError(errorBox);
    clearFieldError(emailInput, emailError);
    clearFieldError(passInput, passError);

    // Validate
    const { valid, errors } = validateLoginForm({ email, password });

    if (!valid) {
      if (errors.email)    showFieldError(emailInput, emailError, errors.email);
      if (errors.password) showFieldError(passInput, passError, errors.password);
      return;
    }

    // Show loading state
    setLoading(true, submitBtn, btnText, btnSpinner);

    // Attempt login
    const { profile, error } = await login(email, password);

    setLoading(false, submitBtn, btnText, btnSpinner);

    if (error) {
      showError(errorBox, errorMsg, error);
      return;
    }

    // Success â€” hand off to the caller (main.js)
    onSuccess(profile);
  });
}

// â”€â”€ UI Helper Functions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function setLoading(isLoading, btn, text, spinner) {
  btn.disabled     = isLoading;
  text.textContent = isLoading ? 'Signing in...' : 'Sign In';
  spinner.style.display = isLoading ? 'inline-block' : 'none';
}

function showError(box, msgEl, message) {
  msgEl.textContent = message;
  box.style.display = 'flex';
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideError(box) {
  box.style.display = 'none';
}

function showFieldError(input, errorEl, message) {
  input.classList.add('form-input--error');
  errorEl.textContent = message;
}

function clearFieldError(input, errorEl) {
  input.classList.remove('form-input--error');
  errorEl.textContent = '';
}


