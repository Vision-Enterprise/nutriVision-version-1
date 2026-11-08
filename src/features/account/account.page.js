/**
 * Account Settings Page
 * Allows the logged-in user to update their profile photo, separate first & last names,
 * Office Email / Account ID, and password.
 */

import { supabase, createIsolatedAuthClient } from '../../core/supabase.js';
import { normalizeStaffEmail, getRecommendedStaffEmailForUser } from '../users/users.service.js';
import { saveEmailAlias } from '../auth/auth.service.js';
import { AUDIT_ACTIONS } from '../../shared/constants/app.constants.js';
import {
  validatePasswordStrength,
  renderPasswordChecklistHTML,
  updatePasswordChecklistUI,
} from '../../shared/utils/password.utils.js';
import {
  splitProfileName,
  renderAvatarInnerHTML,
  syncNavbarProfileUI,
  cropAndCompressAvatar,
  saveLocalProfileExtras,
} from '../../shared/utils/profile.utils.js';

const MODULE = '[Account]';

let _draftAvatarUrl = null;

function _escAttr(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function renderAccountPage(profile) {
  const content = document.getElementById('page-content');
  if (!content) return;

  _draftAvatarUrl = profile?.avatar_url || null;

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

  const { firstName, lastName } = splitProfileName(profile);
  const isAdmin = profile?.role === 'administrator';

  const recommendedIdOnly = recommendedEmail.split('@')[0];
  const isAlreadyRecommended = displayEmail.toLowerCase() === recommendedEmail.toLowerCase();

  const roleLabel   = isAdmin ? 'Administrator' : 'Staff Personnel';
  const roleBadge   = isAdmin ? 'badge-admin' : 'badge-personnel';
  const statusBadge = profile?.is_active ? 'badge-active' : 'badge-inactive';
  const statusLabel = profile?.is_active ? 'Active' : 'Inactive';

  content.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Account Settings</h1>
      <p class="page-header__subtitle">Manage your profile photo, personal name, Account ID, and security settings.</p>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: var(--space-6); align-items: start;">

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
              <div class="card-subtitle" style="margin-top: 0;">Update your profile photo, name, and login ID.</div>
            </div>
          </div>
        </div>

        <div style="padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-5);">

          <!-- Profile Photo Uploader -->
          <div style="
            display: flex; align-items: center; gap: var(--space-4); flex-wrap: wrap;
            padding: var(--space-4); border-radius: var(--radius-lg);
            background: var(--color-surface-alt, #f8faf9); border: 1px solid var(--color-border-subtle, #e5e7eb);
          ">
            <div
              id="account-avatar-preview"
              style="
                width: 72px; height: 72px; border-radius: 50%;
                background: ${isAdmin ? 'linear-gradient(135deg, var(--color-primary) 0%, #15803d 100%)' : 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)'};
                color: ${isAdmin ? '#ffffff' : 'var(--color-primary)'};
                border: 2px solid rgba(22, 163, 74, 0.3);
                display: flex; align-items: center; justify-content: center;
                font-size: 1.35rem; font-weight: 700; letter-spacing: 0.03em;
                overflow: hidden; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
              "
            >
              ${renderAvatarInnerHTML(profile)}
            </div>

            <div style="flex: 1; min-width: 180px;">
              <div style="font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); margin-bottom: 2px;">
                Profile Photo
              </div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-bottom: 10px; line-height: 1.35;">
                Displayed in the top navigation bar alongside your first name. Supports JPG, PNG, or WebP.
              </div>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <input
                  type="file"
                  id="account-avatar-input"
                  accept="image/jpeg,image/png,image/webp"
                  style="display: none;"
                />
                <button type="button" id="btn-upload-avatar" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; font-size: 12px;">
                  <span class="icon" style="font-size: 15px;">photo_camera</span>
                  Upload Photo
                </button>
                <button
                  type="button"
                  id="btn-remove-avatar"
                  class="btn btn-ghost btn-sm"
                  style="display: ${_draftAvatarUrl ? 'inline-flex' : 'none'}; align-items: center; gap: 4px; padding: 5px 10px; font-size: 12px; color: var(--color-danger);"
                >
                  <span class="icon" style="font-size: 15px;">delete</span>
                  Remove
                </button>
              </div>
            </div>
          </div>

          <!-- Separate First & Last Name -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label form-label--required" for="account-first-name">First Name</label>
              <input
                type="text"
                id="account-first-name"
                class="form-input"
                value="${_escAttr(firstName)}"
                placeholder="e.g. Adrian"
                autocomplete="given-name"
                maxlength="50"
              >
            </div>
            <div class="form-group">
              <label class="form-label ${lastName || firstName.toLowerCase() !== 'admin' ? 'form-label--required' : ''}" for="account-last-name">Last Name</label>
              <input
                type="text"
                id="account-last-name"
                class="form-input"
                value="${_escAttr(lastName)}"
                placeholder="e.g. Santos"
                autocomplete="family-name"
                maxlength="50"
              >
            </div>
          </div>

          <!-- Office Email / Account ID -->
          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
              <label class="form-label form-label--required" for="account-email">Office Email / Account ID</label>
              ${!isAlreadyRecommended ? `
                <button type="button" id="btn-use-recommended-id" class="btn-table-action" style="padding: 2px 8px; font-size: 11.5px;" data-rec="${_escAttr(recommendedEmail)}">
                  ★ Use MNAO ID (${_escAttr(recommendedEmail)})
                </button>
              ` : `
                <span style="font-size: 11px; color: var(--color-primary); font-weight: 600;">✓ Standard MNAO ID</span>
              `}
            </div>
            <input
              type="text"
              id="account-email"
              class="form-input"
              value="${_escAttr(displayEmail)}"
              data-auth-email="${_escAttr(authEmail)}"
              placeholder="e.g. ${_escAttr(recommendedEmail)}"
              style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-weight: 600;"
            >
            <span class="form-hint">
              Sign in faster by typing just the ID number (e.g. <strong>${_escAttr(recommendedIdOnly)}</strong>) or full <strong>${_escAttr(recommendedEmail)}</strong>.
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
              <div class="card-subtitle" style="margin-top: 0;">Verify your current password to set a strong new password.</div>
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
                placeholder="Min. 8 chars (Aa1! required)"
                autocomplete="new-password"
                style="padding-right: 44px;"
              >
              <button type="button" class="pw-toggle" data-target="account-new-pw" style="
                position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
                background: none; border: none; cursor: pointer; padding: 0;
                color: var(--color-text-muted); display: flex; align-items: center;
              "><span class="icon" style="font-size: 18px;">visibility</span></button>
            </div>
            ${renderPasswordChecklistHTML('account-pw')}
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

  const newPwInput = document.getElementById('account-new-pw');
  newPwInput?.addEventListener('input', () => {
    updatePasswordChecklistUI('account-pw', newPwInput.value);
  });

  // Avatar upload / remove handlers
  const avatarInput   = document.getElementById('account-avatar-input');
  const uploadBtn     = document.getElementById('btn-upload-avatar');
  const removeBtn     = document.getElementById('btn-remove-avatar');
  const avatarPreview = document.getElementById('account-avatar-preview');
  const firstInput    = document.getElementById('account-first-name');
  const lastInput     = document.getElementById('account-last-name');
  const msgEl         = document.getElementById('account-profile-msg');

  const refreshDraftAvatarPreview = () => {
    if (!avatarPreview) return;
    const f = firstInput?.value.trim() || '';
    const l = lastInput?.value.trim() || '';
    avatarPreview.innerHTML = renderAvatarInnerHTML({
      first_name: f,
      last_name: l,
      full_name: [f, l].filter(Boolean).join(' ') || profile?.full_name || 'U',
      avatar_url: _draftAvatarUrl,
    });
    if (removeBtn) {
      removeBtn.style.display = _draftAvatarUrl ? 'inline-flex' : 'none';
    }
  };

  uploadBtn?.addEventListener('click', () => avatarInput?.click());

  avatarInput?.addEventListener('change', async () => {
    const file = avatarInput.files?.[0];
    if (!file) return;
    try {
      _draftAvatarUrl = await cropAndCompressAvatar(file, 256, 0.84);
      refreshDraftAvatarPreview();
    } catch (err) {
      _showMsg(msgEl, err.message || 'Could not process selected photo.', 'error');
    } finally {
      avatarInput.value = '';
    }
  });

  removeBtn?.addEventListener('click', () => {
    _draftAvatarUrl = null;
    refreshDraftAvatarPreview();
  });

  firstInput?.addEventListener('input', () => {
    if (!_draftAvatarUrl) refreshDraftAvatarPreview();
  });
  lastInput?.addEventListener('input', () => {
    if (!_draftAvatarUrl) refreshDraftAvatarPreview();
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
  document.getElementById('btn-update-pw')?.addEventListener('click', () => _updatePassword(profile));
}

// ─── Profile Update ───────────────────────────────────────────────────────────

async function _saveProfile(profile) {
  const firstName  = document.getElementById('account-first-name')?.value.trim() || '';
  const lastName   = document.getElementById('account-last-name')?.value.trim() || '';
  const emailInput = document.getElementById('account-email');
  const rawEmail   = emailInput?.value.trim() || '';
  const newEmail   = normalizeStaffEmail(rawEmail);
  const authEmail  = emailInput?.dataset.authEmail || '';
  const msgEl      = document.getElementById('account-profile-msg');
  const btn        = document.getElementById('btn-save-profile');

  if (!firstName) {
    _showMsg(msgEl, 'First name is required.', 'error');
    return;
  }

  const origSplit = splitProfileName(profile);
  const allowEmptyLast = !origSplit.lastName && firstName.toLowerCase() === 'admin';
  if (!lastName && !allowEmptyLast) {
    _showMsg(msgEl, 'Last name is required.', 'error');
    return;
  }

  const fullName = [firstName, lastName].filter(Boolean).join(' ');

  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    _showMsg(msgEl, 'Please enter a valid Account ID (e.g. 20260001) or email.', 'error');
    return;
  }

  if (emailInput) emailInput.value = newEmail;

  btn.disabled = true;
  btn.innerHTML = '<span class="icon" style="font-size:18px;animation:spin 1s linear infinite;">progress_activity</span> Saving...';

  try {
    // 1. Update profiles table (with graceful fallback if SQL Migration 11 has not been executed yet)
    const { error: extErr } = await supabase
      .from('profiles')
      .update({
        full_name:  fullName,
        first_name: firstName,
        last_name:  lastName || null,
        avatar_url: _draftAvatarUrl || null,
      })
      .eq('id', profile.id);

    if (extErr) {
      const errText = `${extErr.code || ''} ${extErr.message || ''}`.toLowerCase();
      const isMissingColumn =
        extErr.code === 'PGRST204' ||
        errText.includes('first_name') ||
        errText.includes('last_name') ||
        errText.includes('avatar_url');

      if (!isMissingColumn) throw extErr;

      // Fallback when DB columns haven't been created yet: update full_name in DB + cache extras locally
      const { error: baseErr } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', profile.id);

      if (baseErr) throw baseErr;

      saveLocalProfileExtras(profile.id, {
        first_name: firstName,
        last_name:  lastName,
        avatar_url: _draftAvatarUrl || null,
      });
    } else {
      // Clear any outdated local fallback once DB stores all columns natively
      saveLocalProfileExtras(profile.id, {});
    }

    // Keep lightweight name metadata in sync (never put base64 avatar inside JWT metadata!)
    await supabase.auth.updateUser({
      data: {
        first_name:  firstName,
        last_name:   lastName,
        full_name:   fullName,
        staff_email: newEmail,
      }
    }).catch(() => {});

    // 2. If email / Account ID was changed, update auth user & record alias
    if (newEmail.toLowerCase() !== authEmail.toLowerCase()) {
      const { error: rpcErr } = await supabase.rpc('update_own_email', { new_email: newEmail });

      if (rpcErr) {
        await supabase.auth.updateUser({ email: newEmail }).catch(() => {});
        if (authEmail) {
          saveEmailAlias(newEmail, authEmail);
        }
      } else if (emailInput) {
        emailInput.dataset.authEmail = newEmail;
      }

      await supabase.from('audit_logs').insert({
        user_id: profile.id,
        action: AUDIT_ACTIONS.UPDATE_PROFILE,
        entity_type: 'profile',
        entity_id: profile.id,
        description: `Updated profile & Account ID for ${fullName} to ${newEmail}`,
      });
    } else {
      await supabase.from('audit_logs').insert({
        user_id: profile.id,
        action: AUDIT_ACTIONS.UPDATE_PROFILE,
        entity_type: 'profile',
        entity_id: profile.id,
        description: `Updated profile details for ${fullName}`,
      });
    }

    // 3. Mutate live profile object & sync top navbar ("Hi, FirstName!" + circular photo) immediately
    profile.first_name = firstName;
    profile.last_name  = lastName;
    profile.full_name  = fullName;
    profile.avatar_url = _draftAvatarUrl || null;
    syncNavbarProfileUI(profile);

    const idOnly = newEmail.split('@')[0];
    _showMsg(msgEl, `Profile saved! Top navbar updated to "Hi, ${firstName}!" (Login ID: ${idOnly}).`, 'success');
    console.log(`${MODULE} profile updated for`, profile.id);
  } catch (err) {
    console.error(`${MODULE} _saveProfile error:`, err);
    _showMsg(msgEl, err.message || 'Failed to update profile. Try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="icon" style="font-size:18px;">save</span> Save Changes';
  }
}

// ─── Password Update (#89 Strong Rules + #90 Current Password Re-Auth) ────────

async function _updatePassword(profile) {
  const currentPw = document.getElementById('account-current-pw')?.value || '';
  const newPw     = document.getElementById('account-new-pw')?.value || '';
  const confirmPw = document.getElementById('account-confirm-pw')?.value || '';
  const msgEl     = document.getElementById('account-pw-msg');
  const btn       = document.getElementById('btn-update-pw');

  if (!currentPw) {
    _showMsg(msgEl, 'Current password is required.', 'error');
    return;
  }
  if (!newPw) {
    _showMsg(msgEl, 'New password is required.', 'error');
    return;
  }

  const strength = validatePasswordStrength(newPw);
  if (!strength.isValid) {
    _showMsg(msgEl, strength.error, 'error');
    return;
  }

  if (newPw !== confirmPw) {
    _showMsg(msgEl, 'New passwords do not match.', 'error');
    return;
  }
  if (newPw === currentPw) {
    _showMsg(msgEl, 'New password must differ from current password.', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="icon" style="font-size:18px;animation:spin 1s linear infinite;">progress_activity</span> Verifying & Updating...';

  try {
    // 1. Re-authenticate current password via isolated client so active session listeners aren't disrupted
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const verifyEmail = authUser?.email || document.getElementById('account-email')?.dataset.authEmail || '';

    if (!verifyEmail) {
      throw new Error('Could not verify active account email. Please sign in again.');
    }

    const isolatedClient = createIsolatedAuthClient();
    const { error: verifyErr } = await isolatedClient.auth.signInWithPassword({
      email: verifyEmail,
      password: currentPw,
    });

    if (verifyErr) {
      _showMsg(msgEl, 'Current password is incorrect.', 'error');
      return;
    }

    // 2. Update password on active authenticated session
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) throw error;

    // 3. Record audit log entry
    if (profile?.id) {
      await supabase.from('audit_logs').insert({
        user_id: profile.id,
        action: AUDIT_ACTIONS.UPDATE_PASSWORD,
        entity_type: 'profile',
        entity_id: profile.id,
        description: `${profile.full_name || 'User'} updated their account password.`,
      });
    }

    document.getElementById('account-current-pw').value = '';
    document.getElementById('account-new-pw').value = '';
    document.getElementById('account-confirm-pw').value = '';
    updatePasswordChecklistUI('account-pw', '');

    _showMsg(msgEl, 'Password verified and updated successfully.', 'success');
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
    <span></span>
  `;
  const textSpan = el.querySelector('span:last-child');
  if (textSpan) textSpan.textContent = text;
  setTimeout(() => { el.style.display = 'none'; }, 5500);
}
