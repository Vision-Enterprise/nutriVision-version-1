import { printReportHtml, downloadReportPdf } from '../../shared/utils/print.utils.js';
/**
 * Defects Module — Official Slip & Document Generator
 * Generates on-the-fly printable slips for Quarantined, Returned, and Disposed stock.
 * Uses zero database storage.
 */

const ORG_NAME    = 'Municipal Nutrition Action Office';
const ORG_ADDRESS = 'Manolo Fortich, Bukidnon';

/**
 * Shows the print preview for a stock event.
 */
export function showDefectPrintPreview(incident, batch, profile, onConfirm, originalDate = null) {
  const act = (incident.actionTaken || incident.action_taken || '').toLowerCase();
  let prefix = 'Quarantine_Notice';
  let modalTitle = 'Quarantine Notice';

  if (act.includes('return')) {
    prefix = 'Supplier_Return_Slip';
    modalTitle = 'Return Slip';
  } else if (act.includes('dispos') || act.includes('spoil')) {
    prefix = 'Disposal_Record';
    modalTitle = 'Disposal Record';
  }

  const cleanBatch = (batch?.batch_number || 'BATCH').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr    = new Date().toISOString().split('T')[0];
  const pdfTitle   = `${prefix}_${cleanBatch}_${dateStr}`;
  const originalTitle = document.title;

  document.title = pdfTitle;

  const html = _generateIncidentReportHTML(incident, batch, profile, originalDate);

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
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="icon" style="color: var(--color-primary); font-size: 20px;">description</span>
          <h3 style="font-size: 16px; font-weight: 600; margin: 0;">Print Preview — ${modalTitle}</h3>
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
          <button id="defect-preview-cancel" style="
            padding: 8px 18px; border-radius: 8px; border: 1px solid #ccc;
            background: transparent; cursor: pointer; font-size: 14px; color: #555;
          ">Cancel</button>
          <button id="defect-preview-print" style="
            padding: 8px 18px; border-radius: 8px; border: 1px solid #cbd5e1;
            background: #fff; color: #334155; cursor: pointer;
            font-size: 14px; font-weight: 500;
            display: flex; align-items: center; gap: 6px;
          ">
            <span class="icon" style="font-size:18px;">print</span>
            Print
          </button>
          <button id="defect-preview-save" style="
            padding: 8px 20px; border-radius: 8px; border: none;
            background: #1b7a3e; color: #fff; cursor: pointer;
            font-size: 14px; font-weight: 600;
            display: flex; align-items: center; gap: 6px;
          ">
            <span class="icon" style="font-size:18px;">download</span>
            Save PDF
          </button>
        </div>
      </div>
      <div style="flex: 1; background: #cbd5e1; padding: 24px; display: flex; justify-content: center; overflow: auto;">
        <iframe id="defect-preview-iframe" style="width: 100%; max-width: 210mm; height: 100%; min-height: 297mm; background: #fff; border: none; box-shadow: 0 4px 16px rgba(0,0,0,0.15);"></iframe>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const iframe    = overlay.querySelector('#defect-preview-iframe');
  const cancelBtn = overlay.querySelector('#defect-preview-cancel');
  const printBtn  = overlay.querySelector('#defect-preview-print');
  const saveBtn   = overlay.querySelector('#defect-preview-save');

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  iframe.src = blobUrl;

  const cleanup = () => {
    try { URL.revokeObjectURL(blobUrl); } catch (_) {}
    document.title = originalTitle;
    const printArea = document.getElementById('nv-print-area');
    if (printArea) printArea.innerHTML = '';
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
  };

  cancelBtn.onclick = cleanup;
  printBtn.onclick  = () => {
    printReportHtml(pdfTitle, html);
    if (typeof onConfirm === 'function') onConfirm();
  };

  if (saveBtn) {
    saveBtn.onclick = async () => {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="icon" style="font-size:18px;">hourglass_top</span> Saving...';
      try {
        await downloadReportPdf(pdfTitle, html, 'portrait');
        if (typeof onConfirm === 'function') onConfirm();
      } catch (err) {
        console.error('Error saving defect PDF:', err);
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<span class="icon" style="font-size:18px;">download</span> Save PDF';
      }
    };
  }
}

// ─── HTML Generation ──────────────────────────────────────────────────────────

