/**
 * Calendar - View (Render)
 *
 * Pure HTML rendering functions for:
 *   - Calendar page structure (toolbar, legend chips, mount card)
 *   - Offline warning banner
 *   - Event detail modal template
 *   - Add program event modal template
 */

export function renderCalendarLayout() {
  return `
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
          <span class="cal-chip cal-chip-good"><span class="icon icon--sm">check_circle</span> Good (&gt;180d)</span>
          <span class="cal-chip cal-chip-moderate"><span class="icon icon--sm">info</span> Moderate (&gt;90d)</span>
          <span class="cal-chip cal-chip-near"><span class="icon icon--sm">warning</span> Near Expiry</span>
          <span class="cal-chip cal-chip-expired"><span class="icon icon--sm">error</span> Expired</span>
          <span class="cal-chip cal-chip-custom"><span class="icon icon--sm">event</span> Program Event</span>
        </div>
        <button class="btn btn-primary" id="cal-add-btn" type="button">
          + Add Event
        </button>
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

    <!-- Add Event Modal -->
    <div class="modal-overlay" id="cal-add-overlay" style="display: none;">
      <div class="modal" role="dialog" aria-modal="true" style="max-width: 520px; width: 100%;">
        <div class="modal-header">
          <h2 class="modal-title">Add Program Event</h2>
          <button class="modal-close" id="cal-add-modal-close" type="button" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <form id="cal-add-form" novalidate>
          <div class="modal-body" style="display: flex; flex-direction: column; gap: var(--space-4);">
            <div class="form-group">
              <label class="form-label form-label--required" for="cal-field-title">Event Title</label>
              <input id="cal-field-title" class="form-input" type="text" required placeholder="e.g. Vitamin Distribution Day" />
            </div>

            <div class="form-group">
              <label class="form-label form-label--required" for="cal-field-date">Date</label>
              <input id="cal-field-date" class="form-input" type="date" required />
            </div>

            <div class="form-group">
              <label class="form-label" for="cal-field-time">Time <span style="color: var(--color-text-muted); font-weight: normal;">(optional)</span></label>
              <input id="cal-field-time" class="form-input" type="time" />
            </div>

            <div class="form-group">
              <label class="form-label" for="cal-field-desc">Description / Notes <span style="color: var(--color-text-muted); font-weight: normal;">(optional)</span></label>
              <textarea id="cal-field-desc" class="form-input" rows="3" placeholder="Meeting agenda, location..." style="resize: vertical;"></textarea>
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
      <span class="cal-modal-label">Batch Code</span><span>${batch.batch_number || '—'}</span>
      <span class="cal-modal-label">Quantity</span><span>${batch.quantity} ${batch.commodities?.unit || ''}</span>
      <span class="cal-modal-label">Delivery Date</span><span>${batch.delivery_date}</span>
      <span class="cal-modal-label">Supplier</span><span>${batch.supplier || '—'}</span>
    </div>
  `;
}

export function renderExpirationDetailBody(batch) {
  const diff = Math.ceil((new Date(batch.expiration_date) - new Date()) / 86400000);
  const status = diff <= 0 ? 'Expired' : diff <= 90 ? 'Near Expiry' : diff <= 180 ? 'Moderate' : 'Good';
  return `
    <div class="cal-modal-badge cal-badge-exp" style="width: max-content;">
      <span class="icon icon--sm">warning</span> Expiration
    </div>
    <div class="cal-modal-grid">
      <span class="cal-modal-label">Batch Code</span><span>${batch.batch_number || '—'}</span>
      <span class="cal-modal-label">Quantity</span><span>${batch.quantity} ${batch.commodities?.unit || ''}</span>
      <span class="cal-modal-label">Expiration Date</span><span>${batch.expiration_date}</span>
      <span class="cal-modal-label">Status</span><span class="cal-exp-status">${status} (${diff > 0 ? diff + ' days left' : 'Expired'})</span>
      <span class="cal-modal-label">Supplier</span><span>${batch.supplier || '—'}</span>
    </div>
  `;
}

export function renderCustomEventDetailBody(customEv) {
  return `
    <div class="cal-modal-badge cal-badge-custom" style="width: max-content;">
      <span class="icon icon--sm">event</span> Program Event
    </div>
    <div class="cal-modal-grid">
      <span class="cal-modal-label">Date</span><span>${customEv.start_date}</span>
      ${customEv.start_time ? `<span class="cal-modal-label">Time</span><span>${customEv.start_time}</span>` : ''}
      ${customEv.description ? `<span class="cal-modal-label">Notes</span><span>${customEv.description}</span>` : ''}
    </div>
    <button id="cal-delete-event-btn" class="cal-btn-danger" data-id="${customEv.id}">Delete Event</button>
  `;
}
