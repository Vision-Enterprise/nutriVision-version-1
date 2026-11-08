/**
 * Authentication Page (Controller)
 *
 * Coordinates login form inputs, client validation, brute-force cooldown,
 * auth service calls, and user callbacks.
 *
 * MVC Controller: delegates layout to .render.js.
 */

import { login } from './auth.service.js';
import { validateLoginForm } from './auth.validation.js';
import { renderLoginLayout } from './auth.render.js';
import { normalizeStaffEmail } from '../users/users.service.js';

const LOGIN_GUARD_KEY   = 'nutrivision_login_guard';
const AUTH_NOTICE_KEY   = 'nutrivision_auth_notice';
const MAX_FAILED_TRIES  = 5;
const COOLDOWN_MS       = 30 * 1000;

let _cooldownInterval = null;

function _readGuard() {
  try {
    const raw = sessionStorage.getItem(LOGIN_GUARD_KEY);
    if (!raw) return { failures: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw);
    return {
      failures: Number(parsed?.failures) || 0,
      lockedUntil: Number(parsed?.lockedUntil) || 0,
    };
  } catch {
    return { failures: 0, lockedUntil: 0 };
  }
}

function _writeGuard(state) {
  try {
    sessionStorage.setItem(LOGIN_GUARD_KEY, JSON.stringify(state));
  } catch {}
}

function _clearGuard() {
  try {
    sessionStorage.removeItem(LOGIN_GUARD_KEY);
  } catch {}
}

export function renderLoginPage(onSuccess) {
  const app = document.getElementById('app');
  if (!app) return;

  if (_cooldownInterval) {
    clearInterval(_cooldownInterval);
    _cooldownInterval = null;
  }

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

  // Display any forced-logout notice (e.g. account deactivated while signed in)
  try {
    const notice = sessionStorage.getItem(AUTH_NOTICE_KEY);
    if (notice) {
      sessionStorage.removeItem(AUTH_NOTICE_KEY);
      showError(errorBox, errorMsg, notice);
    }
  } catch {}

  // Resume active cooldown if user refreshed during lockout
  _syncCooldownUI(submitBtn, btnText, errorBox, errorMsg);

  // Input clear handlers
  emailInput?.addEventListener('input', () => clearFieldError(emailInput, emailError));
  passInput?.addEventListener('input', () => clearFieldError(passInput, passError));

  // Auto-complete "@mnao.ph" when user types just an ID like "20260001" and leaves field
  emailInput?.addEventListener('blur', () => {
    const val = emailInput.value.trim();
    if (val && !val.includes('@')) {
      emailInput.value = normalizeStaffEmail(val);
    }
  });

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

    // Check active brute-force cooldown
    const guard = _readGuard();
    if (guard.lockedUntil > Date.now()) {
      _syncCooldownUI(submitBtn, btnText, errorBox, errorMsg);
      return;
    }

    const rawEmail = emailInput.value.trim();
    const email    = normalizeStaffEmail(rawEmail);
    if (rawEmail && !rawEmail.includes('@')) {
      emailInput.value = email;
    }
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
      const nextFailures = (guard.lockedUntil && guard.lockedUntil <= Date.now() ? 0 : guard.failures) + 1;
      if (nextFailures >= MAX_FAILED_TRIES) {
        _writeGuard({ failures: 0, lockedUntil: Date.now() + COOLDOWN_MS });
        _syncCooldownUI(submitBtn, btnText, errorBox, errorMsg);
      } else {
        _writeGuard({ failures: nextFailures, lockedUntil: 0 });
        const remaining = MAX_FAILED_TRIES - nextFailures;
        const suffix = remaining <= 2 ? ` (${remaining} attempt${remaining === 1 ? '' : 's'} remaining before 30s cooldown)` : '';
        showError(errorBox, errorMsg, `${error}${suffix}`);
      }
      return;
    }

    _clearGuard();

    if (typeof onSuccess === 'function') {
      onSuccess(profile);
    }
  });
}

function _syncCooldownUI(submitBtn, btnText, errorBox, errorMsg) {
  if (_cooldownInterval) {
    clearInterval(_cooldownInterval);
    _cooldownInterval = null;
  }

  const tick = () => {
    const { lockedUntil } = _readGuard();
    const remainingSec = Math.ceil((lockedUntil - Date.now()) / 1000);

    if (remainingSec > 0) {
      if (submitBtn) submitBtn.disabled = true;
      if (btnText) btnText.textContent = `Try again in ${remainingSec}s`;
      showError(
        errorBox,
        errorMsg,
        `Too many failed sign-in attempts. Please wait ${remainingSec}s before trying again.`
      );
      return true;
    }

    if (_cooldownInterval) {
      clearInterval(_cooldownInterval);
      _cooldownInterval = null;
    }
    _clearGuard();
    if (submitBtn) submitBtn.disabled = false;
    if (btnText) btnText.textContent = 'Sign In';
    hideError(errorBox);
    return false;
  };

  const isLocked = _readGuard().lockedUntil > Date.now();
  if (isLocked && tick()) {
    _cooldownInterval = setInterval(tick, 1000);
  }
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
