/**
 * Converts JSON data array to CSV format and triggers download.
 */
export function exportToCSV(data, modelId, filters) {
  if (!data || !data.length) {
    alert('No data available to export.');
    return;
  }

  let csvContent = '';
  let filename = 'NutriVision_Report.csv';
  const today = new Date().toISOString().split('T')[0];

  if (modelId === 'distribution') {
    filename = `Distribution_Ledger_${today}.csv`;
    csvContent += 'Date Released,Barangay,Recipient,Commodity,Batch Code,Quantity,Unit,Released By\n';
    
    data.forEach(r => {
      const date = new Date(r.released_at).toLocaleDateString();
      const brgy = `"${r.barangay}"`;
      const recip = `"${r.recipient_name}"`;
      const comm = `"${r.batches?.commodities?.name}"`;
      const batch = `"${r.batches?.batch_number}"`;
      const qty = r.quantity;
      const unit = r.batches?.commodities?.unit || '';
      const by = `"${r.released_by_name}"`;
      
      csvContent += `${date},${brgy},${recip},${comm},${batch},${qty},${unit},${by}\n`;
    });
  } 
  else if (modelId === 'fefo') {
    filename = `FEFO_Wastage_Risk_${today}.csv`;
    csvContent += 'Commodity,Batch Code,Quantity Remaining,Expiry Date,Days Left\n';
    
    data.forEach(b => {
      const comm = `"${b.commodities?.name}"`;
      const batch = `"${b.batch_number}"`;
      const qty = b.quantity;
      const expDate = b.expiration_date ? new Date(b.expiration_date).toLocaleDateString() : 'N/A';
      
      let daysLeft = 'N/A';
      if (b.expiration_date) {
        const diff = new Date(b.expiration_date) - new Date();
        daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
      }
      
      csvContent += `${comm},${batch},${qty},${expDate},${daysLeft}\n`;
    });
  }
  else if (modelId === 'allocation') {
    filename = `Allocation_Balances_${today}.csv`;
    csvContent += 'Commodity,Total Units on Hand,Active Batches,Oldest Expiry Date\n';
    
    data.forEach(row => {
      const comm = `"${row.commodity.name}"`;
      const qty = row.totalQuantity;
      const batches = row.batchCount;
      const oldest = row.oldestExpiry ? new Date(row.oldestExpiry).toLocaleDateString() : 'N/A';
      
      csvContent += `${comm},${qty},${batches},${oldest}\n`;
    });
  }

  // Trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
