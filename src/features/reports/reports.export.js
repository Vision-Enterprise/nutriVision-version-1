import { SystemDialog } from '../../shared/components/dialog.component.js';
import { getLocalDateString, getExpirationStatus, getDaysRemaining } from '../../shared/utils/date.utils.js';

/**
 * Builds the exact download filename (.pdf or .csv) for any report configuration.
 */
export function buildReportFileName(modelId, filters = {}, format = 'PDF', customDateStr = null) {
  let datePart = customDateStr;
  if (!datePart) {
    datePart = getLocalDateString();
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const parsed = new Date(datePart);
    datePart = !isNaN(parsed.getTime()) ? getLocalDateString(parsed) : getLocalDateString();
  }

  const ext = String(format || 'PDF').toUpperCase() === 'CSV' ? 'csv' : 'pdf';
  const commPart = filters?.commodityName && filters.commodityName !== 'All Commodities'
    ? `_${filters.commodityName.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24)}`
    : '';

  if (modelId === 'batches' || modelId === 'fefo') {
    const isFefoRisk = modelId === 'fefo' || filters?.expiryStatus === 'fefo_risk';
    const base = isFefoRisk ? 'MNAO_FEFO_Expiry_Risk_Report' : 'MNAO_Batch_Inventory_Report';
    return `${base}${commPart}_${datePart}.${ext}`;
  }

  if (modelId === 'distribution') {
    const brgyPart = filters?.barangay && filters.barangay !== 'all'
      ? `_${filters.barangay.replace(/[^a-zA-Z0-9]+/g, '_')}`
      : '';
    return `MNAO_Distribution_Report${brgyPart}${commPart}_${datePart}.${ext}`;
  }

  if (modelId === 'allocation') {
    return `MNAO_Commodity_Stock_Summary${commPart}_${datePart}.${ext}`;
  }

  if (modelId === 'defects') {
    return `MNAO_Defect_Wastage_Report${commPart}_${datePart}.${ext}`;
  }

  return `MNAO_Report_${datePart}.${ext}`;
}

function _csvSafe(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/\r?\n/g, ' ').trim();
  const escaped = str.replace(/"/g, '""');
  // Wrap dates, times, or hyphenated codes in ="..." so Excel never renders ########
  if (/^\d{4}-\d{2}-\d{2}/.test(str) || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(str) || /^[A-Z0-9]+-[A-Z0-9-]+$/i.test(str)) {
    return `="${escaped}"`;
  }
  return `"${escaped}"`;
}

function _fmtDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toISOString().split('T')[0];
}

/**
 * Converts JSON data array to CSV format and triggers download.
 */
