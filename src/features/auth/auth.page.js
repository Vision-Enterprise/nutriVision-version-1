/**
 * Authentication Page (Controller)
 *
 * Coordinates login form inputs, client validation, auth service calls,
 * and user callbacks.
 *
 * MVC Controller: delegates layout to .render.js.
 */

import { login } from './auth.service.js';
import { validateLoginForm } from './auth.validation.js';
import { renderLoginLayout } from './auth.render.js';

export function renderLoginPage(onSuccess) {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = renderLoginLayout();
  attachLoginHandlers(onSuccess);
}

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

  // Input clear handlers
  emailInput?.addEventListener('input', () => clearFieldError(emailInput, emailError));
  passInput?.addEventListener('input', () => clearFieldError(passInput, passError));

  // Password visibility toggle
  toggleBtn?.addEventListener('click', () => {
    const isPassword = passInput.type === 'password';
    passInput.type = isPassword ? 'text' : 'password';
    toggleBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    toggleBtn.setAttribute('title', isPassword ? 'Hide password' : 'Show password');

    eyeIcon.innerHTML = isPassword
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  });

  // Submit handler
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email    = emailInput.value.trim();
    const password = passInput.value;

    hideError(errorBox);
    clearFieldError(emailInput, emailError);
    clearFieldError(passInput, passError);

    const { valid, errors } = validateLoginForm({ email, password });
    if (!valid) {
      if (errors.email)    showFieldError(emailInput, emailError, errors.email);
      if (errors.password) showFieldError(passInput, passError, errors.password);
      return;
    }

    setLoading(true, submitBtn, btnText, btnSpinner);
    const { profile, error } = await login(email, password);
    setLoading(false, submitBtn, btnText, btnSpinner);

    if (error) {
      showError(errorBox, errorMsg, error);
      return;
    }

    if (typeof onSuccess === 'function') {
      onSuccess(profile);
    }
  });
}

function setLoading(isLoading, btn, text, spinner) {
  if (!btn) return;
  btn.disabled     = isLoading;
  if (text) text.textContent = isLoading ? 'Signing in...' : 'Sign In';
  if (spinner) spinner.style.display = isLoading ? 'inline-block' : 'none';
}

function showError(box, msgEl, message) {
  if (msgEl) msgEl.textContent = message;
  if (box) {
    box.style.display = 'flex';
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function hideError(box) {
  if (box) box.style.display = 'none';
}

function showFieldError(input, errorEl, message) {
  input?.classList.add('form-input--error');
  if (errorEl) errorEl.textContent = message;
}

function clearFieldError(input, errorEl) {
  input?.classList.remove('form-input--error');
  if (errorEl) errorEl.textContent = '';
}
