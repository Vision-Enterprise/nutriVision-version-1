/**
 * Calendar - View (Render)
 *
 * Pure HTML rendering functions for:
 *   - Calendar page structure (toolbar, legend chips, mount card)
 *   - Offline warning banner
 *   - Event detail modal template (with Person in Charge & Edit/Delete actions)
 *   - Add / Edit program event modal template (with Person in Charge suggestions)
 */

import { getExpirationStatus, getDaysRemaining } from '../../shared/utils/date.utils.js';
import { resolveShelfLifePolicy } from '../../shared/utils/shelf-life.utils.js';

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const parts = String(timeStr).split(':');
  if (parts.length < 2) return String(timeStr);
  const h = parseInt(parts[0], 10);
  const m = parts[1].slice(0, 2);
  if (Number.isNaN(h)) return String(timeStr);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${suffix}`;
}

export function renderCalendarLayout() {
  return `
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-4);">
      <div>
        <h1 class="page-header__title">Program Calendar</h1>
        <p class="page-header__subtitle">Schedule nutrition program events, assign responsible personnel, and monitor batch expiration timelines.</p>
      </div>
      <button class="btn btn-primary" id="cal-add-btn" type="button">
        + Add Event
      </button>
    </div>

    <div class="cal-page" id="cal-page">
      <!-- Offline Banner -->
      <div class="cal-offline-banner" id="cal-offline-banner" style="display:none;">
        <span class="icon icon--sm" style="font-size:16px;">wifi_off</span>
        You're offline — changes are saved locally and will sync when you're back online.
      </div>

      <!-- Toolbar -->
      <div class="cal-toolbar">
        <div class="cal-legend">
          <span class="cal-chip cal-chip-delivery"><span class="icon icon--sm">local_shipping</span> Delivery</span>
          <span class="cal-chip cal-chip-good"><span class="icon icon--sm">check_circle</span> Good</span>
          <span class="cal-chip cal-chip-moderate"><span class="icon icon--sm">info</span> Moderate</span>
          <span class="cal-chip cal-chip-near"><span class="icon icon--sm">warning</span> Near Expiry</span>
          <span class="cal-chip cal-chip-expired"><span class="icon icon--sm">error</span> Expired</span>
          <span class="cal-chip cal-chip-custom"><span class="icon icon--sm">event</span> Program Event</span>
        </div>
      </div>

      <!-- Calendar Mount -->
      <div class="cal-wrapper card">
        <div id="cal-mount"></div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div class="modal-overlay" id="cal-modal-overlay" style="display: none;">
      <div class="modal" role="dialog" aria-modal="true" style="max-width: 520px; width: 100%;">
        <div class="modal-header">
          <h2 class="modal-title" id="cal-modal-header-title">Event Details</h2>
          <button class="modal-close" id="cal-modal-close" type="button" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body" id="cal-modal-body" style="display: flex; flex-direction: column; gap: var(--space-4);"></div>
      </div>
    </div>

    <!-- Add / Edit Program Event Modal -->
    <div class="modal-overlay" id="cal-add-overlay" style="display: none;">
      <div class="modal" role="dialog" aria-modal="true" style="max-width: 540px; width: 100%;">
        <div class="modal-header">
          <h2 class="modal-title" id="cal-form-modal-title">Add Program Event</h2>
          <button class="modal-close" id="cal-add-modal-close" type="button" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <form id="cal-add-form" novalidate>
          <input type="hidden" id="cal-field-id" value="" />
          <div class="modal-body" style="display: flex; flex-direction: column; gap: var(--space-4);">
            <div class="form-group">
              <label class="form-label form-label--required" for="cal-field-title">Event Title</label>
              <input id="cal-field-title" class="form-input" type="text" required placeholder="e.g. Vitamin Distribution Day" />
              <span class="form-error" id="cal-error-title"></span>
            </div>

            <div class="form-group">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); margin-bottom: 4px;">
                <label class="form-label form-label--required" for="cal-field-pic" style="margin-bottom: 0;">Person in Charge</label>
                <button type="button" class="cal-assign-me-btn" id="cal-assign-me-btn" title="Assign this event to yourself">
                  <span class="icon icon--sm" style="font-size: 14px;">person</span>
                  Assign to me
                </button>
              </div>
              <select id="cal-field-pic" class="form-select" required>
                <option value="">Select Person in Charge...</option>
              </select>
              <div id="cal-field-pic-custom-wrap" style="display: none; margin-top: 8px;">
                <input
                  id="cal-field-pic-custom"
                  class="form-input"
                  type="text"
                  placeholder="Enter external coordinator, BNS, or focal person name..."
                  autocomplete="off"
                />
              </div>
              <span class="form-error" id="cal-error-pic"></span>
            </div>

            <div class="cal-form-row-2col">
              <div class="form-group">
                <label class="form-label form-label--required" for="cal-field-date">Date</label>
                <input id="cal-field-date" class="form-input" type="date" required />
                <span class="form-error" id="cal-error-date"></span>
              </div>

              <div class="form-group">
                <label class="form-label" for="cal-field-time">Time <span style="color: var(--color-text-muted); font-weight: normal;">(optional)</span></label>
                <input id="cal-field-time" class="form-input" type="time" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="cal-field-desc">Description / Notes <span style="color: var(--color-text-muted); font-weight: normal;">(optional)</span></label>
              <textarea id="cal-field-desc" class="form-input" rows="3" placeholder="Meeting agenda, target barangay, venue..." style="resize: vertical;"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-ghost" id="cal-add-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary" id="cal-add-submit">Save Event</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function renderDeliveryDetailBody(batch) {
  return `
    <div class="cal-modal-badge cal-badge-delivery" style="width: max-content;">
      <span class="icon icon--sm">local_shipping</span> Delivery
    </div>
    <div class="cal-modal-grid">
      <span class="cal-modal-label">Batch Code</span><span>${escapeHtml(batch.batch_number || '—')}</span>
      <span class="cal-modal-label">Quantity</span><span>${escapeHtml(batch.quantity)} ${escapeHtml(batch.commodities?.unit || '')}</span>
      <span class="cal-modal-label">Delivery Date</span><span>${escapeHtml(batch.delivery_date)}</span>
      <span class="cal-modal-label">Supplier</span><span>${escapeHtml(batch.supplier || '—')}</span>
    </div>
  `;
}

