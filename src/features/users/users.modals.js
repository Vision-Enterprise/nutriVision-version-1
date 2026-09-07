/**
 * User Management - Modals (Interactions)
 *
 * Dedicated modal interactions for:
 *   - Create New User Account
 *   - Activate / Deactivate User Status Confirmation
 */

import { createUser, toggleUserStatus } from './users.service.js';
import { validateUserForm } from './users.validation.js';
import { escapeHtml } from './users.render.js';
import { ROLES } from '../../shared/constants/app.constants.js';
import { SystemDialog } from '../../shared/components/dialog.component.js';

let _activeUserModalEscHandler = null;

export function closeUserModal() {
  const overlay = document.getElementById('user-modal-overlay') || document.getElementById('confirm-modal-overlay');
  if (!overlay) return;
  if (_activeUserModalEscHandler) {
    document.removeEventListener('keydown', _activeUserModalEscHandler);
    _activeUserModalEscHandler = null;
  }
  overlay.remove();
}

/**
 * Open Create User Account Modal
 */
export function openAddUserModal({ profile, onSuccess }) {
  closeUserModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'user-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Create New User Account');

  overlay.innerHTML = `
    <div class="modal" style="max-width: 480px; width: 100%;">
      <div class="modal-header">
        <h2 class="modal-title">Create User Account</h2>
        <button id="modal-close-btn" class="modal-close" type="button" aria-label="Close dialog">
          <span class="icon">close</span>
        </button>
      </div>

      <form id="create-user-form" novalidate>
        <div class="modal-body" style="display: flex; flex-direction: column; gap: var(--space-4);">
          
          <div id="modal-form-alert" class="alert alert-error" style="display: none;" role="alert">
            <span class="icon">error</span>
            <span id="modal-form-alert-msg"></span>
          </div>

          <!-- Full Name -->
          <div class="form-group">
            <label for="field-full-name" class="form-label form-label--required">Full Name</label>
            <input
              type="text"
              id="field-full-name"
              name="full_name"
              class="form-input"
              placeholder="e.g. Maria Santos"
              autocomplete="name"
              required
            />
            <span class="form-error" id="error-full_name" role="alert"></span>
          </div>

          <!-- Office Email / Username -->
          <div class="form-group">
            <label for="field-email" class="form-label form-label--required">Office Email / Account ID</label>
            <input
              type="email"
              id="field-email"
              name="email"
              class="form-input"
              placeholder="e.g. staff.maria@nutrivision.mnao"
              autocomplete="off"
              required
            />
            <span class="form-hint">Used by staff to sign in. Format: name@domain</span>
            <span class="form-error" id="error-email" role="alert"></span>
          </div>

          <!-- Initial Password -->
          <div class="form-group">
            <label for="field-password" class="form-label form-label--required">Initial Password</label>
            <div style="position: relative;">
              <input
                type="password"
                id="field-password"
                name="password"
                class="form-input"
                placeholder="At least 6 characters"
                autocomplete="new-password"
                required
                style="padding-right: 42px;"
              />
              <button
                type="button"
                id="toggle-pwd-btn"
                class="btn btn-ghost"
                style="position: absolute; right: 4px; top: 50%; transform: translateY(-50%); padding: 6px; color: var(--color-text-muted);"
                aria-label="Show password"
              >
                <span class="icon icon--sm" id="toggle-pwd-icon">visibility</span>
              </button>
            </div>
            <span class="form-hint">Staff can change this after logging in.</span>
            <span class="form-error" id="error-password" role="alert"></span>
          </div>

          <!-- Role -->
          <div class="form-group">
            <label for="field-role" class="form-label form-label--required">System Role</label>
            <select id="field-role" name="role" class="form-input" required>
              <option value="${ROLES.NUTRITION_PERSONNEL}" selected>Nutrition Personnel (Standard Access)</option>
              <option value="${ROLES.ADMINISTRATOR}">Administrator (Full System Access)</option>
            </select>
            <span class="form-error" id="error-role" role="alert"></span>
          </div>

        </div>

        <div class="modal-footer">
          <button id="modal-cancel-btn" class="btn btn-ghost" type="button">Cancel</button>
          <button id="modal-submit-btn" class="btn btn-primary" type="submit">
            <span id="modal-submit-text">Create Account</span>
            <span id="modal-submit-spinner" class="spinner" style="display: none;" aria-hidden="true"></span>
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('field-full-name')?.focus(), 50);

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeUserModal();
  });

  document.getElementById('modal-close-btn')?.addEventListener('click', closeUserModal);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', closeUserModal);

  const pwdInput = document.getElementById('field-password');
  const toggleBtn = document.getElementById('toggle-pwd-btn');
  const toggleIcon = document.getElementById('toggle-pwd-icon');

  toggleBtn?.addEventListener('click', () => {
    const isPass = pwdInput.type === 'password';
    pwdInput.type = isPass ? 'text' : 'password';
    toggleIcon.textContent = isPass ? 'visibility_off' : 'visibility';
    toggleBtn.setAttribute('aria-label', isPass ? 'Hide password' : 'Show password');
  });

  _activeUserModalEscHandler = e => { if (e.key === 'Escape') closeUserModal(); };
  document.addEventListener('keydown', _activeUserModalEscHandler);

  document.getElementById('create-user-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const formData = {
      full_name: form.full_name.value.trim(),
      email:     form.email.value.trim(),
      password:  form.password.value,
      role:      form.role.value,
    };

    ['full_name', 'email', 'password', 'role'].forEach(field => {
      const errEl = document.getElementById(`error-${field}`);
      const inputEl = document.getElementById(`field-${field}`);
      if (errEl) errEl.textContent = '';
      if (inputEl) inputEl.classList.remove('form-input--error');
    });

    const alertEl = document.getElementById('modal-form-alert');
    if (alertEl) alertEl.style.display = 'none';

    const { isValid, errors } = validateUserForm(formData);
    if (!isValid) {
      Object.entries(errors).forEach(([field, msg]) => {
        const errEl = document.getElementById(`error-${field}`);
        const inputEl = document.getElementById(`field-${field}`);
        if (errEl) errEl.textContent = msg;
        if (inputEl) inputEl.classList.add('form-input--error');
      });
      return;
    }

    setUserModalLoading(true);
    const { user, error } = await createUser(formData, profile);
    setUserModalLoading(false);

    if (error) {
      const msgEl = document.getElementById('modal-form-alert-msg');
      if (alertEl && msgEl) {
        msgEl.textContent = error;
        alertEl.style.display = 'flex';
      }
      return;
    }

    closeUserModal();
    if (typeof onSuccess === 'function') onSuccess(user);
  });
}

function setUserModalLoading(isLoading) {
  const btn     = document.getElementById('modal-submit-btn');
  const text    = document.getElementById('modal-submit-text');
  const spinner = document.getElementById('modal-submit-spinner');
  const cancel  = document.getElementById('modal-cancel-btn');
  const close   = document.getElementById('modal-close-btn');

  if (!btn) return;
  btn.disabled     = isLoading;
  if (cancel) cancel.disabled = isLoading;
  if (close)  close.disabled  = isLoading;
  if (text)    text.textContent      = isLoading ? 'Creating...' : 'Create Account';
  if (spinner) spinner.style.display = isLoading ? 'inline-block' : 'none';
}

/**
 * Open Activate/Deactivate Confirmation Dialog
 */
export function openConfirmToggleStatusModal({ user, profile, onSuccess }) {
  closeUserModal();

  const isDeactivating = user.is_active;
  const actionText = isDeactivating ? 'Deactivate' : 'Activate';
  const actionColor = isDeactivating ? 'btn-danger' : 'btn-primary';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'confirm-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', `${actionText} User Account`);

  overlay.innerHTML = `
    <div class="modal" style="max-width: 440px; width: 100%;">
      <div class="modal-header">
        <h2 class="modal-title">${actionText} Account</h2>
        <button id="confirm-close-btn" class="modal-close" type="button" aria-label="Close dialog">
          <span class="icon">close</span>
        </button>
      </div>

      <div class="modal-body">
        <p style="color: var(--color-text); margin-bottom: var(--space-3);">
          Are you sure you want to <strong>${actionText.toLowerCase()}</strong> the account for <strong>${escapeHtml(user.full_name)}</strong>?
        </p>
        <p style="color: var(--color-text-muted); font-size: var(--font-size-sm); margin: 0;">
          ${isDeactivating
            ? 'The user will immediately lose access and will not be able to sign in. All historical audit logs and data records remain preserved.'
            : 'The user will immediately regain access to sign in to NutriVision.'}
        </p>
      </div>

      <div class="modal-footer">
        <button id="confirm-cancel-btn" class="btn btn-ghost" type="button">Cancel</button>
        <button id="confirm-action-btn" class="btn ${actionColor}" type="button">
          <span id="confirm-btn-text">${actionText} Account</span>
          <span id="confirm-btn-spinner" class="spinner" style="display: none;" aria-hidden="true"></span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeUserModal();
  });

  document.getElementById('confirm-close-btn')?.addEventListener('click', closeUserModal);
  document.getElementById('confirm-cancel-btn')?.addEventListener('click', closeUserModal);

  _activeUserModalEscHandler = e => { if (e.key === 'Escape') closeUserModal(); };
  document.addEventListener('keydown', _activeUserModalEscHandler);

  document.getElementById('confirm-action-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('confirm-action-btn');
    const text = document.getElementById('confirm-btn-text');
    const spinner = document.getElementById('confirm-btn-spinner');

    if (btn) btn.disabled = true;
    if (text) text.textContent = 'Updating...';
    if (spinner) spinner.style.display = 'inline-block';

    const { error } = await toggleUserStatus(user, profile);
    closeUserModal();

    if (error) {
      SystemDialog.alert(error);
      return;
    }

    if (typeof onSuccess === 'function') onSuccess();
  });
}
