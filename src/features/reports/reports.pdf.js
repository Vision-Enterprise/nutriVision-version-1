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

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 20px; font-size: 12px; }
        .header { text-align: center; border-bottom: 2px solid #1B7A3E; padding-bottom: 10px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 20px; color: #1B7A3E; }
        .header h2 { margin: 5px 0 0 0; font-size: 14px; color: #555; }
        .meta { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 11px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
        th { background-color: #f5f5f5; color: #333; font-weight: bold; }
        .footer { text-align: center; margin-top: 40px; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 10px; }
        .signature { margin-top: 50px; display: flex; justify-content: space-between; }
        .sig-line { width: 200px; border-top: 1px solid #333; text-align: center; padding-top: 5px; }
        @media print {
          body { padding: 0; }
          @page { margin: 1cm; size: landscape; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Municipal Nutrition Action Office</h1>
        <h2>Manolo Fortich, Bukidnon</h2>
        <h3>${title}</h3>
      </div>
      
      <div class="meta">
        <div><strong>Parameters:</strong> ${filterText}</div>
        <div><strong>Generated:</strong> ${generatedDate}</div>
      </div>

      <table>
        <thead>${tableHeader}</thead>
        <tbody>${tableRows}</tbody>
      </table>

      <div class="signature">
        <div class="sig-line">
          Prepared By:<br><strong>${userName}</strong>
        </div>
        <div class="sig-line">
          Noted By:<br><strong>MNAO Officer</strong>
        </div>
      </div>

      <div class="footer">
        Generated by NutriVision System | Official LGU Operational Data
      </div>
    </body>
    </html>
  `;
}

/**
 * Shows the Print Preview Modal and handles actual printing
 */
export function showPrintPreview(title, data, modelId, filters, profile, onConfirm) {
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
  closeBtn.onclick = () => document.body.removeChild(overlay);
  printBtn.onclick = () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    // Only save to archive after user confirms print — not on modal open
    if (typeof onConfirm === 'function') onConfirm();
  };
}
