/**
 * Milk Bank — Official Print / PDF Export Generator
 * Formatted precisely for A4 Landscape print/PDF export matching official paper forms.
 */

/**
 * Shared modal overlay for print preview
 */
function showPrintPreviewOverlay(previewTitle, pdfFilename, htmlContent) {
  const originalTitle = document.title;
  document.title = pdfFilename;

  const overlay = document.createElement('div');
  overlay.id = 'milk-print-preview-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 24px;
  `;

  overlay.innerHTML = `
    <div style="
      background: #fff; border-radius: 12px; width: 100%; max-width: 1050px;
      height: 92vh; display: flex; flex-direction: column; overflow: hidden;
      box-shadow: 0 24px 64px rgba(0,0,0,0.4);
    ">
      <div style="
        display: flex; align-items: center; justify-content: space-between;
        padding: 16px 24px; border-bottom: 1px solid #e2e8f0; flex-shrink: 0;
      ">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0; color: #0f172a;">
          ${escapeHtml(previewTitle)}
        </h3>
        <div style="display: flex; gap: 10px; align-items: center;">
          <button id="milk-preview-cancel" style="
            padding: 8px 18px; border-radius: 8px; border: 1px solid #cbd5e1;
            background: #fff; cursor: pointer; font-size: 14px; color: #475569;
          ">Close</button>
          <button id="milk-preview-print" style="
            padding: 8px 20px; border-radius: 8px; border: none;
            background: #0284c7; color: #fff; cursor: pointer;
            font-size: 14px; font-weight: 600;
            display: flex; align-items: center; gap: 6px;
          ">
            <span class="icon" style="font-size:18px;">print</span>
            Print / Save PDF
          </button>
        </div>
      </div>
      <div style="flex: 1; background: #64748b; padding: 20px; display: flex; justify-content: center; overflow: auto;">
        <iframe id="milk-preview-iframe" style="
          width: 100%; max-width: 297mm; height: 100%; min-height: 210mm;
          background: #fff; border: none; box-shadow: 0 6px 24px rgba(0,0,0,0.25);
        "></iframe>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const iframe = document.getElementById('milk-preview-iframe');
  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();

  const cleanup = () => {
    document.title = originalTitle;
    overlay.remove();
  };

  document.getElementById('milk-preview-cancel').addEventListener('click', cleanup);

  document.getElementById('milk-preview-print').addEventListener('click', () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. LOG OF MILK RECEIVED (Form MH.MNAO.FM.002.00)
// ─────────────────────────────────────────────────────────────────────────────
export function showMilkIntakePrintPreview(donations = []) {
  const dateStr = new Date().toISOString().split('T')[0];
  const pdfTitle = `LOG_OF_MILK_RECEIVED_FM_002_00_${dateStr}`;
  const html = generateMilkIntakeReportHTML(donations);
  showPrintPreviewOverlay('Print Preview — Form MH.MNAO.FM.002.00 (LOG OF MILK RECEIVED)', pdfTitle, html);
}

function generateMilkIntakeReportHTML(donations = []) {
  const totalRows = Math.max(15, donations.length);
  const rowsHtml = [];

  for (let i = 0; i < totalRows; i++) {
    const d = donations[i] || null;
    rowsHtml.push(`
      <tr>
        <td style="text-align: center;">${i + 1}.</td>
        <td style="font-weight: 600;">${d ? escapeHtml(d.donor_code) : ''}</td>
        <td style="text-align: center;">${d ? escapeHtml(d.expression_date_notes || '@see donor log') : ''}</td>
        <td style="text-align: center;">${d ? escapeHtml(d.transport_date || '') : ''}</td>
        <td style="text-align: center;">${d ? escapeHtml(d.transport_time || '') : ''}</td>
        <td style="text-align: center;">${d ? escapeHtml(d.condition_at_collection || 'ok') : ''}</td>
        <td style="text-align: center;">${d ? formatDate(d.arrival_date) : ''}</td>
        <td style="text-align: center;">${d ? escapeHtml(d.arrival_time || '') : ''}</td>
        <td style="text-align: center;">${d ? escapeHtml(d.condition_at_arrival || 'ok') : ''}</td>
        <td style="text-align: center;">${d ? escapeHtml(d.transport_condition || '') : ''}</td>
        <td>${d?.received_by_name ? escapeHtml(d.received_by_name) : ''}</td>
      </tr>
    `);
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>LOG OF MILK RECEIVED (MH.MNAO.FM.002.00)</title>
      <style>${getBasePrintStyles()}</style>
    </head>
    <body>
      ${getHeaderHTML('LOG OF MILK RECEIVED')}

      <table class="report-grid">
        <thead>
          <tr>
            <th rowspan="2" style="width: 25px;">#</th>
            <th rowspan="2" style="width: 110px;">Donor name / Code</th>
            <th colspan="1">Milk expression</th>
            <th colspan="2">Transport</th>
            <th rowspan="2" style="width: 90px;">Condition of milk when collected from donor</th>
            <th colspan="2">Arrival at milk bank</th>
            <th rowspan="2" style="width: 90px;">Condition of milk upon arrival at milk bank</th>
            <th rowspan="2" style="width: 75px;">Conditions of transport</th>
            <th rowspan="2" style="width: 120px;">Signature of Receiving Personnel</th>
          </tr>
          <tr>
            <th style="width: 90px;">Date &amp; Time</th>
            <th style="width: 75px;">Date</th>
            <th style="width: 60px;">Time</th>
            <th style="width: 75px;">Date</th>
            <th style="width: 60px;">Time</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml.join('')}
        </tbody>
      </table>

      ${getSignaturesHTML('Endorsed by:', 'Municipal Nutrition Action Officer', 'Noted by:', 'Rural Health Physician')}
      <div class="form-code">MH.MNAO.FM.002.00</div>
    </body>
    </html>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PASTEURIZED BATCHES INVENTORY & FREEZER LOG
// ─────────────────────────────────────────────────────────────────────────────
export function showMilkBatchesPrintPreview(batches = []) {
  const dateStr = new Date().toISOString().split('T')[0];
  const pdfTitle = `PASTEURIZED_BATCHES_INVENTORY_${dateStr}`;
  const html = generateMilkBatchesReportHTML(batches);
  showPrintPreviewOverlay('Print Preview — Pasteurized Human Milk Batches & Freezer Log', pdfTitle, html);
}

function generateMilkBatchesReportHTML(batches = []) {
  const totalRows = Math.max(15, batches.length);
  const rowsHtml = [];
  let totalBags = 0;
  let remainingBags = 0;

  batches.forEach(b => {
    totalBags += parseInt(b.total_bags, 10) || 0;
    remainingBags += parseInt(b.remaining_bags, 10) || 0;
  });

  for (let i = 0; i < totalRows; i++) {
    const b = batches[i] || null;
    let statusText = '';
    if (b) {
      statusText = (b.remaining_bags || 0) <= 0 ? 'Depleted' : `Available (${b.remaining_bags})`;
    }

    rowsHtml.push(`
      <tr>
        <td style="text-align: center;">${i + 1}.</td>
        <td style="font-weight: 700; font-family: monospace;">${b ? escapeHtml(b.batch_number) : ''}</td>
        <td style="text-align: center;">${b ? formatDate(b.date_pasteurized) : ''}</td>
        <td style="text-align: center;">${b ? formatDate(b.expiry_date) : ''}</td>
        <td>${b ? escapeHtml(b.freezer_shelf || 'Upright Freezer A') : ''}</td>
        <td style="text-align: center;">${b ? b.total_bags : ''}</td>
        <td style="text-align: center; font-weight: 700;">${b ? b.remaining_bags : ''}</td>
        <td style="text-align: center;">${b ? escapeHtml(statusText) : ''}</td>
        <td style="height: 24px;"></td>
      </tr>
    `);
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>PASTEURIZED MILK INVENTORY & FREEZER STORAGE LOG</title>
      <style>${getBasePrintStyles()}</style>
    </head>
    <body>
      ${getHeaderHTML('PASTEURIZED MILK INVENTORY &amp; FREEZER STORAGE LOG')}

      <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 10px; color: #334155;">
        <span><strong>Total Batches:</strong> ${batches.length}</span>
        <span><strong>Initial Total Bags:</strong> ${totalBags}</span>
        <span><strong>Current Stock Remaining:</strong> ${remainingBags} bag(s)</span>
        <span><strong>As of:</strong> ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>

      <table class="report-grid">
        <thead>
          <tr>
            <th style="width: 25px;">#</th>
            <th style="width: 100px;">Batch No.</th>
            <th style="width: 95px;">Date Pasteurized</th>
            <th style="width: 95px;">Expiration Date</th>
            <th style="width: 140px;">Cold-Chain Storage Location</th>
            <th style="width: 65px; text-align: center;">Initial Bags</th>
            <th style="width: 75px; text-align: center;">Remaining Bags</th>
            <th style="width: 85px; text-align: center;">Batch Status</th>
            <th style="width: 110px;">Verification Sign</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml.join('')}
        </tbody>
      </table>

      ${getSignaturesHTML('Prepared by:', 'Milk Bank Technician / Encoder', 'Approved by:', 'Municipal Nutrition Action Officer')}
      <div class="form-code">MH.MNAO.FM.003.00</div>
    </body>
    </html>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. BENEFICIARY MILK DISPENSING & ISSUANCE LEDGER
// ─────────────────────────────────────────────────────────────────────────────
export function showMilkDispensingPrintPreview(dispatches = [], batches = []) {
  const dateStr = new Date().toISOString().split('T')[0];
  const pdfTitle = `BENEFICIARY_MILK_DISPENSING_LEDGER_${dateStr}`;
  const html = generateMilkDispensingReportHTML(dispatches);
  showPrintPreviewOverlay('Print Preview — Beneficiary Milk Dispensing & Issuance Ledger', pdfTitle, html);
}

function generateMilkDispensingReportHTML(dispatches = []) {
  const totalRows = Math.max(15, dispatches.length);
  const rowsHtml = [];
  let totalBagsDispensed = 0;

  dispatches.forEach(d => {
    totalBagsDispensed += parseInt(d.bags_dispensed, 10) || 0;
  });

  for (let i = 0; i < totalRows; i++) {
    const d = dispatches[i] || null;
    const batchNo = d?.milk_batches?.batch_number || '';
    const shelfLoc = d?.milk_batches?.freezer_shelf || '';

    rowsHtml.push(`
      <tr>
        <td style="text-align: center;">${i + 1}.</td>
        <td style="text-align: center;">${d ? formatDate(d.dispensed_date) : ''}</td>
        <td style="font-weight: 600;">${d ? escapeHtml(d.recipient_name) : ''}</td>
        <td>${d ? escapeHtml(d.barangay || '') : ''}</td>
        <td style="font-weight: 600; font-family: monospace;">${escapeHtml(batchNo)}</td>
        <td style="font-size: 9px; color: #475569;">${escapeHtml(shelfLoc)}</td>
        <td style="text-align: center; font-weight: 700;">${d ? `${d.bags_dispensed} bag(s)` : ''}</td>
        <td>${d ? escapeHtml(d.released_by_name || 'Staff') : ''}</td>
        <td style="height: 24px;"></td>
      </tr>
    `);
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>BENEFICIARY MILK DISPENSING & ISSUANCE LEDGER</title>
      <style>${getBasePrintStyles()}</style>
    </head>
    <body>
      ${getHeaderHTML('BENEFICIARY MILK DISPENSING &amp; ISSUANCE LEDGER')}

      <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 10px; color: #334155;">
        <span><strong>Total Issuance Logs:</strong> ${dispatches.length}</span>
        <span><strong>Total Bags Dispensed:</strong> ${totalBagsDispensed} bag(s)</span>
        <span><strong>Date Range:</strong> As of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>

      <table class="report-grid">
        <thead>
          <tr>
            <th style="width: 25px;">#</th>
            <th style="width: 80px;">Date Dispensed</th>
            <th style="width: 140px;">Recipient Infant / Mother</th>
            <th style="width: 110px;">Barangay</th>
            <th style="width: 90px;">Batch Issued (FEFO)</th>
            <th style="width: 120px;">Storage Source</th>
            <th style="width: 75px; text-align: center;">Quantity Issued</th>
            <th style="width: 100px;">Released By</th>
            <th style="width: 110px;">Recipient / Nurse Signature</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml.join('')}
        </tbody>
      </table>

      ${getSignaturesHTML('Dispensed by:', 'Nutrition Staff / Nurse on Duty', 'Verified & Noted by:', 'Municipal Nutrition Action Officer')}
      <div class="form-code">MH.MNAO.FM.004.00</div>
    </body>
    </html>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared Print Layout & Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getBasePrintStyles() {
  return `
    @page {
      size: A4 landscape;
      margin: 10mm 12mm 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      color: #000;
    }
    body {
      background: #fff;
      padding: 10px;
      font-size: 11px;
    }
    .header {
      text-align: center;
      margin-bottom: 10px;
      border-bottom: 1.5px solid #000;
      padding-bottom: 6px;
      position: relative;
    }
    .header h3 {
      font-size: 11px;
      font-weight: normal;
      text-transform: uppercase;
    }
    .header h2 {
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
      margin: 2px 0;
    }
    .header h4 {
      font-size: 12px;
      font-weight: bold;
    }
    .header-meta {
      font-size: 9.5px;
      margin-top: 3px;
    }
    .form-title {
      text-align: center;
      font-size: 13.5px;
      font-weight: bold;
      text-decoration: underline;
      margin: 8px 0 6px 0;
      letter-spacing: 0.04em;
    }
    table.report-grid {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    table.report-grid th, table.report-grid td {
      border: 1px solid #000;
      padding: 4px 6px;
      height: 22px;
    }
    table.report-grid th {
      background-color: #f1f5f9;
      font-weight: bold;
      text-align: center;
      vertical-align: middle;
      font-size: 9.5px;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 26px;
      padding: 0 40px;
      font-size: 11px;
    }
    .sig-block {
      width: 280px;
      text-align: center;
    }
    .sig-line {
      border-bottom: 1px solid #000;
      margin-bottom: 4px;
      height: 32px;
    }
    .form-code {
      position: fixed;
      bottom: 10px;
      right: 15px;
      font-size: 9px;
      border: 1px solid #000;
      padding: 2px 6px;
      font-weight: bold;
    }
  `;
}

function getHeaderHTML(title) {
  return `
    <div class="header">
      <h3>Province of Bukidnon</h3>
      <h2>Municipality of Manolo Fortich</h2>
      <h4>Municipal Nutrition Action Office &bull; Human Milk Bank</h4>
      <div class="header-meta">
        lgumanolofortich@yahoo.com &bull; manolofortich.com.ph &bull; 0917 729 3453
      </div>
    </div>
    <div class="form-title">${title}</div>
  `;
}

function getSignaturesHTML(leftLabel, leftRole, rightLabel, rightRole) {
  return `
    <div class="signatures">
      <div class="sig-block">
        <div style="text-align: left; margin-bottom: 2px;">${escapeHtml(leftLabel)}</div>
        <div class="sig-line"></div>
        <strong>${escapeHtml(leftRole)}</strong>
      </div>

      <div class="sig-block">
        <div style="text-align: left; margin-bottom: 2px;">${escapeHtml(rightLabel)}</div>
        <div class="sig-line"></div>
        <strong>${escapeHtml(rightRole)}</strong>
      </div>
    </div>
  `;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
  } catch {
    return dateStr;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─────────────────────────────────────────────────────────────────────────────
// EXCEL / CSV EXPORT HELPERS FOR MILK BANK MODULE
// ─────────────────────────────────────────────────────────────────────────────

function _csvCell(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  // Prevent Excel from converting dates, timestamps, times, or hyphenated codes into numeric cells that show "########"
  if (
    /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(str) ||
    /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(str) ||
    /^\d{1,2}:\d{2}/.test(str) ||
    /^\d{2,4}-\d+/.test(str)
  ) {
    return `="${str.replace(/"/g, '""')}"`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

function _downloadCsvFile(filename, rows) {
  const csvContent = '\uFEFF' + rows.map(r => r.map(_csvCell).join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportMilkIntakeCSV(donations = []) {
  const dateStr = new Date().toISOString().split('T')[0];
  const rows = [
    [
      '#',
      'Donor Name / Code',
      'Expression Date',
      'Expression Time',
      'Transport Date',
      'Transport Time',
      'Condition @ Donor',
      'Arrival Date',
      'Arrival Time',
      'Condition @ Arrival',
      'Conditions of Transport',
      'Receiving Personnel',
      'Status'
    ],
    ...donations.map((d, idx) => [
      idx + 1,
      d.donor_code || '',
      d.expression_date_notes || '',
      d.expression_time || '',
      d.transport_date || '',
      d.transport_time || '',
      d.condition_at_collection || 'ok',
      d.arrival_date || '',
      d.arrival_time || '',
      d.condition_at_arrival || 'ok',
      d.transport_condition || '',
      d.received_by_name || 'Staff',
      d.status === 'pasteurized' ? 'Pasteurized' : 'Stored Raw'
    ])
  ];
  _downloadCsvFile(`LOG_OF_MILK_RECEIVED_FM_002_00_${dateStr}.csv`, rows);
}

export function exportMilkBatchesCSV(batches = []) {
  const dateStr = new Date().toISOString().split('T')[0];
  const rows = [
    [
      '#',
      'Batch No.',
      'Date Pasteurized',
      'Expiration Date',
      'Freezer & Shelf Location',
      'Initial Bags',
      'Remaining Bags',
      'Status',
      'Remarks'
    ],
    ...batches.map((b, idx) => {
      const rem = Number(b.remaining_bags || 0);
      const status = rem <= 0 ? 'Depleted' : (rem <= 3 ? 'Low Stock' : 'Available');
      return [
        idx + 1,
        b.batch_number || '',
        b.date_pasteurized || '',
        b.expiry_date || '',
        b.freezer_shelf || '',
        b.total_bags ?? 0,
        rem,
        status,
        b.remarks || ''
      ];
    })
  ];
  _downloadCsvFile(`MILK_PASTEURIZED_BATCHES_${dateStr}.csv`, rows);
}

export function exportMilkDispensingCSV(dispatches = []) {
  const dateStr = new Date().toISOString().split('T')[0];
  const rows = [
    [
      '#',
      'Date Dispensed',
      'Recipient Infant / Mother',
      'Barangay',
      'Batch Issued (FEFO)',
      'Freezer Location',
      'Bags Dispensed',
      'Released By',
      'Status'
    ],
    ...dispatches.map((item, idx) => [
      idx + 1,
      item.dispensed_date || '',
      item.recipient_name || '',
      item.barangay || '',
      item.milk_batches?.batch_number || 'Unknown Batch',
      item.milk_batches?.freezer_shelf || 'Freezer',
      item.bags_dispensed ?? 0,
      item.released_by_name || 'Staff',
      'Issued'
    ])
  ];
  _downloadCsvFile(`MILK_DISPENSING_LEDGER_${dateStr}.csv`, rows);
}

export function exportMilkAuditCSV(auditLogs = []) {
  const dateStr = new Date().toISOString().split('T')[0];
  const rows = [
    [
      '#',
      'Date & Time',
      'Action Type',
      'Target Type',
      'Description of Activity',
      'Personnel'
    ],
    ...auditLogs.map((log, idx) => [
      idx + 1,
      log.created_at ? new Date(log.created_at).toLocaleString() : '',
      log.action || '',
      log.entity_type || '',
      log.description || '',
      log.profiles?.full_name || 'Staff User'
    ])
  ];
  _downloadCsvFile(`MILK_BANK_AUDIT_TRAIL_${dateStr}.csv`, rows);
}
