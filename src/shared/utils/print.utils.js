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

  // Parse full HTML document cleanly so <head> styles apply only to the PDF container
  const parser = new DOMParser();
  const parsedDoc = parser.parseFromString(htmlContent || '', 'text/html');
  const rawStyles = Array.from(parsedDoc.querySelectorAll('style'))
    .map(s => s.textContent || '')
    .join('\n');
  const scopedStyles = rawStyles
    .replace(/(^|[}\s,])body(?=\s*[{,])/gim, '$1#nv-pdf-render-temp')
    .replace(/(^|[}\s,])\*(?=\s*[{,])/gm, '$1#nv-pdf-render-temp, #nv-pdf-render-temp *');

  const targetWidth = orientation === 'landscape' ? 1122 : 794;

  // Mask viewport with a clean "Generating PDF..." overlay while rendering at (0,0) in foreground stacking context
  const backdrop = document.createElement('div');
  backdrop.id = 'nv-pdf-generating-backdrop';
  backdrop.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;';
  backdrop.innerHTML = '<div style="background:#fff;color:#0f172a;padding:14px 24px;border-radius:10px;font-family:Inter,Arial,sans-serif;font-size:14px;font-weight:600;box-shadow:0 12px 32px rgba(0,0,0,0.25);">Generating PDF...</div>';

  // Render in foreground stacking context at (0,0) so body background never covers it
  const container = document.createElement('div');
  container.id = 'nv-pdf-render-temp';
  container.style.position = 'absolute';
  container.style.left = '0';
  container.style.top = '0';
  container.style.zIndex = '99998';
  container.style.pointerEvents = 'none';
  container.style.width = `${targetWidth}px`;
  container.style.margin = '0';
  container.style.background = '#ffffff';
  container.style.color = '#1a1a1a';

  if (scopedStyles.trim()) {
    const styleEl = document.createElement('style');
    styleEl.textContent = scopedStyles;
    container.appendChild(styleEl);
  }

  const contentWrap = document.createElement('div');
  contentWrap.innerHTML = parsedDoc.body ? parsedDoc.body.innerHTML : htmlContent;
  container.appendChild(contentWrap);
  document.body.appendChild(container);
  document.body.appendChild(backdrop);

  try {
    // Wait for embedded images (e.g. logos, photo evidence) before capturing canvas
    const imgs = Array.from(container.querySelectorAll('img'));
    if (imgs.length) {
      await Promise.all(
        imgs.map(img =>
          img.complete
            ? Promise.resolve()
            : new Promise(resolve => {
                const done = () => resolve();
                img.addEventListener('load', done, { once: true });
                img.addEventListener('error', done, { once: true });
                setTimeout(done, 3000);
              })
        )
      );
    }

    // Allow browser to complete layout & paint before html2canvas captures
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const opt = {
      margin: orientation === 'landscape' ? [6, 8, 6, 8] : [8, 8, 8, 8],
      filename: cleanName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: targetWidth,
        windowHeight: Math.max(container.scrollHeight, 600),
        backgroundColor: '#ffffff'
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: orientation }
    };

    await window.html2pdf().set(opt).from(container).save();
  } catch (err) {
    console.error('downloadReportPdf error:', err);
    // Graceful fallback to print if canvas fails
    printReportHtml(cleanName, htmlContent);
  } finally {
    if (document.body.contains(backdrop)) {
      document.body.removeChild(backdrop);
    }
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
