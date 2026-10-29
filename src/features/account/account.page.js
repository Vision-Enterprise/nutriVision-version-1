/**
 * Account Settings Page
 * Allows the logged-in user to update their display name, Office Email / Account ID, and password.
 * Uses the system design classes: .page-header, .card, .form-group, .form-label,
 * .form-input, .btn, .btn-primary — consistent with all other modules.
 */

import { supabase } from '../../core/supabase.js';
import { normalizeStaffEmail, getRecommendedStaffEmailForUser } from '../users/users.service.js';
import { saveEmailAlias } from '../auth/auth.service.js';
import { AUDIT_ACTIONS } from '../../shared/constants/app.constants.js';

const MODULE = '[Account]';

export async function renderAccountPage(profile) {
  const content = document.getElementById('page-content');
  if (!content) return;

  let authEmail = '';
  let displayEmail = '';
  let recommendedEmail = '20260001@mnao.ph';

  try {
    const [{ data: { user } }, profilesRes] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('profiles').select('id, created_at').order('created_at', { ascending: true })
    ]);
    authEmail = user?.email || '';
    displayEmail = user?.user_metadata?.staff_email || authEmail;
    recommendedEmail = getRecommendedStaffEmailForUser(profile?.id || user?.id, profilesRes.data || []);
  } catch (e) {
    console.warn(`${MODULE} could not fetch email from session`, e);
  }

  const recommendedIdOnly = recommendedEmail.split('@')[0];
  const isAlreadyRecommended = displayEmail.toLowerCase() === recommendedEmail.toLowerCase();

  const roleLabel   = profile?.role === 'administrator' ? 'Administrator' : 'Staff Personnel';
  const roleBadge   = profile?.role === 'administrator' ? 'badge-admin' : 'badge-personnel';
  const statusBadge = profile?.is_active ? 'badge-active' : 'badge-inactive';
  const statusLabel = profile?.is_active ? 'Active' : 'Inactive';

  content.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Account Settings</h1>
      <p class="page-header__subtitle">Manage your profile information, Account ID, and password.</p>
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
              <div class="card-subtitle" style="margin-top: 0;">Update your account details and login ID.</div>
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
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
              <label class="form-label form-label--required" for="account-email">Office Email / Account ID</label>
              ${!isAlreadyRecommended ? `
                <button type="button" id="btn-use-recommended-id" class="btn-table-action" style="padding: 2px 8px; font-size: 11.5px;" data-rec="${recommendedEmail}">
                  ★ Use MNAO ID (${recommendedEmail})
                </button>
              ` : `
                <span style="font-size: 11px; color: var(--color-primary); font-weight: 600;">✓ Standard MNAO ID</span>
              `}
            </div>
            <input
              type="text"
              id="account-email"
              class="form-input"
              value="${displayEmail}"
              data-auth-email="${authEmail}"
              placeholder="e.g. ${recommendedEmail}"
              style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-weight: 600;"
            >
            <span class="form-hint">
              Sign in faster by typing just the ID number (e.g. <strong>${recommendedIdOnly}</strong>) or full <strong>${recommendedEmail}</strong>.
            </span>
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

  const emailInput = document.getElementById('account-email');
  emailInput?.addEventListener('blur', () => {
    if (emailInput.value.trim()) {
      emailInput.value = normalizeStaffEmail(emailInput.value);
    }
  });

  const recBtn = document.getElementById('btn-use-recommended-id');
  recBtn?.addEventListener('click', () => {
    if (emailInput && recBtn.dataset.rec) {
      emailInput.value = recBtn.dataset.rec;
      emailInput.focus();
    }
  });

  // Save profile
  document.getElementById('btn-save-profile')?.addEventListener('click', () => _saveProfile(profile));

  // Update password
  document.getElementById('btn-update-pw')?.addEventListener('click', _updatePassword);
}

// ─── Profile Update ───────────────────────────────────────────────────────────

