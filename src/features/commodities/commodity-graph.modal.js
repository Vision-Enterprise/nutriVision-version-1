/**
 * Commodity Lineage & Batch Traceability Graph Modal
 *
 * User-Experience-Centered interactive node graph visualizing:
 *   - Root: Master Commodity (Code, Category, Stock Overview)
 *   - Level 2: Batches (Delivery, Expiration status with traffic-light colors, Supplier)
 *   - Level 3: Outcomes (In-Stock, Barangay Distributions, Quarantined/Defective Units)
 *
 * Built with native SVG Bezier curves and responsive HTML card nodes.
 */

import './commodity-graph.css';
import { fetchCommodityLineage } from './commodities.service.js';
import { formatDate, getDaysRemaining, getExpirationStatus } from '../../shared/utils/date.utils.js';
import { EXPIRATION_STATUS } from '../../shared/constants/app.constants.js';

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getStatusBadge(status) {
  const classMap = {
    [EXPIRATION_STATUS.GOOD]:        'badge-good',
    [EXPIRATION_STATUS.MODERATE]:    'badge-moderate',
    [EXPIRATION_STATUS.NEAR_EXPIRY]: 'badge-near-expiry',
    [EXPIRATION_STATUS.EXPIRED]:     'badge-expired',
  };
  const cls = classMap[status] || 'badge-good';
  return `<span class="badge ${cls}" style="font-size:10px; padding:2px 7px;">${status}</span>`;
}

/**
 * Open the interactive Commodity Traceability Graph Modal.
 * @param {string} commodityId
 */
