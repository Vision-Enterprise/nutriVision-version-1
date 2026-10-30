/**
 * Shared Print Utility for NutriVision Reports.
 *
 * Mounts the report HTML into a top-level print container (#nv-print-area)
 * and invokes window.print() from the main frame.
 *
 * This ensures Chromium/WebView2 uses the top-level document.title
 * as the print job title (DOCINFO.lpszDocName), which pre-fills the
 * "File name:" field in the Windows "Save Print Output As" dialog.
 */
export function printReportHtml(fileTitle, htmlContent) {
  const cleanTitle = (fileTitle || 'NutriVision_Report').replace(/\.pdf$/i, '');
  document.title = cleanTitle;

  let printArea = document.getElementById('nv-print-area');
  if (!printArea) {
    printArea = document.createElement('div');
    printArea.id = 'nv-print-area';
    document.body.appendChild(printArea);
  }

  printArea.innerHTML = htmlContent;

  const cleanupPrintArea = () => {
    window.removeEventListener('afterprint', cleanupPrintArea);
    if (printArea) {
      printArea.innerHTML = '';
    }
  };

  window.addEventListener('afterprint', cleanupPrintArea);

  requestAnimationFrame(() => {
    window.focus();
    try {
      window.print();
    } catch (err) {
      console.error('Print invocation failed:', err);
    }

    // Fallback cleanup in case afterprint does not fire
    setTimeout(() => {
      cleanupPrintArea();
    }, 2500);
  });
}

