/**
 * Milk Bank — Official Intake Sheet Print Preview
 * Generates official Form MH.MNAO.FM.002.00 (LOG OF MILK RECEIVED)
 * Formatted precisely for A4 Landscape print/PDF export.
 */

export function showMilkIntakePrintPreview(donations = []) {
  const dateStr = new Date().toISOString().split('T')[0];
  const pdfTitle = `LOG_OF_MILK_RECEIVED_FM_002_00_${dateStr}`;
  const originalTitle = document.title;
  document.title = pdfTitle;

  const html = generateMilkIntakeReportHTML(donations);

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
          Print Preview — Form MH.MNAO.FM.002.00 (LOG OF MILK RECEIVED)
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
  iframeDoc.write(html);
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

function generateMilkIntakeReportHTML(donations = []) {
  // Ensure at least 15 rows for authentic look like paper form
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
      <style>
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
          margin-bottom: 12px;
          border-bottom: 1.5px solid #000;
          padding-bottom: 8px;
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
          font-size: 14px;
          font-weight: bold;
          text-decoration: underline;
          margin: 12px 0 8px 0;
        }
        table.intake-grid {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }
        table.intake-grid th, table.intake-grid td {
          border: 1px solid #000;
          padding: 4px 5px;
          height: 24px;
        }
        table.intake-grid th {
          background-color: #f1f5f9;
          font-weight: bold;
          text-align: center;
          vertical-align: middle;
        }
        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 32px;
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
          height: 35px;
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
      </style>
    </head>
    <body>
      <div class="header">
        <h3>Province of Bukidnon</h3>
        <h2>Municipality of Manolo Fortich</h2>
        <h4>Municipal Nutrition Action Office</h4>
        <div class="header-meta">
          lgumanolofortich@yahoo.com &bull; manolofortich.com.ph &bull; 0917 729 3453
        </div>
      </div>

      <div class="form-title">LOG OF MILK RECEIVED</div>

      <table class="intake-grid">
        <thead>
          <tr>
            <th rowspan="2" style="width: 25px;">#</th>
            <th rowspan="2" style="width: 110px;">Donor name</th>
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

      <div class="signatures">
        <div class="sig-block">
          <div style="text-align: left; margin-bottom: 2px;">Endorsed by:</div>
          <div class="sig-line"></div>
          <strong>Municipal Nutrition Action Officer</strong>
        </div>

        <div class="sig-block">
          <div style="text-align: left; margin-bottom: 2px;">Noted by:</div>
          <div class="sig-line"></div>
          <strong>Rural Health Physician</strong>
        </div>
      </div>

      <div class="form-code">MH.MNAO.FM.002.00</div>
    </body>
    </html>
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
