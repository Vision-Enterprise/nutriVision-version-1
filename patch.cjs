const fs = require('fs');
const file = 'src/features/scanner/scanner.component.js';
let content = fs.readFileSync(file, 'utf8');

const target = "const response = await fetch('http://localhost:8000/api/ocr', { method: 'POST', body: formData });";
if (content.includes(target)) {
    const startIdx = content.indexOf(target);
    const endStr = "const parsedTable = parseTableData(data);";
    const endIdx = content.indexOf(endStr, startIdx) + endStr.length;
    
    const replacement = "const response = await fetch('http://localhost:8000/api/extract-receipt', { method: 'POST', body: formData });\n" +
        "        if (!response.ok) throw new Error('API failed');\n" +
        "        \n" +
        "        const data = await response.json();\n" +
        "        \n" +
        "        const legacyFormat = {\n" +
        "          words: (data.raw_cells || []).map(cell => ({\n" +
        "            text: cell.text,\n" +
        "            confidence: cell.confidence,\n" +
        "            bbox: [\n" +
        "              [cell.bbox[0], cell.bbox[1]],\n" +
        "              [cell.bbox[2], cell.bbox[1]],\n" +
        "              [cell.bbox[2], cell.bbox[3]],\n" +
        "              [cell.bbox[0], cell.bbox[3]]\n" +
        "            ]\n" +
        "          }))\n" +
        "        };\n" +
        "        const parsedTable = parseTableData(legacyFormat);";

    content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Patched successfully");
} else {
    console.log("Target string not found");
}
