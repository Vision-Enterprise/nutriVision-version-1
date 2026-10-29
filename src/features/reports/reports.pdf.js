import { getExpirationStatus, getDaysRemaining } from '../../shared/utils/date.utils.js';
import { buildReportFileName } from './reports.export.js';

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _fmtShortDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

/**
 * Generates the HTML string for the printable report.
 */
function generateReportHTML(title, data, modelId, filters = {}, profile) {
  const generatedDate = new Date().toLocaleString();
  const userName = profile?.full_name || 'Authorized Staff';

  let filterText = '';
  if (modelId === 'batches' || modelId === 'fefo') {
    filterText = `Scope: ${filters.expiryStatusLabel || 'All Active Batches'} | Commodity: ${filters.commodityName || 'All Commodities'}`;
  } else if (modelId === 'distribution') {
    filterText = `Period: ${filters.dateFrom || 'Start'} to ${filters.dateTo || 'Present'} | Barangay: ${filters.barangay === 'all' ? 'All Barangays' : (filters.barangay || 'All Barangays')} | Commodity: ${filters.commodityName || 'All Commodities'}`;
  } else if (modelId === 'defects') {
    filterText = `Period: ${filters.dateFrom || 'Start'} to ${filters.dateTo || 'Present'} | Disposition: ${filters.defectAction === 'all' ? 'All Incidents' : (filters.defectAction || 'All Incidents')} | Commodity: ${filters.commodityName || 'All Commodities'}`;
  } else {
    filterText = `Commodity: ${filters.commodityName || 'All Commodities'} | Snapshot Date: ${new Date().toLocaleDateString()}`;
  }

  let tableHeader = '';
  let tableRows = '';
  let summaryRow = '';

  if (modelId === 'batches' || modelId === 'fefo') {
    tableHeader = `
      <tr>
        <th style="width:36px;text-align:center;">#</th>
        <th>Batch Code</th>
        <th>Commodity</th>
        <th>Supplier / Source</th>
        <th>Delivered</th>
        <th>Expires</th>
        <th style="text-align:center;">Days Left</th>
        <th style="text-align:center;">Status</th>
        <th style="text-align:right;">Qty On Hand</th>
      </tr>
    `;
    let totalUnits = 0;
    data.forEach((b, idx) => {
      const status = b.expiry_status || getExpirationStatus(b.expiration_date);
      const daysLeft = b.days_left !== undefined ? b.days_left : getDaysRemaining(b.expiration_date);
      const daysStr = daysLeft === null || daysLeft === undefined ? 'N/A' : (daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d`);
      totalUnits += Number(b.quantity || 0);

      tableRows += `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td style="font-family:monospace;font-weight:bold;">${_esc(b.batch_number)}</td>
          <td><strong>${_esc(b.commodities?.name)}</strong> <span style="color:#555;font-size:9.5px;">(${_esc(b.commodities?.commodity_code)})</span></td>
          <td>${_esc(b.supplier || 'Not specified')}</td>
          <td>${_fmtShortDate(b.delivery_date)}</td>
          <td>${_fmtShortDate(b.expiration_date)}</td>
          <td style="text-align:center;">${daysStr}</td>
          <td style="text-align:center;font-weight:bold;">${_esc(status)}</td>
          <td style="text-align:right;"><strong>${Number(b.quantity || 0).toLocaleString()}</strong> ${_esc(b.commodities?.unit || '')}</td>
        </tr>
      `;
    });
    summaryRow = `
      <tr class="summary-row">
        <td colspan="8" style="text-align:right;font-weight:bold;">TOTAL ACTIVE BATCHES: ${data.length} &nbsp;|&nbsp; GRAND TOTAL UNITS ON HAND:</td>
        <td style="text-align:right;font-weight:bold;">${totalUnits.toLocaleString()} Units</td>
      </tr>
    `;
  }
  else if (modelId === 'distribution') {
    tableHeader = `
      <tr>
        <th style="width:36px;text-align:center;">#</th>
        <th>Date Released</th>
        <th>Destination Barangay</th>
        <th>Recipient</th>
        <th>Commodity</th>
        <th>Batch Code</th>
        <th>Supplier</th>
        <th style="text-align:right;">Qty Released</th>
        <th>Released By</th>
      </tr>
    `;
    let totalReleased = 0;
    data.forEach((r, idx) => {
      totalReleased += Number(r.quantity || 0);
      const qty = `${Number(r.quantity || 0).toLocaleString()} ${_esc(r.batches?.commodities?.unit || '')}`;
      tableRows += `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td>${_fmtShortDate(r.released_at)}</td>
          <td><strong>${_esc(r.barangay)}</strong></td>
          <td>${_esc(r.recipient_name || '—')}</td>
          <td>${_esc(r.batches?.commodities?.name)}</td>
          <td style="font-family:monospace;font-weight:bold;">${_esc(r.batches?.batch_number)}</td>
          <td>${_esc(r.batches?.supplier || '—')}</td>
          <td style="text-align:right;"><strong>${qty}</strong></td>
          <td>${_esc(r.released_by_name)}</td>
        </tr>
      `;
    });
    summaryRow = `
      <tr class="summary-row">
        <td colspan="7" style="text-align:right;font-weight:bold;">TOTAL RELEASES: ${data.length} &nbsp;|&nbsp; GRAND TOTAL UNITS RELEASED:</td>
        <td style="text-align:right;font-weight:bold;">${totalReleased.toLocaleString()} Units</td>
        <td></td>
      </tr>
    `;
  }
  else if (modelId === 'allocation') {
    tableHeader = `
      <tr>
        <th style="width:36px;text-align:center;">#</th>
        <th>SKU Code</th>
        <th>Commodity Name</th>
        <th>Category</th>
        <th style="text-align:center;">Active Batches</th>
        <th style="text-align:center;">Near-Expiry / Expired</th>
        <th style="text-align:right;">Total Stock On Hand</th>
        <th style="text-align:right;">Total Released to Date</th>
        <th>Earliest Expiry Date</th>
      </tr>
    `;
    let grandOnHand = 0;
    let grandReleased = 0;
    let grandBatches = 0;
    data.forEach((row, idx) => {
      grandOnHand += Number(row.totalQuantity || 0);
      grandReleased += Number(row.totalReleased || 0);
      grandBatches += Number(row.batchCount || 0);
      const unit = _esc(row.commodity?.unit || '');
      tableRows += `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td style="font-family:monospace;font-weight:bold;">${_esc(row.commodity?.commodity_code)}</td>
          <td><strong>${_esc(row.commodity?.name)}</strong></td>
          <td>${_esc(row.commodity?.category || '—')}</td>
          <td style="text-align:center;">${row.batchCount}</td>
          <td style="text-align:center;">${row.nearExpiryCount || 0}</td>
          <td style="text-align:right;"><strong>${Number(row.totalQuantity || 0).toLocaleString()}</strong> ${unit}</td>
          <td style="text-align:right;">${Number(row.totalReleased || 0).toLocaleString()} ${unit}</td>
          <td>${_fmtShortDate(row.oldestExpiry)}</td>
        </tr>
      `;
    });
    summaryRow = `
      <tr class="summary-row">
        <td colspan="4" style="text-align:right;font-weight:bold;">TOTAL COMMODITIES: ${data.length}</td>
        <td style="text-align:center;font-weight:bold;">${grandBatches}</td>
        <td></td>
        <td style="text-align:right;font-weight:bold;">${grandOnHand.toLocaleString()} Units</td>
        <td style="text-align:right;font-weight:bold;">${grandReleased.toLocaleString()} Units</td>
        <td></td>
      </tr>
    `;
  }
  else if (modelId === 'defects') {
    tableHeader = `
      <tr>
        <th style="width:36px;text-align:center;">#</th>
        <th>Date Reported</th>
        <th>Batch Code</th>
        <th>Commodity</th>
        <th>Classification / Defect</th>
        <th>Disposition Action</th>
        <th style="text-align:right;">Qty Affected</th>
        <th>Reported By</th>
        <th>Remarks</th>
      </tr>
    `;
    let totalAffected = 0;
    data.forEach((item, idx) => {
      totalAffected += Number(item.quantity_affected || 0);
      const unit = _esc(item.batches?.commodities?.unit || '');
      tableRows += `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td>${_fmtShortDate(item.reported_at)}</td>
          <td style="font-family:monospace;font-weight:bold;">${_esc(item.batches?.batch_number)}</td>
          <td><strong>${_esc(item.batches?.commodities?.name)}</strong></td>
          <td>${_esc(item.classification)}</td>
          <td><strong>${_esc(item.action_taken)}</strong></td>
          <td style="text-align:right;"><strong>${Number(item.quantity_affected || 0).toLocaleString()}</strong> ${unit}</td>
          <td>${_esc(item.reported_by_name)}</td>
          <td>${_esc(item.remarks || '—')}</td>
        </tr>
      `;
    });
    summaryRow = `
      <tr class="summary-row">
        <td colspan="6" style="text-align:right;font-weight:bold;">TOTAL INCIDENTS: ${data.length} &nbsp;|&nbsp; TOTAL UNITS AFFECTED:</td>
        <td style="text-align:right;font-weight:bold;">${totalAffected.toLocaleString()} Units</td>
        <td colspan="2"></td>
      </tr>
    `;
  }

  if (data.length === 0) {
    tableRows = `<tr><td colspan="9" style="text-align:center; padding: 20px;">No data found for the selected filters.</td></tr>`;
    summaryRow = '';
  }

  const fileTitle = buildReportFileName(modelId, filters, 'PDF').replace(/\.pdf$/i, '');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${fileTitle}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 10mm 15mm;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
          color: #111;
          margin: 0;
          padding: 24px 32px;
          font-size: 11px;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 10px; margin-bottom: 16px; }
        .header .agency-line { margin: 1px 0; font-size: 10.5px; color: #444; }
        .header h1 { margin: 4px 0 6px; font-size: 14px; font-weight: bold; color: #111; text-transform: uppercase; letter-spacing: 0.5px; }
        .header h2 { margin: 6px 0 0; font-size: 13px; font-weight: bold; color: #111; text-transform: uppercase; letter-spacing: 0.5px; }
        .meta { display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 10px; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th, td { border: 1px solid #444; padding: 6px 9px; text-align: left; font-size: 10.5px; }
        th { background-color: #f0f0f0 !important; color: #000; font-weight: bold; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.3px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .summary-row td { background-color: #f8fafc !important; border-top: 2px solid #222; font-size: 10.5px; }
        .signature { margin-top: 36px; display: flex; justify-content: space-between; page-break-inside: avoid; }
        .sig-block { text-align: center; width: 220px; }
        .sig-role { text-align: left; font-size: 10px; color: #333; margin-bottom: 30px; }
        .sig-line { border-top: 1px solid #222; padding-top: 4px; font-size: 10px; text-transform: uppercase; }
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
        <h1>Municipal Nutrition Action Office</h1>
        <h2>${_esc(title)}</h2>
      </div>
      
      <div class="meta">
        <div><strong>PARAMETERS:</strong> ${_esc(filterText)}</div>
        <div><strong>DATE GENERATED:</strong> ${_esc(generatedDate)}</div>
      </div>

      <table>
        <thead>${tableHeader}</thead>
        <tbody>
          ${tableRows}
          ${summaryRow}
        </tbody>
      </table>

      <div class="signature">
        <div class="sig-block">
          <div class="sig-role">Prepared by:</div>
          <div class="sig-line">
            <strong>${_esc(userName.toUpperCase())}</strong><br>
            <span class="sig-title">Nutrition Logistics Personnel</span>
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
    </html>
  `;
}

/**
 * Shows the Print Preview Modal and handles actual printing
 */
export function showPrintPreview(title, data, modelId, filters, profile, onConfirm) {
  const fileTitle = buildReportFileName(modelId, filters, 'PDF').replace(/\.pdf$/i, '');

  const originalTitle = document.title;
  document.title = fileTitle;

  const htmlContent = generateReportHTML(title, data, modelId, filters, profile);

  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.backgroundColor = 'rgba(0,0,0,0.6)';
  overlay.style.zIndex = '9999';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.padding = '20px';
  overlay.style.backdropFilter = 'blur(4px)';

  const card = document.createElement('div');
  card.style.background = '#fff';
  card.style.width = '90%';
  card.style.maxWidth = '1050px';
  card.style.height = '90%';
  card.style.borderRadius = '12px';
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.boxShadow = '0 10px 40px rgba(0,0,0,0.2)';
  card.style.overflow = 'hidden';

  const toolbar = document.createElement('div');
  toolbar.style.padding = '16px 24px';
  toolbar.style.background = '#f8faf9';
  toolbar.style.borderBottom = '1px solid #e2e8f0';
  toolbar.style.display = 'flex';
  toolbar.style.justifyContent = 'space-between';
  toolbar.style.alignItems = 'center';

  const titleEl = document.createElement('h3');
  titleEl.textContent = `Print Preview — ${title}`;
  titleEl.style.margin = '0';
  titleEl.style.fontSize = '17px';
  titleEl.style.color = '#1e293b';

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '12px';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Cancel';
  closeBtn.className = 'btn btn-ghost';
  
  const printBtn = document.createElement('button');
  printBtn.innerHTML = '<span class="icon" style="font-size:18px; margin-right:6px;">print</span> Print / Save PDF';
  printBtn.className = 'btn btn-primary';

  actions.appendChild(closeBtn);
  actions.appendChild(printBtn);
  toolbar.appendChild(titleEl);
  toolbar.appendChild(actions);

  const iframeContainer = document.createElement('div');
  iframeContainer.style.flex = '1';
  iframeContainer.style.background = '#cbd5e1';
  iframeContainer.style.padding = '24px';
  iframeContainer.style.display = 'flex';
  iframeContainer.style.justifyContent = 'center';
  iframeContainer.style.overflow = 'auto';

  const iframe = document.createElement('iframe');
  iframe.style.width = '100%';
  iframe.style.maxWidth = '11in';
  iframe.style.height = '100%';
  iframe.style.background = '#fff';
  iframe.style.border = 'none';
  iframe.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';

  iframeContainer.appendChild(iframe);
  card.appendChild(toolbar);
  card.appendChild(iframeContainer);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlContent);
  doc.close();

  const cleanup = () => {
    document.title = originalTitle;
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
  };

  closeBtn.onclick = cleanup;
  printBtn.onclick = () => {
    document.title = fileTitle;
    try {
      if (iframe.contentDocument) iframe.contentDocument.title = fileTitle;
    } catch (e) {}

    iframe.contentWindow.focus();
    iframe.contentWindow.print();

    const restore = () => { document.title = originalTitle; };
    window.addEventListener('afterprint', restore, { once: true });
    setTimeout(restore, 3000);

    if (typeof onConfirm === 'function') onConfirm();
  };
}