export function renderExpirationDetailBody(batch) {
  const diff = getDaysRemaining(batch.expiration_date);
  const status = getExpirationStatus(batch.expiration_date, batch);
  const policy = resolveShelfLifePolicy(batch);
  return `
    <div class="cal-modal-badge cal-badge-exp" style="width: max-content;">
      <span class="icon icon--sm">warning</span> Expiration
    </div>
    <div class="cal-modal-grid">
      <span class="cal-modal-label">Batch Code</span><span>${escapeHtml(batch.batch_number || '—')}</span>
      <span class="cal-modal-label">Quantity</span><span>${escapeHtml(batch.quantity)} ${escapeHtml(batch.commodities?.unit || '')}</span>
      <span class="cal-modal-label">Expiration Date</span><span>${escapeHtml(batch.expiration_date)}</span>
      <span class="cal-modal-label">Status</span><span class="cal-exp-status">${escapeHtml(status)} (${diff > 0 ? diff + ' days left' : 'Expired'})</span>
      <span class="cal-modal-label">Policy</span><span>${escapeHtml(policy.shortLabel)}</span>
      <span class="cal-modal-label">Supplier</span><span>${escapeHtml(batch.supplier || '—')}</span>
    </div>
  `;
}

export function renderCustomEventDetailBody(customEv) {
  const pic = String(customEv.person_in_charge ?? '').trim();
  const formattedTime = formatTime12h(customEv.start_time);

  return `
    <div class="cal-modal-badge cal-badge-custom" style="width: max-content;">
      <span class="icon icon--sm">event</span> Program Event
    </div>
    <div class="cal-modal-grid">
      <span class="cal-modal-label">Person in Charge</span>
      <span>
        ${pic
          ? `<span class="cal-pic-badge"><span class="icon icon--sm">person</span>${escapeHtml(pic)}</span>`
          : `<span class="cal-pic-badge cal-pic-badge--unassigned"><span class="icon icon--sm">person_off</span>Unassigned — click Edit Event to set</span>`
        }
      </span>
      <span class="cal-modal-label">Date</span><span>${escapeHtml(customEv.start_date)}</span>
      ${formattedTime ? `<span class="cal-modal-label">Time</span><span>${escapeHtml(formattedTime)}</span>` : ''}
      ${customEv.description ? `<span class="cal-modal-label">Notes</span><span style="white-space: pre-wrap;">${escapeHtml(customEv.description)}</span>` : ''}
    </div>
    <div class="cal-detail-actions">
      <button id="cal-edit-event-btn" class="cal-btn-edit" type="button" data-id="${escapeHtml(customEv.id)}">
        <span class="icon icon--sm">edit</span>
        Edit Event
      </button>
      <button id="cal-delete-event-btn" class="cal-btn-danger" type="button" data-id="${escapeHtml(customEv.id)}">
        <span class="icon icon--sm">delete</span>
        Delete Event
      </button>
    </div>
  `;
}
