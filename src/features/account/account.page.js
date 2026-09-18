/**
 * Account Settings Page
 * Allows the logged-in user to update their display name and password.
 * Uses the system design classes: .page-header, .card, .form-group, .form-label,
 * .form-input, .btn, .btn-primary — consistent with all other modules.
 */

import { supabase } from '../../core/supabase.js';

const MODULE = '[Account]';

export async function renderAccountPage(profile) {
  const content = document.getElementById('page-content');
  if (!content) return;

  // Email lives in auth.users, not profiles — fetch from session
  let email = '';
  try {
    const { data: { user } } = await supabase.auth.getUser();
    email = user?.email || '';
  } catch (e) {
    console.warn(`${MODULE} could not fetch email from session`, e);
  }

  const roleLabel   = profile?.role === 'administrator' ? 'Administrator' : 'Staff Personnel';
  const roleBadge   = profile?.role === 'administrator' ? 'badge-admin' : 'badge-personnel';
  const statusBadge = profile?.is_active ? 'badge-active' : 'badge-inactive';
  const statusLabel = profile?.is_active ? 'Active' : 'Inactive';

  content.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Account Settings</h1>
      <p class="page-header__subtitle">Manage your profile information and password.</p>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); align-items: start;">

      <!-- ── Profile Card ─────────────────────────────────── -->
      <div class="card" style="padding: 0; overflow: hidden;">

        <div class="card-header" style="padding: var(--space-5) var(--space-6); margin-bottom: 0; border-bottom: 1px solid var(--color-border);">
          <div style="display: flex; align-items: center; gap: var(--space-3);">
            <div style="
              width: 36px; height: 36px; border-radius: var(--radius-full);
              background: var(--color-primary-bg, #e8f5e9);
              display: flex; align-items: center; justify-content: center; flex-shrink: 0;
            ">
              <span class="icon" style="color: var(--color-primary); font-size: 20px;">person</span>
            </div>
            <div>
              <div class="card-title">Profile Information</div>
              <div class="card-subtitle" style="margin-top: 0;">Update your account details.</div>
            </div>
          </div>
        </div>

        <div style="padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-5);">

          <div class="form-group">
            <label class="form-label form-label--required" for="account-full-name">Full Name</label>
            <input
              type="text"
              id="account-full-name"
              class="form-input"
              value="${profile?.full_name || ''}"
              placeholder="Your full name"
              maxlength="80"
            >
          </div>

          <div class="form-group">
            <label class="form-label" for="account-email">Office Email / Account ID</label>
            <input
              type="email"
              id="account-email"
              class="form-input"
              value="${email}"
              disabled
              style="opacity: 0.6; cursor: not-allowed;"
            >
            <span class="form-hint">Contact IT support to change your registered office email.</span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">System Role</label>
              <div style="padding-top: var(--space-1);">
                <span class="badge ${roleBadge}">${roleLabel}</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Account Status</label>
              <div style="padding-top: var(--space-1); display: flex; align-items: center; gap: var(--space-1);">
                <span class="icon" style="font-size: 16px; color: var(--color-success);">check_circle</span>
                <span class="badge ${statusBadge}">${statusLabel}</span>
              </div>
            </div>
          </div>

          <div id="account-profile-msg" style="display:none; font-size: var(--font-size-sm);"></div>

        </div>

        <div style="padding: var(--space-4) var(--space-6); border-top: 1px solid var(--color-border); background: var(--color-surface-alt, #f8faf9); display: flex; justify-content: flex-end;">
          <button id="btn-save-profile" class="btn btn-primary" style="display: flex; align-items: center; gap: var(--space-2);">
            <span class="icon" style="font-size: 18px;">save</span>
            Save Changes
          </button>
        </div>

      </div>

      <!-- ── Security Card ────────────────────────────────── -->
      <div class="card" style="padding: 0; overflow: hidden;">

        <div class="card-header" style="padding: var(--space-5) var(--space-6); margin-bottom: 0; border-bottom: 1px solid var(--color-border);">
          <div style="display: flex; align-items: center; gap: var(--space-3);">
            <div style="
              width: 36px; height: 36px; border-radius: var(--radius-full);
              background: var(--color-primary-bg, #e8f5e9);
              display: flex; align-items: center; justify-content: center; flex-shrink: 0;
            ">
              <span class="icon" style="color: var(--color-primary); font-size: 20px;">lock</span>
            </div>
            <div>
              <div class="card-title">Security Settings</div>
              <div class="card-subtitle" style="margin-top: 0;">Ensure your account is using a secure password.</div>
            </div>
          </div>
        </div>

        <div style="padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-5);">

          <div class="form-group">
            <label class="form-label form-label--required" for="account-current-pw">Current Password</label>
            <div style="position: relative;">
              <input
                type="password"
                id="account-current-pw"
                class="form-input"
                placeholder="Enter current password"
                autocomplete="current-password"
                style="padding-right: 44px;"
              >
              <button type="button" class="pw-toggle" data-target="account-current-pw" style="
                position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
                background: none; border: none; cursor: pointer; padding: 0;
                color: var(--color-text-muted); display: flex; align-items: center;
              "><span class="icon" style="font-size: 18px;">visibility</span></button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label form-label--required" for="account-new-pw">New Password</label>
            <div style="position: relative;">
              <input
                type="password"
                id="account-new-pw"
                class="form-input"
                placeholder="At least 6 characters"
                autocomplete="new-password"
                style="padding-right: 44px;"
              >
              <button type="button" class="pw-toggle" data-target="account-new-pw" style="
                position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
                background: none; border: none; cursor: pointer; padding: 0;
                color: var(--color-text-muted); display: flex; align-items: center;
              "><span class="icon" style="font-size: 18px;">visibility</span></button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label form-label--required" for="account-confirm-pw">Confirm New Password</label>
            <div style="position: relative;">
              <input
                type="password"
                id="account-confirm-pw"
                class="form-input"
                placeholder="Re-type new password"
                autocomplete="new-password"
                style="padding-right: 44px;"
              >
              <button type="button" class="pw-toggle" data-target="account-confirm-pw" style="
                position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
                background: none; border: none; cursor: pointer; padding: 0;
                color: var(--color-text-muted); display: flex; align-items: center;
              "><span class="icon" style="font-size: 18px;">visibility</span></button>
            </div>
          </div>

          <div id="account-pw-msg" style="display:none; font-size: var(--font-size-sm);"></div>

        </div>

        <div style="padding: var(--space-4) var(--space-6); border-top: 1px solid var(--color-border); background: var(--color-surface-alt, #f8faf9); display: flex; justify-content: flex-end;">
          <button id="btn-update-pw" class="btn btn-primary" style="display: flex; align-items: center; gap: var(--space-2);">
            <span class="icon" style="font-size: 18px;">key</span>
            Update Password
          </button>
        </div>

      </div>

    </div>
  `;

  _bindEvents(profile);
}

// ─── Event Binding ────────────────────────────────────────────────────────────

function _bindEvents(profile) {
  // Password visibility toggles
  document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      const icon  = btn.querySelector('.icon');
      if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = 'visibility_off';
      } else {
        input.type = 'password';
        icon.textContent = 'visibility';
      }
    });
  });

  // Save profile
  document.getElementById('btn-save-profile')?.addEventListener('click', () => _saveProfile(profile));

  // Update password
  document.getElementById('btn-update-pw')?.addEventListener('click', _updatePassword);
}

// ─── Profile Update ───────────────────────────────────────────────────────────

async function _saveProfile(profile) {
  const fullName = document.getElementById('account-full-name')?.value.trim();
  const msgEl    = document.getElementById('account-profile-msg');
  const btn      = document.getElementById('btn-save-profile');

  if (!fullName) {
    _showMsg(msgEl, 'Full name cannot be empty.', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="icon" style="font-size:18px;animation:spin 1s linear infinite;">progress_activity</span> Saving...';

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', profile.id);

    if (error) throw error;

    // Update the topbar display name if it exists
    const topbarName = document.querySelector('.topbar-user-name');
    if (topbarName) topbarName.textContent = fullName;

    _showMsg(msgEl, 'Profile updated successfully.', 'success');
    console.log(`${MODULE} profile updated for`, profile.id);
  } catch (err) {
    console.error(`${MODULE} _saveProfile error:`, err);
    _showMsg(msgEl, 'Failed to update profile. Try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="icon" style="font-size:18px;">save</span> Save Changes';
  }
}

// ─── Password Update ──────────────────────────────────────────────────────────

async function _updatePassword() {
  const currentPw = document.getElementById('account-current-pw')?.value;
  const newPw     = document.getElementById('account-new-pw')?.value;
  const confirmPw = document.getElementById('account-confirm-pw')?.value;
  const msgEl     = document.getElementById('account-pw-msg');
  const btn       = document.getElementById('btn-update-pw');

  // Validation
  if (!currentPw) { _showMsg(msgEl, 'Current password is required.', 'error'); return; }
  if (!newPw)     { _showMsg(msgEl, 'New password is required.', 'error'); return; }
  if (newPw.length < 6) { _showMsg(msgEl, 'New password must be at least 6 characters.', 'error'); return; }
  if (newPw !== confirmPw) { _showMsg(msgEl, 'New passwords do not match.', 'error'); return; }
  if (newPw === currentPw) { _showMsg(msgEl, 'New password must differ from current password.', 'error'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="icon" style="font-size:18px;animation:spin 1s linear infinite;">progress_activity</span> Updating...';

  try {
    // Supabase requires re-authentication to change password.
    // We use updateUser which works for the currently logged-in session.
    const { error } = await supabase.auth.updateUser({ password: newPw });

    if (error) throw error;

    // Clear fields on success
    document.getElementById('account-current-pw').value = '';
    document.getElementById('account-new-pw').value     = '';
    document.getElementById('account-confirm-pw').value = '';

    _showMsg(msgEl, 'Password updated successfully.', 'success');
    console.log(`${MODULE} password updated`);
  } catch (err) {
    console.error(`${MODULE} _updatePassword error:`, err);
    _showMsg(msgEl, err.message || 'Failed to update password. Try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="icon" style="font-size:18px;">key</span> Update Password';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _showMsg(el, text, type) {
  if (!el) return;
  el.style.display  = 'block';
  el.style.color    = type === 'success' ? 'var(--color-success, #2e7d32)' : 'var(--color-danger, #c62828)';
  el.style.background = type === 'success' ? 'var(--color-success-bg, #f0fdf4)' : 'var(--color-danger-bg, #fff5f5)';
  el.style.border   = `1px solid ${type === 'success' ? 'var(--color-success, #2e7d32)' : 'var(--color-danger, #c62828)'}`;
  el.style.borderRadius = 'var(--radius-md)';
  el.style.padding  = '10px 14px';
  el.textContent    = text;

  // Auto-hide after 4 seconds
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}
