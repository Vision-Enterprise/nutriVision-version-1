const fs = require('fs');
const file = 'src/features/scanner/scanner.component.js';
let content = fs.readFileSync(file, 'utf8');

const target = "const response = await fetch('http://localhost:8000/api/ocr', { method: 'POST', body: formData });";
if (content.includes(target)) {
    const startIdx = content.indexOf(target);
    const endStr = "const parsedTable = parseTableData(data);";
    const endIdx = content.indexOf(endStr, startIdx) + endStr.length;
    
    const replacement = \const response = await fetch('http://localhost:8000/api/extract-receipt', { method: 'POST', body: formData });
        if (!response.ok) throw new Error('API failed');
        
        const data = await response.json();
        
        const legacyFormat = {
          words: (data.raw_cells || []).map(cell => ({
            text: cell.text,
            confidence: cell.confidence,
            bbox: [
              [cell.bbox[0], cell.bbox[1]],
              [cell.bbox[2], cell.bbox[1]],
              [cell.bbox[2], cell.bbox[3]],
              [cell.bbox[0], cell.bbox[3]]
            ]
          }))
        };
        const parsedTable = parseTableData(legacyFormat);\;

    content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Patched successfully");
} else {
    console.log("Target string not found");
}
