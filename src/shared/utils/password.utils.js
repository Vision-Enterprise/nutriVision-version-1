/**
 * Password Policy & Live Strength Meter Utility
 *
 * Enforces strong password formatting across User Provisioning and Account Settings:
 *   - Minimum 8 characters
 *   - At least 1 uppercase letter (A-Z)
 *   - At least 1 lowercase letter (a-z)
 *   - At least 1 numeric digit (0-9)
 *   - At least 1 special character (!@#$%^&* etc.)
 */

export const PASSWORD_RULES = [
  { key: 'minLength',  label: '8+ characters',            test: (pw) => pw.length >= 8 },
  { key: 'hasUpper',   label: 'Uppercase letter (A–Z)',   test: (pw) => /[A-Z]/.test(pw) },
  { key: 'hasLower',   label: 'Lowercase letter (a–z)',   test: (pw) => /[a-z]/.test(pw) },
  { key: 'hasNumber',  label: 'Number (0–9)',             test: (pw) => /[0-9]/.test(pw) },
  { key: 'hasSpecial', label: 'Special char (!@#$...)',   test: (pw) => /[^A-Za-z0-9\s]/.test(pw) },
];

/**
 * Validate password against all strength rules.
 *
 * @param {string} password
 * @returns {{
 *   isValid: boolean,
 *   score: number,
 *   maxScore: number,
 *   label: string,
 *   color: string,
 *   passed: Record<string, boolean>,
 *   error: string|null
 * }}
 */
export function validatePasswordStrength(password) {
  const pw = String(password ?? '');
  const passed = {};
  let score = 0;

  for (const rule of PASSWORD_RULES) {
    const ok = rule.test(pw);
    passed[rule.key] = ok;
    if (ok) score += 1;
  }

  const maxScore = PASSWORD_RULES.length;
  const isValid = score === maxScore;

  let label = 'Enter password';
  let color = '#9ca3af';
  if (pw.length > 0) {
    if (score <= 2)      { label = 'Weak';   color = '#dc2626'; }
    else if (score === 3){ label = 'Fair';   color = '#d97706'; }
    else if (score === 4){ label = 'Good';   color = '#2563eb'; }
    else                 { label = 'Strong'; color = '#16a34a'; }
  }

  let error = null;
  if (!pw) {
    error = 'Password is required.';
  } else if (!isValid) {
    const missing = [];
    if (!passed.minLength)  missing.push('at least 8 characters');
    if (!passed.hasUpper)   missing.push('an uppercase letter');
    if (!passed.hasLower)   missing.push('a lowercase letter');
    if (!passed.hasNumber)  missing.push('a number');
    if (!passed.hasSpecial) missing.push('a special character');
    error = `Password must contain ${missing.join(', ')}.`;
  }

  return { isValid, score, maxScore, label, color, passed, error };
}

/**
 * Render HTML for a live password strength bar and rule checklist.
 *
 * @param {string} prefix - Unique DOM ID prefix (e.g. 'account-pw' or 'create-user-pw')
 * @returns {string}
 */
export function renderPasswordChecklistHTML(prefix) {
  return `
    <div id="${prefix}-meter-wrap" style="margin-top: 8px; padding: 10px 12px; border-radius: var(--radius-md); background: var(--color-surface-alt, #f8faf9); border: 1px solid var(--color-border-subtle, #e5e7eb);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <span style="font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.04em;">Password Strength</span>
        <span id="${prefix}-strength-label" style="font-size: 11px; font-weight: 700; color: #6b7280;">Enter password</span>
      </div>
      <div style="height: 5px; width: 100%; background: #e5e7eb; border-radius: 999px; overflow: hidden; margin-bottom: 8px;">
        <div id="${prefix}-strength-bar" style="height: 100%; width: 0%; background: #9ca3af; border-radius: 999px; transition: width 0.2s ease, background-color 0.2s ease;"></div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); gap: 4px 10px;">
        ${PASSWORD_RULES.map(r => `
          <div id="${prefix}-rule-${r.key}" style="display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--color-text-muted); transition: color 0.15s ease;">
            <span class="icon" data-rule-icon style="font-size: 14px; color: #9ca3af;">radio_button_unchecked</span>
            <span>${r.label}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Update a rendered password checklist UI dynamically as the user types.
 *
 * @param {string} prefix - Same DOM ID prefix passed to renderPasswordChecklistHTML
 * @param {string} password - Current password field value
 */
export function updatePasswordChecklistUI(prefix, password) {
  const res = validatePasswordStrength(password);
  const barEl   = document.getElementById(`${prefix}-strength-bar`);
  const labelEl = document.getElementById(`${prefix}-strength-label`);

  if (barEl) {
    const pct = password ? Math.max(12, Math.round((res.score / res.maxScore) * 100)) : 0;
    barEl.style.width = `${pct}%`;
    barEl.style.backgroundColor = res.color;
  }

  if (labelEl) {
    labelEl.textContent = res.label;
    labelEl.style.color = password ? res.color : '#6b7280';
  }

  for (const rule of PASSWORD_RULES) {
    const itemEl = document.getElementById(`${prefix}-rule-${rule.key}`);
    if (!itemEl) continue;
    const ok = Boolean(res.passed[rule.key]);
    const iconEl = itemEl.querySelector('[data-rule-icon]');
    itemEl.style.color = ok ? '#15803d' : 'var(--color-text-muted)';
    itemEl.style.fontWeight = ok ? '600' : '400';
    if (iconEl) {
      iconEl.textContent = ok ? 'check_circle' : 'radio_button_unchecked';
      iconEl.style.color = ok ? '#16a34a' : '#9ca3af';
    }
  }
}