async function _saveProfile(profile) {
  const fullName   = document.getElementById('account-full-name')?.value.trim();
  const emailInput = document.getElementById('account-email');
  const rawEmail   = emailInput?.value.trim() || '';
  const newEmail   = normalizeStaffEmail(rawEmail);
  const authEmail  = emailInput?.dataset.authEmail || '';
  const msgEl      = document.getElementById('account-profile-msg');
  const btn        = document.getElementById('btn-save-profile');

  if (!fullName) {
    _showMsg(msgEl, 'Full name cannot be empty.', 'error');
    return;
  }

  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    _showMsg(msgEl, 'Please enter a valid Account ID (e.g. 20260001) or email.', 'error');
    return;
  }

  if (emailInput) emailInput.value = newEmail;

  btn.disabled = true;
  btn.innerHTML = '<span class="icon" style="font-size:18px;animation:spin 1s linear infinite;">progress_activity</span> Saving...';

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', profile.id);

    if (error) throw error;

    // If email / Account ID was changed, update auth user & record alias
    if (newEmail.toLowerCase() !== authEmail.toLowerCase()) {
      // 1. Try direct PostgreSQL RPC (instant update in auth.users if 08_account_id_email.sql is installed)
      const { error: rpcErr } = await supabase.rpc('update_own_email', { new_email: newEmail });

      // 2. Always store staff_email in user_metadata + local alias so login works immediately
      await supabase.auth.updateUser({
        data: { full_name: fullName, staff_email: newEmail }
      });

      if (rpcErr) {
        // Also attempt standard Supabase email update and save alias fallback
        await supabase.auth.updateUser({ email: newEmail }).catch(() => {});
        if (authEmail) {
          saveEmailAlias(newEmail, authEmail);
        }
      } else if (emailInput) {
        emailInput.dataset.authEmail = newEmail;
      }

      // 3. Log in audit_logs so User Management table displays the new Account ID
      await supabase.from('audit_logs').insert({
        user_id: profile.id,
        action: AUDIT_ACTIONS.CREATE_USER,
        entity_type: 'profile',
        entity_id: profile.id,
        description: `Updated Account ID / email for ${fullName} to ${newEmail}`,
      });
    }

    const topbarName = document.querySelector('.topbar-user-name');
    if (topbarName) topbarName.textContent = fullName;

    const idOnly = newEmail.split('@')[0];
    _showMsg(msgEl, `Profile saved! You can now sign in with "${idOnly}" or "${newEmail}".`, 'success');
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

  if (!currentPw) { _showMsg(msgEl, 'Current password is required.', 'error'); return; }
  if (!newPw)     { _showMsg(msgEl, 'New password is required.', 'error'); return; }
  if (newPw.length < 6) { _showMsg(msgEl, 'New password must be at least 6 characters.', 'error'); return; }
  if (newPw !== confirmPw) { _showMsg(msgEl, 'New passwords do not match.', 'error'); return; }
  if (newPw === currentPw) { _showMsg(msgEl, 'New password must differ from current password.', 'error'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="icon" style="font-size:18px;animation:spin 1s linear infinite;">progress_activity</span> Updating...';

  try {
    const { error } = await supabase.auth.updateUser({ password: newPw });

    if (error) throw error;

    document.getElementById('account-current-pw').value = '';
    document.getElementById('account-new-pw').value = '';
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

// ─── Inline Message Helper ────────────────────────────────────────────────────

function _showMsg(el, text, type = 'success') {
  if (!el) return;
  const isErr = type === 'error';
  el.style.display      = 'flex';
  el.style.alignItems   = 'center';
  el.style.gap          = '6px';
  el.style.padding      = '8px 12px';
  el.style.borderRadius = 'var(--radius-md)';
  el.style.background   = isErr ? '#fef2f2' : '#f0fdf4';
  el.style.color        = isErr ? 'var(--color-danger)' : 'var(--color-success)';
  el.style.border       = `1px solid ${isErr ? '#fecaca' : '#bbf7d0'}`;
  el.innerHTML = `
    <span class="icon" style="font-size:16px;">${isErr ? 'error' : 'check_circle'}</span>
    <span>${text}</span>
  `;
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}
