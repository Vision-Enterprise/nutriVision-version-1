/**
 * Generates the HTML string for the printable report.
 */
function generateReportHTML(title, data, modelId, filters, profile) {
  const generatedDate = new Date().toLocaleString();
  const userName = profile?.full_name || 'Authorized Staff';

  let filterText = '';
  if (modelId === 'distribution') {
    filterText = `Date: ${filters.dateFrom || 'Any'} to ${filters.dateTo || 'Any'} | Commodity: ${filters.commodityName || 'All'} | Barangay: ${filters.barangay || 'All'}`;
  } else if (modelId === 'fefo') {
    filterText = `Threshold: ≤ ${filters.thresholdDays || 90} days | Commodity: ${filters.commodityName || 'All'}`;
  } else {
    filterText = `Commodity: ${filters.commodityName || 'All'} | As of: ${new Date().toLocaleDateString()}`;
  }

  let tableHeader = '';
  let tableRows = '';

  if (modelId === 'distribution') {
    tableHeader = `
      <tr>
        <th>Date</th>
        <th>Barangay</th>
        <th>Recipient</th>
        <th>Commodity</th>
        <th>Batch Code</th>
        <th style="text-align:right">Qty</th>
        <th>Released By</th>
      </tr>
    `;
    data.forEach(r => {
      const date = new Date(r.released_at).toLocaleDateString();
      const qty = `${r.quantity} ${r.batches?.commodities?.unit || ''}`;
      tableRows += `
        <tr>
          <td>${date}</td>
          <td>${r.barangay}</td>
          <td>${r.recipient_name}</td>
          <td>${r.batches?.commodities?.name}</td>
          <td>${r.batches?.batch_number}</td>
          <td style="text-align:right"><strong>${qty}</strong></td>
          <td>${r.released_by_name}</td>
        </tr>
      `;
    });
  } 
  else if (modelId === 'fefo') {
    tableHeader = `
      <tr>
        <th>Commodity</th>
        <th>Batch Code</th>
        <th style="text-align:right">Qty Remaining</th>
        <th>Expiry Date</th>
        <th style="text-align:right">Days Left</th>
      </tr>
    `;
    data.forEach(b => {
      const date = b.expiration_date ? new Date(b.expiration_date).toLocaleDateString() : 'N/A';
      let daysLeft = 'N/A';
      if (b.expiration_date) {
        const diff = new Date(b.expiration_date) - new Date();
        daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
      }
      tableRows += `
        <tr>
          <td>${b.commodities?.name}</td>
          <td>${b.batch_number}</td>
          <td style="text-align:right"><strong>${b.quantity}</strong> ${b.commodities?.unit || ''}</td>
          <td>${date}</td>
          <td style="text-align:right">${daysLeft}</td>
        </tr>
      `;
    });
  }
  else if (modelId === 'allocation') {
    tableHeader = `
      <tr>
        <th>Commodity</th>
        <th style="text-align:right">Total On Hand</th>
        <th style="text-align:right">Active Batches</th>
        <th>Oldest Expiry Date</th>
      </tr>
    `;
    data.forEach(row => {
      const oldest = row.oldestExpiry ? new Date(row.oldestExpiry).toLocaleDateString() : 'N/A';
      tableRows += `
        <tr>
          <td><strong>${row.commodity.name}</strong></td>
          <td style="text-align:right"><strong>${row.totalQuantity}</strong> ${row.commodity.unit || ''}</td>
          <td style="text-align:right">${row.batchCount}</td>
          <td>${oldest}</td>
        </tr>
      `;
    });
  }

  if (data.length === 0) {
    tableRows = `<tr><td colspan="7" style="text-align:center; padding: 20px;">No data found for the selected filters.</td></tr>`;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  let fileTitle = 'NutriVision_Report';
  if (modelId === 'distribution') {
    const brgySuffix = filters?.barangay && filters.barangay !== 'all' ? `_${filters.barangay.replace(/\s+/g, '_')}` : '';
    fileTitle = `NutriVision_Distribution_Report${brgySuffix}_${todayStr}`;
  } else if (modelId === 'fefo') {
    fileTitle = `NutriVision_FEFO_Wastage_Risk_${todayStr}`;
  } else if (modelId === 'allocation') {
    fileTitle = `NutriVision_Allocation_Balances_${todayStr}`;
  } else {
    fileTitle = `NutriVision_${(title || 'Report').replace(/[^a-zA-Z0-9_-]/g, '_')}_${todayStr}`;
  }

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
        th, td { border: 1px solid #444; padding: 7px 10px; text-align: left; font-size: 10.5px; }
        th { background-color: #f0f0f0 !important; color: #000; font-weight: bold; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.3px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
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
        <h2>${title}</h2>
      </div>
      
      <div class="meta">
        <div><strong>PARAMETERS:</strong> ${filterText}</div>
        <div><strong>DATE GENERATED:</strong> ${generatedDate}</div>
      </div>

      <table>
        <thead>${tableHeader}</thead>
        <tbody>${tableRows}</tbody>
      </table>

      <div class="signature">
        <div class="sig-block">
          <div class="sig-role">Prepared by:</div>
          <div class="sig-line">
            <strong>${userName.toUpperCase()}</strong><br>
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
  const todayStr = new Date().toISOString().split('T')[0];
  let fileTitle = 'NutriVision_Report';
  if (modelId === 'distribution') {
    const brgySuffix = filters?.barangay && filters.barangay !== 'all' ? `_${filters.barangay.replace(/\s+/g, '_')}` : '';
    fileTitle = `NutriVision_Distribution_Report${brgySuffix}_${todayStr}`;
  } else if (modelId === 'fefo') {
    fileTitle = `NutriVision_FEFO_Wastage_Risk_${todayStr}`;
  } else if (modelId === 'allocation') {
    fileTitle = `NutriVision_Allocation_Balances_${todayStr}`;
  } else {
    fileTitle = `NutriVision_${(title || 'Report').replace(/[^a-zA-Z0-9_-]/g, '_')}_${todayStr}`;
  }

  const originalTitle = document.title;
  document.title = fileTitle;

  // 1. Generate HTML
  const htmlContent = generateReportHTML(title, data, modelId, filters, profile);

  // 2. Create Modal Overlay
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

  // 3. Create Modal Card
  const card = document.createElement('div');
  card.style.background = '#fff';
  card.style.width = '90%';
  card.style.maxWidth = '1000px';
  card.style.height = '90%';
  card.style.borderRadius = '12px';
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.boxShadow = '0 10px 40px rgba(0,0,0,0.2)';
  card.style.overflow = 'hidden';

  // 4. Create Toolbar
  const toolbar = document.createElement('div');
  toolbar.style.padding = '16px 24px';
  toolbar.style.background = '#f8faf9';
  toolbar.style.borderBottom = '1px solid #e2e8f0';
  toolbar.style.display = 'flex';
  toolbar.style.justifyContent = 'space-between';
  toolbar.style.alignItems = 'center';

  const titleEl = document.createElement('h3');
  titleEl.textContent = 'Print Preview';
  titleEl.style.margin = '0';
  titleEl.style.fontSize = '18px';
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

  // 5. Create iframe for preview
  const iframeContainer = document.createElement('div');
  iframeContainer.style.flex = '1';
  iframeContainer.style.background = '#cbd5e1';
  iframeContainer.style.padding = '24px';
  iframeContainer.style.display = 'flex';
  iframeContainer.style.justifyContent = 'center';
  iframeContainer.style.overflow = 'auto';

  const iframe = document.createElement('iframe');
  iframe.style.width = '100%';
  iframe.style.maxWidth = '11in'; // standard landscape width
  iframe.style.height = '100%';
  iframe.style.background = '#fff';
  iframe.style.border = 'none';
  iframe.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';

  iframeContainer.appendChild(iframe);
  card.appendChild(toolbar);
  card.appendChild(iframeContainer);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // 6. Write HTML to iframe
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlContent);
  doc.close();

  // 7. Event Listeners
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

    // Only save to archive after user confirms print — not on modal open
    if (typeof onConfirm === 'function') onConfirm();
  };
}
