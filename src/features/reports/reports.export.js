import { SystemDialog } from '../../shared/components/dialog.component.js';
import { getLocalDateString, getExpirationStatus, getDaysRemaining } from '../../shared/utils/date.utils.js';

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
  let filename = 'NutriVision_Report.csv';
  const today = getLocalDateString();

  if (modelId === 'batches' || modelId === 'fefo') {
    filename = `MNAO_Batch_Inventory_Report_${today}.csv`;
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
    filename = `MNAO_Distribution_Report_${today}.csv`;
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
    filename = `MNAO_Commodity_Stock_Summary_${today}.csv`;
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
    filename = `MNAO_Defect_Wastage_Report_${today}.csv`;
    csvContent += 'Date Reported,Batch Code,Commodity,SKU,Classification / Issue,Disposition Action,Quantity Affected,Unit,Reported By,Remarks\n';

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