export function exportToCSV(data, modelId, filters = {}) {
  if (!data || !data.length) {
    SystemDialog.alert('No data available to export.', 'Export Failed');
    return;
  }

  let csvContent = '';
  const filename = buildReportFileName(modelId, filters, 'CSV');

  if (modelId === 'batches' || modelId === 'fefo') {
    csvContent += 'Batch Code,Commodity,SKU,Category,Supplier / Source,Delivery Date,Expiration Date,Days Remaining,Expiry Status,Quantity On Hand,Unit\n';

    let totalUnits = 0;
    data.forEach(b => {
      const status = b.expiry_status || getExpirationStatus(b.expiration_date);
      const daysLeft = b.days_left !== undefined ? b.days_left : getDaysRemaining(b.expiration_date);
      totalUnits += Number(b.quantity || 0);

      csvContent += [
        _csvSafe(b.batch_number),
        _csvSafe(b.commodities?.name || ''),
        _csvSafe(b.commodities?.commodity_code || ''),
        _csvSafe(b.commodities?.category || ''),
        _csvSafe(b.supplier || 'Not specified'),
        _csvSafe(_fmtDate(b.delivery_date)),
        _csvSafe(_fmtDate(b.expiration_date)),
        daysLeft !== null && daysLeft !== undefined ? daysLeft : 'N/A',
        _csvSafe(status),
        Number(b.quantity || 0),
        _csvSafe(b.commodities?.unit || '')
      ].join(',') + '\n';
    });

    csvContent += `"TOTAL (${data.length} Batches)",,,,,,,,,${totalUnits},""\n`;
  }
  else if (modelId === 'distribution') {
    csvContent += 'Date Released,Destination Barangay,Recipient,Commodity,SKU,Batch Code,Supplier / Source,Quantity Released,Unit,Released By,Notes\n';

    let totalReleased = 0;
    data.forEach(r => {
      totalReleased += Number(r.quantity || 0);
      csvContent += [
        _csvSafe(_fmtDate(r.released_at)),
        _csvSafe(r.barangay || ''),
        _csvSafe(r.recipient_name || ''),
        _csvSafe(r.batches?.commodities?.name || ''),
        _csvSafe(r.batches?.commodities?.commodity_code || ''),
        _csvSafe(r.batches?.batch_number || ''),
        _csvSafe(r.batches?.supplier || 'Not specified'),
        Number(r.quantity || 0),
        _csvSafe(r.batches?.commodities?.unit || ''),
        _csvSafe(r.released_by_name || 'Staff'),
        _csvSafe(r.notes || '')
      ].join(',') + '\n';
    });

    csvContent += `"TOTAL (${data.length} Releases)",,,,,,,${totalReleased},"","",""\n`;
  }
  else if (modelId === 'allocation') {
    csvContent += 'Commodity Code (SKU),Commodity Name,Category,Unit,Active Batches,Near-Expiry / Expired Batches,Total Stock On Hand,Total Released to Date,Earliest Expiry Date\n';

    let grandOnHand = 0;
    let grandReleased = 0;
    let grandBatches = 0;

    data.forEach(row => {
      grandOnHand += Number(row.totalQuantity || 0);
      grandReleased += Number(row.totalReleased || 0);
      grandBatches += Number(row.batchCount || 0);

      csvContent += [
        _csvSafe(row.commodity?.commodity_code || ''),
        _csvSafe(row.commodity?.name || ''),
        _csvSafe(row.commodity?.category || ''),
        _csvSafe(row.commodity?.unit || ''),
        Number(row.batchCount || 0),
        Number(row.nearExpiryCount || 0),
        Number(row.totalQuantity || 0),
        Number(row.totalReleased || 0),
        _csvSafe(row.oldestExpiry ? _fmtDate(row.oldestExpiry) : 'N/A')
      ].join(',') + '\n';
    });

    csvContent += `"TOTAL (${data.length} Commodities)",,,,${grandBatches},,${grandOnHand},${grandReleased},""\n`;
  }
  else if (modelId === 'defects') {
    csvContent += 'Date Reported,Batch Code,Commodity,SKU,Classification / Defect,Disposition Action,Quantity Affected,Unit,Reported By,Remarks\n';

    let totalAffected = 0;
    data.forEach(item => {
      totalAffected += Number(item.quantity_affected || 0);
      csvContent += [
        _csvSafe(_fmtDate(item.reported_at)),
        _csvSafe(item.batches?.batch_number || ''),
        _csvSafe(item.batches?.commodities?.name || ''),
        _csvSafe(item.batches?.commodities?.commodity_code || ''),
        _csvSafe(item.classification || ''),
        _csvSafe(item.action_taken || ''),
        Number(item.quantity_affected || 0),
        _csvSafe(item.batches?.commodities?.unit || ''),
        _csvSafe(item.reported_by_name || 'Staff'),
        _csvSafe(item.remarks || '')
      ].join(',') + '\n';
    });

    csvContent += `"TOTAL (${data.length} Incidents)",,,,,,${totalAffected},"","",""\n`;
  }

  // Trigger download (with UTF-8 BOM for Excel)
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
