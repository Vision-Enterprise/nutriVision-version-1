/**
 * Batch Management - Modals (Interactions)
 *
 * Dedicated modal handlers for:
 *   - Edit Batch
 *   - Void Record (soft-delete with reason & audit)
 *   - Release Batch (stock dispatch to barangay)
 */

import { escapeHtml } from './batches.render.js';
import { updateBatch, voidBatch, releaseBatch } from './batches.service.js';
import { BARANGAYS } from '../../shared/constants/app.constants.js';
import { SystemDialog } from '../../shared/components/dialog.component.js';

let _activeBatchModalEscHandler = null;

export function closeBatchModal() {
  const overlay = document.getElementById('batch-modal-overlay');
  if (!overlay) return;
  if (_activeBatchModalEscHandler) {
    document.removeEventListener('keydown', _activeBatchModalEscHandler);
    _activeBatchModalEscHandler = null;
  }
  overlay.remove();
}

/**
 * Open Edit Modal for a single batch.
 */
export function openEditBatchModal({ batch, commodities, profile, onSuccess }) {
  closeBatchModal();
  const isEdit = true;
  const title = "Edit Batch";

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id        = 'batch-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', title);

  overlay.innerHTML = `
    <div class="modal" style="max-width:560px; width:100%;">
      <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center;">
        <h2 class="modal-title" style="margin: 0;">${title}</h2>
        <div style="display:flex; gap: 8px;">
          <button id="modal-close-btn" class="modal-close" type="button" aria-label="Close" style="position:relative; top:auto; right:auto;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <form id="batch-form" novalidate>
        <div class="modal-body" style="display:flex; flex-direction:column; gap:var(--space-4);">

          <!-- Commodity -->
          <div class="form-group">
            <label for="field-commodity" class="form-label form-label--required">Commodity</label>
            <select id="field-commodity" name="commodity_id" class="form-input" required>
              <option value="">Select commodity</option>
              ${commodities.map(c =>
                `<option value="${c.id}" ${batch?.commodity_id === c.id ? 'selected' : ''}>
                  ${escapeHtml(c.commodity_code)} — ${escapeHtml(c.name)} (${escapeHtml(c.unit)})
                </option>`
              ).join('')}
            </select>
            <span class="form-error" id="error-commodity" role="alert"></span>
          </div>

          <!-- Batch # + Quantity -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-3);">
            <div class="form-group">
              <label for="field-batch-number" class="form-label form-label--required">Batch Number</label>
              <input type="text" id="field-batch-number" name="batch_number"
                class="form-input" placeholder="e.g. DOH-2026-001"
                value="${escapeHtml(batch?.batch_number ?? '')}"
                maxlength="50" required style="text-transform:uppercase;" />
              <span class="form-error" id="error-batch-number" role="alert"></span>
            </div>
            <div class="form-group">
              <label for="field-quantity" class="form-label form-label--required">Quantity</label>
              <input type="number" id="field-quantity" name="quantity"
                class="form-input" placeholder="e.g. 500"
                value="${batch?.quantity ?? ''}"
                min="1" step="1" required />
              <span class="form-error" id="error-quantity" role="alert"></span>
            </div>
          </div>

          <!-- Delivery + Expiry dates -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-3);">
            <div class="form-group">
              <label for="field-delivery-date" class="form-label form-label--required">Delivery Date</label>
              <input type="date" id="field-delivery-date" name="delivery_date"
                class="form-input"
                value="${batch?.delivery_date ?? ''}" required />
              <span class="form-error" id="error-delivery-date" role="alert"></span>
            </div>
            <div class="form-group">
              <label for="field-expiration-date" class="form-label form-label--required">Expiration Date</label>
              <input type="date" id="field-expiration-date" name="expiration_date"
                class="form-input"
                value="${batch?.expiration_date ?? ''}" required />
              <span class="form-error" id="error-expiration-date" role="alert"></span>
            </div>
          </div>

          <!-- Supplier -->
          <div class="form-group">
            <label for="field-supplier" class="form-label">
              Supplier
              <span style="color:var(--color-text-muted); font-weight:normal;">(optional)</span>
            </label>
            <input type="text" id="field-supplier" name="supplier"
              class="form-input" placeholder="e.g. Department of Health"
              value="${escapeHtml(batch?.supplier ?? '')}" maxlength="200" />
          </div>

          <!-- Notes -->
          <div class="form-group">
            <label for="field-notes" class="form-label">
              Notes
              <span style="color:var(--color-text-muted); font-weight:normal;">(optional)</span>
            </label>
            <textarea id="field-notes" name="notes" class="form-input"
              placeholder="Any additional notes about this batch..."
              rows="2" maxlength="500"
              style="resize:vertical;">${escapeHtml(batch?.notes ?? '')}</textarea>
          </div>

          <!-- Form-level error -->
          <div id="form-error-alert" class="alert alert-error" style="display:none;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span id="form-error-msg"></span>
          </div>

        </div>

        <div class="modal-footer">
          <button id="modal-cancel-btn" class="btn btn-ghost" type="button">Cancel</button>
          <button id="modal-submit-btn" class="btn btn-primary" type="submit">
            <span id="modal-submit-text">Save Changes</span>
            <span id="modal-submit-spinner" class="spinner" style="display:none;" aria-hidden="true"></span>
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('field-commodity')?.focus(), 50);

  overlay.addEventListener('click', e => { if (e.target === overlay) closeBatchModal(); });
  document.getElementById('modal-close-btn')?.addEventListener('click', closeBatchModal);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', closeBatchModal);

  document.getElementById('field-batch-number')?.addEventListener('input', e => {
    const pos = e.target.selectionStart;
    e.target.value = e.target.value.toUpperCase();
    e.target.setSelectionRange(pos, pos);
  });

  _activeBatchModalEscHandler = e => { if (e.key === 'Escape') closeBatchModal(); };
  document.addEventListener('keydown', _activeBatchModalEscHandler);

  document.getElementById('batch-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(e.target));
    let valid = true;

    if (!formData.commodity_id) {
      setFieldError('field-commodity', 'error-commodity', 'Commodity is required.');
      valid = false;
    }
    if (!formData.batch_number?.trim()) {
      setFieldError('field-batch-number', 'error-batch-number', 'Batch number is required.');
      valid = false;
    }
    const qty = parseInt(formData.quantity, 10);
    if (!formData.quantity || isNaN(qty) || qty < 1) {
      setFieldError('field-quantity', 'error-quantity', 'Enter a valid quantity (minimum 1).');
      valid = false;
    }
    if (!formData.delivery_date) {
      setFieldError('field-delivery-date', 'error-delivery-date', 'Delivery date is required.');
      valid = false;
    }
    if (!formData.expiration_date) {
      setFieldError('field-expiration-date', 'error-expiration-date', 'Expiration date is required.');
      valid = false;
    }
    if (formData.delivery_date && formData.expiration_date && formData.expiration_date <= formData.delivery_date) {
      setFieldError('field-expiration-date', 'error-expiration-date', 'Expiration date must be after delivery date.');
      valid = false;
    }

    if (!valid) return;
    clearFieldErrors();
    setModalLoading(true);

    const result = await updateBatch(batch.id, formData, profile);
    setModalLoading(false);

    if (result.error) {
      showFormError(result.error);
      return;
    }

    closeBatchModal();
    if (typeof onSuccess === 'function') onSuccess(result.batch);
  });
}

/**
 * Open Void Confirmation Modal
 */
export function openVoidBatchModal({ batch, profile, onSuccess }) {
  closeBatchModal();
  const name = batch.commodities?.name ?? 'unknown commodity';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id        = 'batch-modal-overlay';

  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-header">
        <h2 class="modal-title" id="modal-title">Void This Record</h2>
        <button class="modal-close" aria-label="Close modal">&times;</button>
      </div>
      <form id="void-form">
        <div class="modal-body" style="display:flex; flex-direction:column; gap:var(--space-4);">
          <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid var(--color-danger); padding: var(--space-3); border-radius: 4px; font-size: var(--font-size-sm); color: var(--color-text);">
            <strong>Warning:</strong> This will remove batch "${escapeHtml(batch.batch_number)}" for ${escapeHtml(name)} from active inventory. It will remain visible in the Archive module for audit purposes.
          </div>
          <div style="background: var(--color-surface-alt); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-md); padding: var(--space-2) var(--space-3); display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase; font-weight: 600;">Authorized Staff (You)</span>
            <span style="font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text);">${escapeHtml(profile?.full_name || 'Current User')}</span>
          </div>
          <div class="form-group">
            <label for="field-void-reason" class="form-label form-label--required">Reason for voiding</label>
            <textarea id="field-void-reason" name="void_reason" class="form-input" rows="3" required placeholder="e.g. Typo in batch code, Duplicate entry"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-ghost" id="modal-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary" style="background: var(--color-danger); border-color: var(--color-danger);">Void Record</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const firstInput = document.getElementById('field-void-reason');
  if (firstInput) firstInput.focus();

  const closeBtn  = overlay.querySelector('.modal-close');
  const cancelBtn = document.getElementById('modal-cancel');

  closeBtn.addEventListener('click', closeBatchModal);
  cancelBtn.addEventListener('click', closeBatchModal);

  _activeBatchModalEscHandler = (e) => { if (e.key === 'Escape') closeBatchModal(); };
  document.addEventListener('keydown', _activeBatchModalEscHandler);

  document.getElementById('void-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const reason = document.getElementById('field-void-reason').value.trim();
    if (!reason) { await SystemDialog.alert('Please provide a reason for voiding this record.'); return; }

    const submitBtn = e.target.querySelector('[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Voiding...';

    const { error } = await voidBatch(batch.id, batch.batch_number, name, reason, profile);
    
    if (error) {
      await SystemDialog.alert(error);
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }

    closeBatchModal();
    if (typeof onSuccess === 'function') onSuccess(batch.id);
  });
}

/**
 * Open Release Modal to dispatch commodity units to a barangay.
 */
export function openReleaseBatchModal({ batch, profile, onSuccess }) {
  const modalHtml = `
    <div class="modal-overlay" id="release-modal-overlay">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="release-modal-title">
        <div class="modal-header">
          <h2 class="modal-title" id="release-modal-title">Release Commodity</h2>
          <button class="modal-close" id="release-modal-close-btn" aria-label="Close dialog">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <p style="font-size: var(--font-size-sm); color: var(--color-text-muted); margin-bottom: var(--space-4);">
            Releasing from batch <strong>${escapeHtml(batch.batch_number)}</strong> 
            (${escapeHtml(batch.commodities?.name)}). Available stock: <strong>${batch.quantity}</strong>
          </p>

          <form id="release-form" novalidate>
            <div id="release-error-alert" class="alert alert-error" style="display: none; margin-bottom: var(--space-4);">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span id="release-error-msg"></span>
            </div>

            <div style="background: var(--color-surface-alt); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-md); padding: var(--space-2) var(--space-3); margin-bottom: var(--space-4); display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase; font-weight: 600;">Releasing Staff (You)</span>
              <span style="font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text);">${escapeHtml(profile?.full_name || 'Current User')}</span>
            </div>

            <div class="form-group">
              <label for="release-quantity" class="form-label form-label--required">Quantity to Release</label>
              <input type="number" id="release-quantity" name="quantity" class="form-input" 
                     min="1" max="${batch.quantity}" required />
              <span class="form-error" id="error-release-quantity" role="alert"></span>
            </div>

            <div class="form-group">
              <label for="release-barangay" class="form-label form-label--required">Destination Barangay</label>
              <input list="barangay-options" id="release-barangay" name="barangay" class="form-input" 
                     placeholder="Select barangay" required autocomplete="off" />
              <datalist id="barangay-options">
                ${BARANGAYS ? BARANGAYS.map(b => `<option value="${b}"></option>`).join('') : ''}
              </datalist>
              <span class="form-error" id="error-release-barangay" role="alert"></span>
            </div>

            <div class="form-group">
              <label for="release-recipient" class="form-label form-label--required">Recipient / Receiver Name</label>
              <input type="text" id="release-recipient" name="recipient_name" class="form-input"
                     placeholder="Full name of the person receiving..." required />
              <span class="form-error" id="error-release-recipient" role="alert"></span>
            </div>

            <div class="form-group">
              <label for="release-notes" class="form-label">Notes (optional)</label>
              <textarea id="release-notes" name="notes" class="form-input" rows="2" 
                        placeholder="Purpose of release..."></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="release-cancel-btn" type="button">Cancel</button>
          <button class="btn btn-primary" id="release-submit-btn" type="button" style="background: var(--color-success);">
            <svg id="release-spinner" class="spinner" viewBox="0 0 24 24" style="display: none; margin-right: 8px;">
              <circle class="path" cx="12" cy="12" r="10" fill="none" stroke-width="3"></circle>
            </svg>
            <span id="release-submit-text">Confirm Release</span>
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const overlay = document.getElementById('release-modal-overlay');
  
  const close = () => { overlay.remove(); };
  
  document.getElementById('release-modal-close-btn').addEventListener('click', close);
  document.getElementById('release-cancel-btn').addEventListener('click', close);
  
  document.getElementById('release-submit-btn').addEventListener('click', async () => {
    const qtyInput = document.getElementById('release-quantity');
    const brgyInput = document.getElementById('release-barangay');
    const recipientInput = document.getElementById('release-recipient');
    const notesInput = document.getElementById('release-notes');
    const qty = parseInt(qtyInput.value, 10);
    const brgy = brgyInput.value.trim();
    
    let valid = true;
    document.querySelectorAll('.form-input--error').forEach(el => el.classList.remove('form-input--error'));
    document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
    document.getElementById('release-error-alert').style.display = 'none';

    if (!qty || isNaN(qty) || qty < 1 || qty > batch.quantity) {
      qtyInput.classList.add('form-input--error');
      document.getElementById('error-release-quantity').textContent = 'Enter a valid quantity (1 to ' + batch.quantity + ').';
      valid = false;
    }
    if (!brgy) {
      brgyInput.classList.add('form-input--error');
      document.getElementById('error-release-barangay').textContent = 'Destination barangay is required.';
      valid = false;
    }
    const recipient = recipientInput.value.trim();
    if (!recipient) {
      recipientInput.classList.add('form-input--error');
      document.getElementById('error-release-recipient').textContent = 'Recipient name is required.';
      valid = false;
    }
    
    if (!valid) return;
    
    const btn = document.getElementById('release-submit-btn');
    const spinner = document.getElementById('release-spinner');
    const text = document.getElementById('release-submit-text');
    btn.disabled = true;
    spinner.style.display = 'inline-block';
    text.textContent = 'Releasing...';
    
    const result = await releaseBatch(
      batch.id, 
      batch.batch_number, 
      batch.commodities?.name, 
      qty, 
      batch.quantity, 
      brgy, 
      recipient, 
      notesInput.value, 
      profile
    );
    
    if (result.error) {
      document.getElementById('release-error-alert').style.display = 'flex';
      document.getElementById('release-error-msg').textContent = result.error;
      btn.disabled = false;
      spinner.style.display = 'none';
      text.textContent = 'Confirm Release';
      return;
    }
    
    close();
    if (typeof onSuccess === 'function') onSuccess(result.batch);
  });
}

