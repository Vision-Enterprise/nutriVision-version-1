/**
 * Shared Print & PDF Utilities for NutriVision
 */

/**
 * Prepares the report for physical/browser printing.
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

    setTimeout(() => {
      cleanupPrintArea();
    }, 2500);
  });
}

/**
 * Generates and downloads a genuine PDF file with the suggested filename pre-filled.
 * In desktop app (WebView2), this triggers a Save As dialog with the filename already typed in.
 * In Vercel (web), this directly downloads the PDF to the user's downloads folder.
 */
export async function downloadReportPdf(fileTitle, htmlContent, orientation = 'landscape') {
  const cleanName = (fileTitle || 'NutriVision_Report').replace(/\.pdf$/i, '') + '.pdf';
  document.title = cleanName.replace(/\.pdf$/i, '');

  if (typeof window.html2pdf !== 'function') {
    // If html2pdf bundle is not loaded for some reason, fallback to print
    printReportHtml(cleanName, htmlContent);
    return;
  }

  // Create temporary container for rendering
  const container = document.createElement('div');
  container.id = 'nv-pdf-render-temp';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = orientation === 'landscape' ? '1122px' : '794px';
  container.style.margin = '0';
  container.style.padding = '0';
  container.style.background = '#ffffff';
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    const opt = {
      margin: orientation === 'landscape' ? [6, 8, 6, 8] : [8, 8, 8, 8],
      filename: cleanName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: orientation }
    };

    await window.html2pdf().set(opt).from(container).save();
  } catch (err) {
    console.error('downloadReportPdf error:', err);
    // Graceful fallback to print if canvas fails
    printReportHtml(cleanName, htmlContent);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