function _generateIncidentReportHTML(incident, batch, profile, originalDate = null) {
  const now          = originalDate ? new Date(originalDate) : (incident.reported_at ? new Date(incident.reported_at) : new Date());
  const dateStr      = now.toISOString().split('T')[0];
  const generatedStr = now.toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' });
  const comm         = batch?.commodities;

  const act = (incident.actionTaken || incident.action_taken || '').toLowerCase();
  let documentTitle = 'COMMODITY QUARANTINE NOTICE';
  let documentSubtitle = 'Official Notice of Temporary Hold Pending Quality / Supplier Verification';
  let sigRole1 = 'Held / Inspected By:';
  let sigRole2 = 'Approved / Noted By:';
  let sigTitle2 = 'Municipal Nutrition Action Officer (MNAO)';

  if (act.includes('return')) {
    documentTitle = 'COMMODITY RETURN & TURNOVER SLIP';
    documentSubtitle = 'Official Return to Supplier / Source for Replacement or Credit';
    sigRole1 = 'Turned Over By:';
    sigRole2 = 'Received By:';
    sigTitle2 = 'Supplier / Carrier Representative';
  } else if (act.includes('dispos') || act.includes('spoil')) {
    documentTitle = 'COMMODITY DISPOSAL & CONDEMNATION RECORD';
    documentSubtitle = 'Official Condemnation & Inventory Write-Off Certificate';
    sigRole1 = 'Condemned By:';
    sigRole2 = 'Approved By:';
    sigTitle2 = 'Municipal Nutrition Action Officer (MNAO)';
  }

  const cleanBatch   = (batch?.batch_number || 'BATCH').replace(/[^a-zA-Z0-9_-]/g, '_');
  const pdfTitle     = `${documentTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${cleanBatch}_${dateStr}`;
  const reporterName = profile?.full_name || incident.reporter_name || 'Authorized Staff';
  const evidenceImg  = incident.imageData || null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${pdfTitle}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 20mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      color: #1a1a1a;
      padding: 32px 36px;
      background: #fff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @media print {
      body { padding: 0; }
    }
    .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 10px; margin-bottom: 14px; }
    .header .agency-line { font-size: 10px; color: #444; margin: 1px 0; }
    .header h1 { font-size: 14px; font-weight: bold; color: #111; text-transform: uppercase; margin-top: 3px; letter-spacing: 0.5px; }
    .report-title { font-size: 13px; font-weight: bold; text-align: center; margin: 10px 0 2px; text-transform: uppercase; letter-spacing: 0.8px; }
    .report-subtitle { font-size: 9.5px; text-align: center; color: #555; margin-bottom: 12px; }
    .meta { display: flex; justify-content: space-between; font-size: 10px; color: #444; margin-bottom: 14px; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; border: 1px solid #333; margin-bottom: 14px; }
    .info-cell { padding: 8px 12px; border-right: 1px solid #333; background: #fafafa; }
    .info-cell:last-child { border-right: none; }
    .info-cell label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #555; display: block; margin-bottom: 2px; font-weight: bold; }
    .info-cell span  { font-size: 12px; font-weight: bold; color: #111; }
    .section-title { font-size: 10.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #111; margin: 12px 0 6px; border-bottom: 1px solid #222; padding-bottom: 3px; }
    .detail-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .detail-table td { padding: 6px 10px; font-size: 11px; border: 1px solid #ccc; }
    .detail-table td:first-child { font-weight: bold; color: #333; width: 35%; background: #f7f7f7; }
    .action-text { font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
    .remarks-box { border: 1px solid #333; padding: 10px 12px; font-size: 11px; color: #111; min-height: 48px; margin-top: 4px; white-space: pre-wrap; background: #fafafa; }
    .signatures { display: flex; justify-content: space-between; margin-top: 32px; page-break-inside: avoid; }
    .sig-block { text-align: center; width: 230px; }
    .sig-role  { text-align: left; font-size: 10px; color: #333; margin-bottom: 28px; }
    .sig-line  { border-top: 1px solid #222; padding-top: 4px; font-size: 10px; text-transform: uppercase; }
    .sig-title { font-size: 9px; color: #555; text-transform: none; }
    .footer { text-align: center; margin-top: 26px; font-size: 9px; color: #666; border-top: 1px solid #ccc; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <p class="agency-line">Republic of the Philippines</p>
    <p class="agency-line">Province of Bukidnon</p>
    <p class="agency-line">Municipality of Manolo Fortich</p>
    <h1>${ORG_NAME}</h1>
  </div>

  <div class="report-title">${documentTitle}</div>
  <div class="report-subtitle">${documentSubtitle}</div>

  <div class="meta">
    <span><strong>BATCH REFERENCE:</strong> ${batch?.batch_number || '—'}</span>
    <span><strong>DOCUMENT DATE:</strong> ${generatedStr}</span>
  </div>

  <!-- Batch Summary -->
  <div class="info-grid">
    <div class="info-cell">
      <label>Target Batch</label>
      <span>${batch?.batch_number || '—'}</span>
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
  <div class="section-title">Log Sheet Details</div>
  <table class="detail-table">
    <tr><td>Classification / Reason</td><td>${incident.classification || 'Inspection'}</td></tr>
    <tr><td>Action / Status</td><td><span class="action-text">${(incident.actionTaken || incident.action_taken || 'Logged').toUpperCase()}</span></td></tr>
    <tr><td>Date Logged</td><td>${generatedStr}</td></tr>
    <tr><td>Handled / Inspected By</td><td>${reporterName}</td></tr>
  </table>

  <!-- Remarks -->
  <div class="section-title">Remarks / Log Details</div>
  <div class="remarks-box">${incident.remarks || 'No additional remarks provided.'}</div>

  ${evidenceImg ? `
  <div class="section-title" style="margin-top: 14px;">Photo Attachment</div>
  <div style="text-align:center; margin-top: 8px;">
    <img src="${evidenceImg}"
      alt="Evidence"
      style="max-width: 100%; max-height: 250px; object-fit: contain;
             border: 1px solid #333; padding: 4px;"
    >
  </div>
  ` : ''}

  <!-- Signatures -->
  <div class="signatures">
    <div class="sig-block">
      <div class="sig-role">${sigRole1}</div>
      <div class="sig-line">
        <strong>${reporterName.toUpperCase()}</strong><br>
        <span class="sig-title">Nutrition Staff / Custodian</span>
      </div>
    </div>
    <div class="sig-block">
      <div class="sig-role">${sigRole2}</div>
      <div class="sig-line">
        <strong>&nbsp;</strong><br>
        <span class="sig-title">${sigTitle2}</span>
      </div>
    </div>
  </div>

  <div class="footer">
    Official Record &bull; Municipal Nutrition Action Office &bull; Manolo Fortich, Bukidnon
  </div>
</body>
</html>`;
}
