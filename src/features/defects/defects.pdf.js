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
  const isDispose  = (incident.actionTaken || incident.action_taken || '').toLowerCase().includes('dispos');
  const prefix     = isDispose ? 'Disposal_Record' : 'Quarantine_Notice';
  const cleanBatch = (batch?.batch_number || 'BATCH').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr    = new Date().toISOString().split('T')[0];
  const pdfTitle   = `${prefix}_${cleanBatch}_${dateStr}`;
  const originalTitle = document.title;

  // Set top-level document title so browser print dialog pre-fills exact file name
  document.title = pdfTitle;

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
            <span class="icon" style="font-size:18px;">print</span>
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

  const cleanup = () => {
    document.title = originalTitle;
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
  };

  cancelBtn.onclick = cleanup;
  printBtn.onclick  = () => {
    document.title = pdfTitle;
    try {
      if (iframe.contentDocument) iframe.contentDocument.title = pdfTitle;
    } catch (e) {}

    iframe.contentWindow.focus();
    iframe.contentWindow.print();

    const restore = () => { document.title = originalTitle; };
    window.addEventListener('afterprint', restore, { once: true });
    setTimeout(restore, 3000);

    // Only save to DB after confirming print
    if (typeof onConfirm === 'function') onConfirm();
  };
}

// ─── HTML Generation ──────────────────────────────────────────────────────────

function _generateIncidentReportHTML(incident, batch, profile) {
  const now          = new Date();
  const dateStr      = now.toISOString().split('T')[0];
  const generatedStr = now.toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' });
  const comm         = batch?.commodities;
  
  const actionStr    = (incident.actionTaken || incident.action_taken || '').toLowerCase();
  const isDispose    = actionStr.includes('dispos');
  const actionLabel  = isDispose ? 'Disposal Record' : 'Quarantine Notice';
  const prefix       = isDispose ? 'Disposal_Record' : 'Quarantine_Notice';
  const cleanBatch   = (batch?.batch_number || 'BATCH').replace(/[^a-zA-Z0-9_-]/g, '_');
  const pdfTitle     = `${prefix}_${cleanBatch}_${dateStr}`;

  const evidenceImg  = incident.imageData || incident.evidenceUrl || incident.evidence_url;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${pdfTitle}</title>
<style>
    @page {
      size: A4 portrait;
      margin: 12mm 16mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      color: #1a1a1a;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 10px; margin-bottom: 16px; }
    .header .agency-line { font-size: 10.5px; color: #444; margin: 1px 0; }
    .header h1 { font-size: 14px; font-weight: bold; color: #111; text-transform: uppercase; margin-top: 3px; letter-spacing: 0.5px; }
    .report-title { font-size: 13px; font-weight: bold; text-align: center; margin: 12px 0 4px; text-transform: uppercase; letter-spacing: 0.8px; }
    .meta { display: flex; justify-content: space-between; font-size: 10px; color: #444; margin-bottom: 16px; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; border: 1px solid #333; margin-bottom: 16px; }
    .info-cell { padding: 8px 12px; border-right: 1px solid #333; background: #fafafa; }
    .info-cell:last-child { border-right: none; }
    .info-cell label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #555; display: block; margin-bottom: 2px; font-weight: bold; }
    .info-cell span  { font-size: 12px; font-weight: bold; color: #111; }
    .section-title { font-size: 10.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #111; margin: 14px 0 6px; border-bottom: 1px solid #222; padding-bottom: 3px; }
    .detail-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .detail-table td { padding: 6px 10px; font-size: 11px; border: 1px solid #ccc; }
    .detail-table td:first-child { font-weight: bold; color: #333; width: 35%; background: #f7f7f7; }
    .action-text { font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
    .remarks-box { border: 1px solid #333; padding: 10px 12px; font-size: 11px; color: #111; min-height: 50px; margin-top: 6px; white-space: pre-wrap; background: #fafafa; }
    .signatures { display: flex; justify-content: space-between; margin-top: 36px; page-break-inside: avoid; }
    .sig-block { text-align: center; width: 220px; }
    .sig-role  { text-align: left; font-size: 10px; color: #333; margin-bottom: 30px; }
    .sig-line  { border-top: 1px solid #222; padding-top: 4px; font-size: 10px; text-transform: uppercase; }
    .sig-title { font-size: 9.5px; color: #555; text-transform: none; }
    .footer { text-align: center; margin-top: 30px; font-size: 9.5px; color: #666; border-top: 1px solid #ccc; padding-top: 8px; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <p class="agency-line">Republic of the Philippines</p>
    <p class="agency-line">Province of Bukidnon</p>
    <p class="agency-line">Municipality of Manolo Fortich</p>
    <h1>${ORG_NAME}</h1>
  </div>

  <div class="report-title">${actionLabel}</div>
  <div class="meta">
    <span><strong>REFERENCE:</strong> ${batch.batch_number}</span>
    <span><strong>DATE GENERATED:</strong> ${generatedStr}</span>
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
    <tr><td>Defect Classification</td><td>${incident.classification || 'Inspection / Damage'}</td></tr>
    <tr><td>Action Taken</td><td><span class="action-text">${(incident.actionTaken || incident.action_taken || (isDispose ? 'Disposed' : 'Quarantined')).toUpperCase()}</span></td></tr>
    <tr><td>Date Reported</td><td>${generatedStr}</td></tr>
    <tr><td>Reported By</td><td>${profile?.full_name || 'Authorized Staff'}</td></tr>
  </table>

  <!-- Remarks -->
  <div class="section-title">Remarks / Incident Details</div>
  <div class="remarks-box">${incident.remarks || 'No additional remarks provided.'}</div>

  <!-- Photographic Evidence -->
  ${evidenceImg ? `
  <div class="section-title" style="margin-top: 18px;">Photographic Evidence</div>
  <div style="text-align:center; margin-top: 8px;">
    <img src="${evidenceImg}"
      alt="Defect evidence"
      style="max-width: 100%; max-height: 280px; object-fit: contain;
             border: 1px solid #333; padding: 4px;"
    >
    <p style="font-size: 9.5px; color: #555; margin-top: 4px;">Attached photographic inspection evidence.</p>
  </div>
  ` : `
  <div class="section-title" style="margin-top: 18px;">Photographic Evidence</div>
  <p style="font-size: 11px; color: #888; font-style: italic; margin-top: 6px;">No photographic evidence provided.</p>
  `}

  <!-- Signatures -->
  <div class="signatures">
    <div class="sig-block">
      <div class="sig-role">Prepared by:</div>
      <div class="sig-line">
        <strong>${(profile?.full_name || 'Staff').toUpperCase()}</strong><br>
        <span class="sig-title">Nutrition Personnel</span>
      </div>
    </div>
    <div class="sig-block">
      <div class="sig-role">Noted by:</div>
      <div class="sig-line">
        <strong>MNAO OFFICER</strong><br>
        <span class="sig-title">Municipal Nutrition Action Office</span>
      </div>
    </div>
  </div>

  <div class="footer">
    Official Document &bull; Municipal Nutrition Action Office, Manolo Fortich, Bukidnon
  </div>
</body>
</html>`;
}

/**
 * Returns the PDF file name for archive storage.
 */
export function getDefectPdfFileName(batchNumber, action) {
  const date       = new Date().toISOString().split('T')[0];
  const isDispose  = (action || '').toLowerCase().includes('dispos');
  const prefix     = isDispose ? 'Disposal_Record' : 'Quarantine_Notice';
  const cleanBatch = (batchNumber || 'BATCH').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${prefix}_${cleanBatch}_${date}.pdf`;
}
