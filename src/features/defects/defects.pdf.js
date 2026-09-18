/**
 * Defects Module — PDF Print Preview
 * Generates the official Incident/Quarantine Report HTML and shows
 * it in a print preview modal — identical pattern to reports.pdf.js.
 * onConfirm() is called ONLY when the user clicks "Print / Save PDF".
 */

import { APP_ORGANIZATION } from '../../shared/constants/app.constants.js';

const ORG_NAME    = 'Municipal Nutrition Action Office';
const ORG_ADDRESS = 'Manolo Fortich, Bukidnon';

/**
 * @param {Object} incident      - filled form data (classification, qty, action, remarks)
 * @param {Object} batch         - the selected batch with commodity info
 * @param {Object} profile       - logged-in user
 * @param {Function} onConfirm   - called only when user clicks Print/Save
 */
export function showDefectPrintPreview(incident, batch, profile, onConfirm) {
  const html = _generateIncidentReportHTML(incident, batch, profile);

  // ── Overlay ────────────────────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 9000;
    background: rgba(0,0,0,0.65); backdrop-filter: blur(4px);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 24px;
  `;

  overlay.innerHTML = `
    <div style="
      background: #fff; border-radius: 12px; width: 100%; max-width: 880px;
      height: 90vh; display: flex; flex-direction: column; overflow: hidden;
      box-shadow: 0 24px 64px rgba(0,0,0,0.35);
    ">
      <!-- Modal header -->
      <div style="
        display: flex; align-items: center; justify-content: space-between;
        padding: 16px 24px; border-bottom: 1px solid #e0e0e0; flex-shrink: 0;
      ">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0;">Print Preview — Incident Report</h3>
        <div style="display: flex; gap: 10px; align-items: center;">
          <button id="defect-preview-cancel" style="
            padding: 8px 18px; border-radius: 8px; border: 1px solid #ccc;
            background: transparent; cursor: pointer; font-size: 14px; color: #555;
          ">Cancel</button>
          <button id="defect-preview-print" style="
            padding: 8px 20px; border-radius: 8px; border: none;
            background: #1b7a3e; color: #fff; cursor: pointer;
            font-size: 14px; font-weight: 600;
            display: flex; align-items: center; gap: 6px;
          ">
            <span style="font-family:'Material Symbols Outlined';font-size:18px;">print</span>
            Print / Save PDF
          </button>
        </div>
      </div>
      <!-- iframe -->
      <iframe id="defect-preview-iframe" style="flex: 1; border: none; background: #f5f5f5;"></iframe>
    </div>
  `;

  document.body.appendChild(overlay);

  const iframe   = overlay.querySelector('#defect-preview-iframe');
  const cancelBtn = overlay.querySelector('#defect-preview-cancel');
  const printBtn  = overlay.querySelector('#defect-preview-print');

  // Write content into iframe
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  cancelBtn.onclick = () => document.body.removeChild(overlay);
  printBtn.onclick  = () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    // Only save to DB after confirming print
    if (typeof onConfirm === 'function') onConfirm();
  };
}

// ─── HTML Generation ──────────────────────────────────────────────────────────

function _generateIncidentReportHTML(incident, batch, profile) {
  const now          = new Date();
  const generatedStr = now.toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' });
  const comm         = batch.commodities;
  const actionLabel  = incident.actionTaken === 'Disposed' ? 'Disposal Record' : 'Quarantine Notice';
  const fileName     = `Incident_Report_${batch.batch_number.replace(/\s+/g, '_')}_${now.toISOString().split('T')[0]}.pdf`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; padding: 32px 40px; }
    .header { text-align: center; border-bottom: 2px solid #1b7a3e; padding-bottom: 12px; margin-bottom: 20px; }
    .header h1 { font-size: 15px; font-weight: bold; color: #1b7a3e; }
    .header p  { font-size: 11px; color: #555; margin-top: 2px; }
    .report-title { font-size: 13px; font-weight: bold; text-align: center; margin: 8px 0 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .meta { display: flex; justify-content: space-between; font-size: 10px; color: #666; margin-bottom: 16px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 6px; padding: 14px; margin-bottom: 16px; }
    .info-cell label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; display: block; margin-bottom: 3px; }
    .info-cell span  { font-size: 13px; font-weight: bold; }
    .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #333; margin: 14px 0 6px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    .detail-table { width: 100%; border-collapse: collapse; }
    .detail-table td { padding: 7px 10px; font-size: 11px; border-bottom: 1px solid #eee; }
    .detail-table td:first-child { font-weight: 600; color: #555; width: 40%; }
    .badge-disposed  { background: #fde8e8; color: #c62828; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; }
    .badge-quarantine { background: #fff3e0; color: #e65100; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; }
    .remarks-box { background: #f5f5f5; border: 1px solid #ddd; border-radius: 6px; padding: 10px 12px; font-size: 11px; color: #333; min-height: 60px; margin-top: 6px; white-space: pre-wrap; }
    .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
    .sig-block { text-align: center; width: 200px; }
    .sig-line  { border-top: 1px solid #333; padding-top: 6px; font-size: 10px; }
    @media print { body { padding: 20px 28px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${ORG_NAME}</h1>
    <p>${ORG_ADDRESS}</p>
  </div>

  <div class="report-title">${actionLabel}</div>
  <div class="meta">
    <span>Reference: ${batch.batch_number}</span>
    <span>Generated: ${generatedStr}</span>
  </div>

  <!-- Batch Summary -->
  <div class="info-grid">
    <div class="info-cell">
      <label>Target Batch</label>
      <span>${batch.batch_number}</span>
    </div>
    <div class="info-cell">
      <label>Commodity</label>
      <span>${comm?.name || '—'}</span>
    </div>
    <div class="info-cell">
      <label>Quantity Affected</label>
      <span>${incident.quantityAffected} ${comm?.unit || ''}</span>
    </div>
  </div>

  <!-- Incident Details -->
  <div class="section-title">Incident Details</div>
  <table class="detail-table">
    <tr><td>Defect Classification</td><td>${incident.classification}</td></tr>
    <tr><td>Action Taken</td><td>${incident.actionTaken === 'Disposed'
      ? '<span class="badge-disposed">Disposed &amp; Deducted</span>'
      : '<span class="badge-quarantine">Quarantine — Entire Batch</span>'
    }</td></tr>
    <tr><td>Date Reported</td><td>${generatedStr}</td></tr>
    <tr><td>Reported By</td><td>${profile?.full_name || 'Unknown'}</td></tr>
  </table>

  <!-- Remarks -->
  <div class="section-title">Remarks / Incident Details</div>
  <div class="remarks-box">${incident.remarks || 'No additional remarks provided.'}</div>

  <!-- Photographic Evidence -->
  ${incident.imageData ? `
  <div class="section-title" style="margin-top: 18px;">Photographic Evidence</div>
  <div style="text-align:center; margin-top: 8px;">
    <img src="${incident.imageData}"
      alt="Defect evidence"
      style="max-width: 100%; max-height: 280px; object-fit: contain;
             border: 1px solid #ddd; border-radius: 6px; padding: 4px;"
    >
    <p style="font-size: 9px; color: #888; margin-top: 4px;">Evidence photo attached by reporter.</p>
  </div>
  ` : `
  <div class="section-title" style="margin-top: 18px;">Photographic Evidence</div>
  <p style="font-size: 11px; color: #888; font-style: italic; margin-top: 6px;">No photographic evidence provided.</p>
  `}

  <!-- Signatures -->
  <div class="signatures">
    <div class="sig-block">
      <div class="sig-line">Prepared By:<br><strong>${profile?.full_name || 'Staff'}</strong><br>Nutrition Personnel</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">Noted By:<br><strong>MNAO Officer</strong><br>Manolo Fortich</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Returns the PDF file name for archive storage.
 */
export function getDefectPdfFileName(batchNumber, action) {
  const date    = new Date().toISOString().split('T')[0];
  const prefix  = action === 'Disposed' ? 'Disposal_Record' : 'Quarantine_Notice';
  return `${prefix}_${(batchNumber || 'BATCH').replace(/\s+/g, '_')}_${date}.pdf`;
}