export async function openCommodityGraphModal(commodityId) {
  // Remove any existing graph modal
  document.getElementById('cgraph-modal-overlay')?.remove();

  // 1. Initial Loading Modal Shell
  const overlay = document.createElement('div');
  overlay.id = 'cgraph-modal-overlay';
  overlay.className = 'cgraph-modal-overlay';
  overlay.innerHTML = `
    <div class="cgraph-modal-dialog" role="dialog" aria-modal="true">
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:var(--space-4); color:var(--color-text-muted);">
        <div class="loading-spinner" style="width:40px; height:40px; border-width:3px;"></div>
        <p style="font-size:var(--font-size-sm); font-weight:var(--font-weight-medium);">Building traceability node graph...</p>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Close on backdrop click or escape
  const handleKeydown = (e) => {
    if (e.key === 'Escape') closeModal();
  };
  window.addEventListener('keydown', handleKeydown);

  function closeModal() {
    window.removeEventListener('keydown', handleKeydown);
    overlay.remove();
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // 2. Fetch lineage data
  const { commodity, batches, error } = await fetchCommodityLineage(commodityId);

  if (error || !commodity) {
    const dialog = overlay.querySelector('.cgraph-modal-dialog');
    if (dialog) {
      dialog.innerHTML = `
        <div class="cgraph-header">
          <h2 class="cgraph-header__title">Traceability Graph</h2>
          <button class="cgraph-close-btn" type="button" aria-label="Close modal">✕</button>
        </div>
        <div style="padding:var(--space-8); text-align:center; color:var(--color-danger);">
          <p>Failed to load lineage data. Please try again.</p>
          <button class="btn btn-secondary btn-sm" id="cgraph-retry-btn" style="margin-top:var(--space-4);">Retry</button>
        </div>
      `;
      dialog.querySelector('.cgraph-close-btn')?.addEventListener('click', closeModal);
      dialog.querySelector('#cgraph-retry-btn')?.addEventListener('click', () => openCommodityGraphModal(commodityId));
    }
    return;
  }

  // 3. Calculate Totals
  const totalInStock = batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
  const totalDistributed = batches.reduce((sum, b) => {
    const batchDist = (b.releases || []).reduce((rSum, r) => rSum + (Number(r.quantity) || 0), 0);
    return sum + batchDist;
  }, 0);
  const totalQuarantined = batches.reduce((sum, b) => {
    const batchDef = (b.defects || []).reduce((dSum, d) => dSum + (Number(d.quantity_affected) || 0), 0);
    return sum + batchDef;
  }, 0);

  // 4. Render Graph Shell
  const dialog = overlay.querySelector('.cgraph-modal-dialog');
  dialog.innerHTML = `
    <!-- Modal Header -->
    <header class="cgraph-header">
      <div class="cgraph-header__info">
        <div class="cgraph-header__icon-box">
          <span class="icon" style="font-size:24px;">account_tree</span>
        </div>
        <div>
          <h2 class="cgraph-header__title">
            ${escapeHtml(commodity.name)}
            <span class="cgraph-root-code">${escapeHtml(commodity.commodity_code)}</span>
          </h2>
          <p class="cgraph-header__subtitle">Batch Lineage & Distribution Traceability Graph</p>
        </div>
      </div>

      <!-- KPI Summary Strip -->
      <div class="cgraph-kpi-strip">
        <span class="cgraph-kpi-pill">
          <span class="icon icon--sm" style="font-size:14px;">inventory_2</span>
          <strong>${batches.length}</strong> Batch${batches.length !== 1 ? 'es' : ''}
        </span>
        <span class="cgraph-kpi-pill cgraph-kpi-pill--stock">
          <span class="icon icon--sm" style="font-size:14px;">warehouse</span>
          <strong>${totalInStock.toLocaleString()}</strong> ${escapeHtml(commodity.unit)} In Stock
        </span>
        <span class="cgraph-kpi-pill cgraph-kpi-pill--dist">
          <span class="icon icon--sm" style="font-size:14px;">local_shipping</span>
          <strong>${totalDistributed.toLocaleString()}</strong> ${escapeHtml(commodity.unit)} Distributed
        </span>
        ${totalQuarantined > 0 ? `
          <span class="cgraph-kpi-pill cgraph-kpi-pill--defect">
            <span class="icon icon--sm" style="font-size:14px;">warning</span>
            <strong>${totalQuarantined.toLocaleString()}</strong> Quarantined/Disposed
          </span>
        ` : ''}
      </div>

      <!-- Controls -->
      <div class="cgraph-controls">
        <div class="cgraph-btn-group">
          <button class="cgraph-ctrl-btn" id="cgraph-zoom-out" title="Zoom Out" type="button">
            <span class="icon icon--sm">remove</span>
          </button>
          <span class="cgraph-zoom-label" id="cgraph-zoom-val">100%</span>
          <button class="cgraph-ctrl-btn" id="cgraph-zoom-in" title="Zoom In" type="button">
            <span class="icon icon--sm">add</span>
          </button>
          <button class="cgraph-ctrl-btn" id="cgraph-zoom-fit" title="Reset View" type="button">
            <span class="icon icon--sm" style="font-size:14px;">fit_screen</span>
          </button>
        </div>
        <button class="cgraph-close-btn" id="cgraph-close-btn" type="button" aria-label="Close modal">
          <span class="icon icon--sm">close</span>
        </button>
      </div>
    </header>

    <!-- Graph Viewport & Canvas -->
    <div class="cgraph-viewport" id="cgraph-viewport">
      <div class="cgraph-canvas" id="cgraph-canvas">
        <svg class="cgraph-svg-layer" id="cgraph-svg"></svg>
        <div class="cgraph-nodes-layer" id="cgraph-nodes">
          
          <!-- Column 1: Root Node -->
          <div class="cgraph-node-root" id="cgraph-node-root">
            <div class="cgraph-root-tag">
              <span class="icon icon--sm" style="font-size:12px;">category</span> Master Commodity
            </div>
            <h3 class="cgraph-root-title">${escapeHtml(commodity.name)}</h3>
            <span class="cgraph-root-code">${escapeHtml(commodity.commodity_code)}</span>
            
            <div class="cgraph-root-meta">
              <div class="cgraph-root-meta-item">
                <label>Category</label>
                <span>${escapeHtml(commodity.category)}</span>
              </div>
              <div class="cgraph-root-meta-item">
                <label>Measurement Unit</label>
                <span>${escapeHtml(commodity.unit)}</span>
              </div>
              <div class="cgraph-root-meta-item">
                <label>Active Batches</label>
                <span>${batches.length}</span>
              </div>
              <div class="cgraph-root-meta-item">
                <label>Total Available</label>
                <span style="color:var(--color-primary);">${totalInStock.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <!-- Column 2 & 3: Batches and Leaves -->
          <div class="cgraph-branches-column" id="cgraph-branches">
            ${batches.length === 0 ? `
              <div class="cgraph-batch-cluster">
                <div class="cgraph-node-batch" style="border-style:dashed; border-color:var(--color-border); text-align:center; padding:var(--space-6);">
                  <span class="icon" style="color:var(--color-text-muted); font-size:32px; display:block; margin:0 auto var(--space-2);">inventory_2</span>
                  <div style="font-weight:600; color:var(--color-text-dark); margin-bottom:var(--space-1);">No Batches Registered</div>
                  <div style="font-size:11px; color:var(--color-text-muted); margin-bottom:var(--space-3);">No deliveries on record for this commodity.</div>
                  <a href="#/batches?action=add" class="cgraph-jump-btn" style="text-decoration:none; display:inline-flex;">
                    <span class="icon icon--sm">add</span> Record First Batch
                  </a>
                </div>
              </div>
            ` : batches.map(b => {
              const status = getExpirationStatus(b.expiration_date);
              const days = getDaysRemaining(b.expiration_date);
              const daysStr = days <= 0
                ? `<span style="color:var(--color-exp-expired); font-weight:700;">Expired ${Math.abs(days)}d ago</span>`
                : days <= 90
                ? `<span style="color:var(--color-exp-near); font-weight:700;">Expires in ${days}d</span>`
                : days <= 180
                ? `<span style="color:var(--color-exp-moderate); font-weight:600;">Expires in ${days}d</span>`
                : `<span style="color:var(--color-exp-good); font-weight:600;">Expires in ${days}d</span>`;

              const hasReleases = b.releases && b.releases.length > 0;
              const hasDefects  = b.defects && b.defects.length > 0;

              return `
                <div class="cgraph-batch-cluster" id="cgraph-cluster-${b.id}">
                  
                  <!-- Batch Node -->
                  <div class="cgraph-node-batch" id="cgraph-node-batch-${b.id}" data-batch-id="${b.id}">
                    <div class="cgraph-batch-header">
                      <span class="cgraph-batch-number">${escapeHtml(b.batch_number)}</span>
                      ${getStatusBadge(status)}
                    </div>

                    <div class="cgraph-batch-body">
                      <div class="cgraph-batch-body-row">
                        <span>Countdown:</span>
                        ${daysStr}
                      </div>
                      <div class="cgraph-batch-body-row">
                        <span>Expiration:</span>
                        <strong>${formatDate(b.expiration_date)}</strong>
                      </div>
                      ${b.delivery_date ? `
                        <div class="cgraph-batch-body-row">
                          <span>Delivered:</span>
                          <span>${formatDate(b.delivery_date)}</span>
                        </div>
                      ` : ''}
                      ${b.supplier ? `
                        <div class="cgraph-batch-body-row">
                          <span>Supplier:</span>
                          <span style="max-width:130px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${escapeHtml(b.supplier)}">
                            ${escapeHtml(b.supplier)}
                          </span>
                        </div>
                      ` : ''}
                    </div>

                    <div class="cgraph-batch-actions">
                      <button class="cgraph-jump-btn cgraph-batch-jump" data-batch-number="${escapeHtml(b.batch_number)}" type="button" title="Open this batch in the Batches table">
                        <span class="icon icon--sm" style="font-size:13px;">open_in_new</span>
                        View in Table
                      </button>
                    </div>
                  </div>

                  <!-- Leaves Stack (In-Stock, Releases, Defects) -->
                  <div class="cgraph-leaves-stack" id="cgraph-leaves-${b.id}">
                    
                    <!-- 1. Current In-Stock Card -->
                    <div class="cgraph-node-leaf cgraph-node-leaf--stock" id="cgraph-leaf-stock-${b.id}">
                      <div class="cgraph-leaf-title">
                        <span>Warehouse Stock</span>
                        <strong style="color:var(--color-primary);">${b.quantity.toLocaleString()} ${escapeHtml(commodity.unit)}</strong>
                      </div>
                      <div class="cgraph-leaf-desc">Current available balance on hand</div>
                    </div>

                    <!-- 2. Releases / Distributions -->
                    ${hasReleases ? b.releases.slice(0, 4).map((rel, rIdx) => `
                      <div class="cgraph-node-leaf cgraph-node-leaf--release" id="cgraph-leaf-rel-${b.id}-${rIdx}">
                        <div class="cgraph-leaf-title">
                          <span style="color:#1565C0; display:flex; align-items:center; gap:3px;">
                            <span class="icon icon--sm" style="font-size:12px;">local_shipping</span>
                            ${escapeHtml(rel.barangay)}
                          </span>
                          <strong>${rel.quantity.toLocaleString()} ${escapeHtml(commodity.unit)}</strong>
                        </div>
                        <div class="cgraph-leaf-desc">
                          Released on ${formatDate(rel.released_at)}
                          ${rel.recipient_name ? `• To: ${escapeHtml(rel.recipient_name)}` : ''}
                        </div>
                      </div>
                    `).join('') : ''}
                    ${hasReleases && b.releases.length > 4 ? `
                      <div class="cgraph-node-leaf" style="background:var(--color-surface-alt); text-align:center; padding:4px; font-size:11px; color:var(--color-text-muted);">
                        + ${b.releases.length - 4} more distribution${b.releases.length - 4 !== 1 ? 's' : ''}
                      </div>
                    ` : ''}

                    <!-- 3. Defects / Quarantines -->
                    ${hasDefects ? b.defects.map((def, dIdx) => `
                      <div class="cgraph-node-leaf cgraph-node-leaf--defect" id="cgraph-leaf-def-${b.id}-${dIdx}">
                        <div class="cgraph-leaf-title">
                          <span style="color:#dc2626; display:flex; align-items:center; gap:3px;">
                            <span class="icon icon--sm" style="font-size:12px;">warning</span>
                            ${escapeHtml(def.action_taken)}
                          </span>
                          <strong style="color:#dc2626;">${def.quantity_affected.toLocaleString()} ${escapeHtml(commodity.unit)}</strong>
                        </div>
                        <div class="cgraph-leaf-desc">
                          ${escapeHtml(def.classification)} • ${formatDate(def.reported_at)}
                        </div>
                      </div>
                    `).join('') : ''}

                  </div>
                </div>
              `;
            }).join('')}
          </div>

        </div>
      </div>
    </div>

    <!-- Modal Footer / Legend -->
    <footer class="cgraph-footer">
      <div class="cgraph-legend-group">
        <span style="font-weight:600; color:var(--color-text-dark);">Legend:</span>
        <span class="cgraph-legend-item"><span class="cgraph-legend-dot cgraph-legend-dot--good"></span> Good (&gt;6 Months)</span>
        <span class="cgraph-legend-item"><span class="cgraph-legend-dot cgraph-legend-dot--moderate"></span> Moderate (3-6 Months)</span>
        <span class="cgraph-legend-item"><span class="cgraph-legend-dot cgraph-legend-dot--near"></span> Near Expiry (0-3 Months)</span>
        <span class="cgraph-legend-item"><span class="cgraph-legend-dot cgraph-legend-dot--expired"></span> Expired</span>
        <span class="cgraph-legend-item"><span class="cgraph-legend-dot cgraph-legend-dot--dist"></span> Barangay Distribution</span>
      </div>
      <div class="cgraph-tip">
        <span class="icon icon--sm" style="font-size:13px; vertical-align:middle;">info</span>
        <strong>Tip:</strong> Drag to pan • Scroll to zoom • Click <strong>View in Table</strong> to jump to batch
      </div>
    </footer>
  `;

  // Attach event handlers
  dialog.querySelector('#cgraph-close-btn')?.addEventListener('click', closeModal);

  // Jump to batch in table
  dialog.querySelectorAll('.cgraph-batch-jump').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const batchNum = btn.dataset.batchNumber;
      closeModal();
      window.location.hash = `#/batches?highlight=${encodeURIComponent(batchNum)}`;
    });
  });

  // 5. Setup Pan & Zoom Engine
  const viewport = dialog.querySelector('#cgraph-viewport');
  const canvas   = dialog.querySelector('#cgraph-canvas');
  const svg      = dialog.querySelector('#cgraph-svg');
  const zoomVal  = dialog.querySelector('#cgraph-zoom-val');

  let scale = 1.0;
  let posX  = 30;
  let posY  = 40;
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  function updateTransform() {
    canvas.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    zoomVal.textContent = `${Math.round(scale * 100)}%`;
  }

  // Mouse drag to pan
  viewport.addEventListener('mousedown', (e) => {
    if (e.target.closest('button') || e.target.closest('a')) return;
    isDragging = true;
    viewport.classList.add('is-dragging');
    startX = e.clientX - posX;
    startY = e.clientY - posY;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    posX = e.clientX - startX;
    posY = e.clientY - startY;
    updateTransform();
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      viewport.classList.remove('is-dragging');
    }
  });

  // Mouse wheel zoom
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newScale = Math.min(Math.max(scale * zoomFactor, 0.4), 2.2);
    
    // Zoom toward pointer
    const rect = viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    posX -= (mouseX - posX) * (newScale / scale - 1);
    posY -= (mouseY - posY) * (newScale / scale - 1);
    scale = newScale;

    updateTransform();
  }, { passive: false });

  // Zoom control buttons
  dialog.querySelector('#cgraph-zoom-in')?.addEventListener('click', () => {
    scale = Math.min(scale * 1.15, 2.2);
    updateTransform();
  });

  dialog.querySelector('#cgraph-zoom-out')?.addEventListener('click', () => {
    scale = Math.max(scale / 1.15, 0.4);
    updateTransform();
  });

  dialog.querySelector('#cgraph-zoom-fit')?.addEventListener('click', () => {
    scale = 1.0;
    posX = 30;
    posY = 40;
    updateTransform();
  });

  updateTransform();

  // 6. Draw Bezier Connector Cables
  function getNodeOffset(el, container) {
    // Returns {x, y, w, h} of el relative to container in unscaled canvas coords
    let x = 0, y = 0;
    let node = el;
    while (node && node !== container) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent;
    }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  }

  function drawConnectors() {
    svg.innerHTML = '';

    const nodesLayer = dialog.querySelector('#cgraph-nodes');
    if (!nodesLayer) return;

    const totalW = nodesLayer.scrollWidth;
    const totalH = nodesLayer.scrollHeight;
    svg.setAttribute('width', totalW);
    svg.setAttribute('height', totalH);
    svg.setAttribute('viewBox', `0 0 ${totalW} ${totalH}`);

    const rootNode = dialog.querySelector('#cgraph-node-root');
    if (!rootNode) return;

    // Root right-center (exit point)
    const rootOff = getNodeOffset(rootNode, nodesLayer);
    const rootX = rootOff.x + rootOff.w;
    const rootY = rootOff.y + rootOff.h / 2;

    batches.forEach(b => {
      const batchNode = dialog.querySelector(`#cgraph-node-batch-${b.id}`);
      if (!batchNode) return;

      // Batch left-center (entry) and right-center (exit)
      const batchOff = getNodeOffset(batchNode, nodesLayer);
      const batchInX  = batchOff.x;
      const batchInY  = batchOff.y + batchOff.h / 2;
      const batchOutX = batchOff.x + batchOff.w;
      const batchOutY = batchInY;

      // Root → Batch connector
      const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p1.setAttribute('d', makeBezier(rootX, rootY, batchInX, batchInY));
      p1.setAttribute('class', `cgraph-connector cgraph-conn-batch-${b.id}`);
      svg.appendChild(p1);

      // Batch → each Leaf connector
      const leaves = dialog.querySelectorAll(`#cgraph-leaves-${b.id} .cgraph-node-leaf`);
      leaves.forEach(leaf => {
        const leafOff = getNodeOffset(leaf, nodesLayer);
        const leafX = leafOff.x;
        const leafY = leafOff.y + leafOff.h / 2;

        const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p2.setAttribute('d', makeBezier(batchOutX, batchOutY, leafX, leafY));
        p2.setAttribute('class', `cgraph-connector cgraph-conn-batch-${b.id}`);
        svg.appendChild(p2);
      });

      // Hover path-highlight
      batchNode.addEventListener('mouseenter', () => {
        batchNode.classList.add('is-hovered');
        svg.querySelectorAll(`.cgraph-conn-batch-${b.id}`).forEach(p => p.classList.add('is-active'));
      });
      batchNode.addEventListener('mouseleave', () => {
        batchNode.classList.remove('is-hovered');
        svg.querySelectorAll(`.cgraph-conn-batch-${b.id}`).forEach(p => p.classList.remove('is-active'));
      });
    });
  }

  function makeBezier(x1, y1, x2, y2) {
    const dx = Math.abs(x2 - x1) * 0.55;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  }

  // Draw connectors after first layout paint; redraw on resize
  setTimeout(drawConnectors, 80);
  window.addEventListener('resize', drawConnectors);
}