function setFieldError(inputId, errorId, message) {
  document.getElementById(inputId)?.classList.add('form-input--error');
  const el = document.getElementById(errorId);
  if (el) el.textContent = message;
}

function clearFieldErrors() {
  document.querySelectorAll('.form-input--error').forEach(el =>
    el.classList.remove('form-input--error')
  );
  ['error-commodity','error-batch-number','error-quantity',
   'error-delivery-date','error-expiration-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
  const alert = document.getElementById('form-error-alert');
  if (alert) alert.style.display = 'none';
}

function showFormError(message) {
  const alert = document.getElementById('form-error-alert');
  const msg   = document.getElementById('form-error-msg');
  if (alert && msg) {
    msg.textContent     = message;
    alert.style.display = 'flex';
    alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function setModalLoading(isLoading) {
  const btn     = document.getElementById('modal-submit-btn');
  const text    = document.getElementById('modal-submit-text');
  const spinner = document.getElementById('modal-submit-spinner');
  const cancel  = document.getElementById('modal-cancel-btn');
  const close   = document.getElementById('modal-close-btn');
  if (!btn) return;
  btn.disabled     = isLoading;
  if (cancel) cancel.disabled = isLoading;
  if (close)  close.disabled  = isLoading;
  if (text)    text.textContent      = isLoading ? 'Saving...' : 'Save Changes';
  if (spinner) spinner.style.display = isLoading ? 'inline-block' : 'none';
}
