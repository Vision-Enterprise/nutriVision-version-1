/**
 * Data Archive & Audit - Modals (Interactions)
 *
 * Dedicated modal handlers for:
 *   - Release Ledger inspection popover for depleted batches
 *   - Restore Batch confirmation flow
 */

import { escapeHtml } from './archive.render.js';
import { formatDate } from '../../shared/utils/date.utils.js';
import { restoreBatch } from './archive.service.js';
import { SystemDialog } from '../../shared/components/dialog.component.js';

let _activeLedgerEscHandler = null;

export function closeLedgerModal() {
  const overlay = document.getElementById('ledger-modal-overlay');
  if (!overlay) return;
  if (_activeLedgerEscHandler) {
    document.removeEventListener('keydown', _activeLedgerEscHandler);
    _activeLedgerEscHandler = null;
  }
  overlay.remove();
}

/**
 * Open Release Ledger & Batch Details Modal for a depleted batch.
 */
export function openLedgerModal(batch) {
  closeLedgerModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'ledger-modal-overlay';
  
  const releasesHTML = (batch.releases && batch.releases.length > 0)
    ? batch.releases.map(r => `
        <div style="background: var(--color-surface); border: 1px solid var(--color-border-subtle); border-radius: 8px; padding: var(--space-3); margin-bottom: var(--space-3);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2);">
            <div style="font-weight: 600; color: var(--color-primary);">${r.quantity} units</div>
            <div style="font-size: var(--font-size-sm); color: var(--color-text-muted);">${formatDate(r.released_at)}</div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-2); font-size: var(--font-size-sm);">
            <div>
              <span style="color: var(--color-text-muted); display: block; font-size: 11px; text-transform: uppercase;">Location / Barangay</span>
              <span style="font-weight: 500;">${escapeHtml(r.barangay) || '-'}</span>
            </div>
            <div>
              <span style="color: var(--color-text-muted); display: block; font-size: 11px; text-transform: uppercase;">Recipient / Receiver</span>
              <span style="font-weight: 500;">${escapeHtml(r.recipient_name) || '-'}</span>
            </div>
            <div>
              <span style="color: var(--color-text-muted); display: block; font-size: 11px; text-transform: uppercase;">Released By (Staff)</span>
              <span style="font-weight: 500;">${escapeHtml(r.released_by_name || 'Unknown Staff')}</span>
            </div>
          </div>
          ${r.notes ? `<div style="margin-top: var(--space-2); font-size: var(--font-size-sm); padding-top: var(--space-2); border-top: 1px dashed var(--color-border-subtle); color: var(--color-text-muted);">
            <strong style="color: var(--color-text);">Notes:</strong> ${escapeHtml(r.notes)}
          </div>` : ''}
        </div>
      `).join('')
    : '<div style="color: var(--color-text-muted); padding: var(--space-4); text-align: center; border: 1px dashed var(--color-border-subtle); border-radius: 8px;">No releases found for this batch.</div>';

  overlay.innerHTML = `
    <div class="modal" style="max-width: 600px; width: 100%;">
      <div class="modal-header">
        <h2 class="modal-title">Release Ledger & Batch Details</h2>
        <button class="modal-close" aria-label="Close modal">&times;</button>
      </div>
      <div class="modal-body">
        
        <!-- Batch Core Details -->
        <div style="background: rgba(var(--color-primary-rgb), 0.05); padding: var(--space-3); border-radius: 8px; margin-bottom: var(--space-4);">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
            <div>
              <div style="font-size: 11px; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: 2px;">Batch Number</div>
              <div style="font-weight: 600; font-size: var(--font-size-lg);">${escapeHtml(batch.batch_number)}</div>
              <div style="color: var(--color-primary); font-size: var(--font-size-sm); margin-top: 2px;">${escapeHtml(batch.commodities?.name)}</div>
            </div>
            <div>
              <div style="font-size: 11px; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: 2px;">Initial Receiving Details</div>
              <div style="font-size: var(--font-size-sm);">
                <span style="color: var(--color-text-muted);">Supplier:</span> <span style="font-weight: 500;">${escapeHtml(batch.supplier) || '-'}</span><br>
                <span style="color: var(--color-text-muted);">Received On:</span> <span style="font-weight: 500;">${formatDate(batch.created_at)}</span><br>
                <span style="color: var(--color-text-muted);">Received By (User ID):</span> <span style="font-weight: 500;">${escapeHtml(batch.created_by) || '-'}</span>
              </div>
            </div>
          </div>
        </div>
        
        <h3 style="font-size: var(--font-size-sm); text-transform: uppercase; color: var(--color-text-muted); margin-bottom: var(--space-3);">Distribution History (${batch.totalDistributed || 0} Total Units)</h3>
        <div style="max-height: 350px; overflow-y: auto; padding-right: var(--space-2);">
          ${releasesHTML}
        </div>
        
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeBtn = overlay.querySelector('.modal-close');
  closeBtn.addEventListener('click', closeLedgerModal);

  _activeLedgerEscHandler = (e) => { if (e.key === 'Escape') closeLedgerModal(); };
  document.addEventListener('keydown', _activeLedgerEscHandler);
}

/**
 * Prompt and execute Restore Batch action.
 */
export async function handleRestoreBatch({ batch, profile, buttonEl, onSuccess }) {
  const confirmed = await SystemDialog.confirm(
    `Are you sure you want to restore batch "${batch.batch_number}"? It will become active again.`,
    'Restore Batch',
    'Restore'
  );

  if (!confirmed) return;

  if (buttonEl) buttonEl.disabled = true;
  const { error } = await restoreBatch(batch.id, profile);
  
  if (error) {
    await SystemDialog.alert(error);
    if (buttonEl) buttonEl.disabled = false;
    return;
  }

  await SystemDialog.alert('Batch successfully restored.');
  if (typeof onSuccess === 'function') onSuccess(batch.id);
}
