/**
 * User Profile & Avatar Utilities
 *
 * Shared helpers for splitting/formatting first & last names, building
 * top-navbar greetings ("Hi, Adrian!"), rendering circular avatars with
 * initials fallback, client-side square avatar cropping, and local fallback
 * persistence before/after SQL Migration 11 is applied.
 */

const LOCAL_PROFILE_EXT_PREFIX = 'nv_profile_ext_';

export function escapeProfileHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Split a profile object or full_name string into { firstName, lastName, fullName }.
 *
 * @param {Object|string} profileOrName
 * @returns {{ firstName: string, lastName: string, fullName: string }}
 */
export function splitProfileName(profileOrName) {
  if (profileOrName && typeof profileOrName === 'object') {
    const explicitFirst = String(profileOrName.first_name ?? '').trim();
    const explicitLast  = String(profileOrName.last_name ?? '').trim();
    const rawFull       = String(profileOrName.full_name ?? '').trim().replace(/\s+/g, ' ');

    if (explicitFirst) {
      const fullName = [explicitFirst, explicitLast].filter(Boolean).join(' ') || rawFull || explicitFirst;
      return {
        firstName: explicitFirst,
        lastName: explicitLast,
        fullName,
      };
    }

    return splitProfileName(rawFull);
  }

  const cleaned = String(profileOrName ?? '').trim().replace(/\s+/g, ' ');
  if (!cleaned) {
    return { firstName: '', lastName: '', fullName: '' };
  }

  const parts = cleaned.split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '', fullName: parts[0] };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
    fullName: cleaned,
  };
}

/**
 * Return the display first name used in the top navbar greeting ("Hi, Adrian!").
 *
 * @param {Object} profile
 * @returns {string}
 */
export function getFirstNameForGreeting(profile) {
  const { firstName } = splitProfileName(profile);
  return firstName || 'User';
}

/**
 * Return 1-2 uppercase initials for avatar fallback circles.
 *
 * @param {Object|string} profile
 * @returns {string}
 */
export function getProfileInitials(profile) {
  const { firstName, lastName } = splitProfileName(profile);
  const f = firstName ? firstName.charAt(0).toUpperCase() : '';
  const l = lastName ? lastName.charAt(0).toUpperCase() : '';
  return (f + l) || 'U';
}

/**
 * Render inner HTML for a circular avatar element (<img> if avatar_url exists, initials otherwise).
 *
 * @param {Object} profile
 * @returns {string}
 */
export function renderAvatarInnerHTML(profile) {
  const avatarUrl = String(profile?.avatar_url ?? '').trim();
  const initials = escapeProfileHtml(getProfileInitials(profile));
  const altName = escapeProfileHtml(profile?.full_name || getFirstNameForGreeting(profile));

  if (avatarUrl && (avatarUrl.startsWith('data:image/') || avatarUrl.startsWith('https://') || avatarUrl.startsWith('http://'))) {
    return `<img src="${escapeProfileHtml(avatarUrl)}" alt="${altName}" class="avatar-img" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" />`;
  }

  return `<span class="avatar-initials">${initials}</span>`;
}

/**
 * Synchronize the top navbar profile button ("Hi, FirstName!" + avatar photo) in real time.
 *
 * @param {Object} profile
 */
export function syncNavbarProfileUI(profile) {
  if (!profile) return;

  const greetingEl = document.getElementById('header-user-greeting');
  if (greetingEl) {
    greetingEl.textContent = `Hi, ${getFirstNameForGreeting(profile)}!`;
  }

  const avatarEl = document.getElementById('header-user-avatar');
  if (avatarEl) {
    avatarEl.innerHTML = renderAvatarInnerHTML(profile);
  }

  const btnEl = document.getElementById('header-account-btn');
  if (btnEl && profile.full_name) {
    btnEl.setAttribute('aria-label', `Account Settings for ${profile.full_name}`);
  }
}

/**
 * Save local fallback profile fields (used seamlessly if SQL Migration 11 has not yet been run).
 *
 * @param {string} userId
 * @param {{ first_name?: string, last_name?: string, avatar_url?: string|null }} data
 */
export function saveLocalProfileExtras(userId, data) {
  if (!userId) return;
  try {
    localStorage.setItem(`${LOCAL_PROFILE_EXT_PREFIX}${userId}`, JSON.stringify(data || {}));
  } catch {}
}

/**
 * Read local fallback profile fields for a user.
 *
 * @param {string} userId
 * @returns {{ first_name?: string, last_name?: string, avatar_url?: string|null }|null}
 */
export function readLocalProfileExtras(userId) {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`${LOCAL_PROFILE_EXT_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Center-crop and compress an uploaded image File into a crisp 256x256 JPEG Data URL.
 * Keeps payload small (~12-25 KB) for instant navbar rendering and clean DB storage.
 *
 * @param {File} file
 * @param {number} [targetSize=256]
 * @param {number} [quality=0.84]
 * @returns {Promise<string>}
 */
export function cropAndCompressAvatar(file, targetSize = 256, quality = 0.84) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file (JPG, PNG, or WebP).'));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('Image file must be smaller than 8 MB.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Selected image could not be decoded.'));
      img.onload = () => {
        try {
          const side = Math.min(img.width, img.height);
          const sx = Math.floor((img.width - side) / 2);
          const sy = Math.floor((img.height - side) / 2);

          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;

          const ctx = canvas.getContext('2d');
          // White background prevents transparent PNG regions turning black in JPEG
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetSize, targetSize);
          ctx.drawImage(img, sx, sy, side, side, 0, 0, targetSize, targetSize);

          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (err) {
          reject(err);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
