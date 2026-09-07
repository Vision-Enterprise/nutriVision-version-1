/**
 * Authentication - View (Render)
 *
 * Pure HTML rendering functions for the Login view:
 *   - Brand showcase panel (logo, org description)
 *   - Login form panel (email, password with visibility toggle, alerts)
 */

import logoUrl from '../../assets/logo.png';
import { APP_ORGANIZATION } from '../../shared/constants/app.constants.js';

export function renderLoginLayout() {
  return `
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
          <div class="auth-mobile-logo" aria-hidden="true" style="margin-bottom: var(--space-6);">
            <img src="${logoUrl}" alt="NutriVision Logo" style="height: 36px; width: auto; max-width: 100%; display: block;" />
          </div>

          <div class="auth-form-header">
            <h2 class="auth-form-title">Welcome back</h2>
            <p class="auth-form-subtitle">Sign in to your account to continue</p>
          </div>

          <!-- Error alert — hidden by default -->
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
}
