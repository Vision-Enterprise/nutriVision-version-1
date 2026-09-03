
// table-parser.js - Adapted for EasyOCR flat bbox array

const CATEGORY_KW = {
  productName: ['product', 'item', 'commodity', 'description', 'name', 'particulars',
                'article', 'goods', 'medicine', 'supplement', 'material', 'detail'],
  qty:         ['qty', 'quantity', 'amount', 'pieces', 'pcs', 'count', 'volume', 'total'],
  expDate:     ['exp', 'expiry', 'expiration', 'date', 'best', 'use', 'mfg', 'manufacture', 'shelf'],
  unit:        ['unit', 'uom', 'measure', 'pack', 'packaging', 'form'],
};

const SKIP_KW = [
  'no', 'num', 'number', 'batch', 'lot', 'serial', 'ref',
  'sl', 'sr', 'seq', 'sequence', 'code', 'barcode', 'sku', 'id'
];

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

function fuzzyMatch(wordRaw, keywords) {
  const w = wordRaw.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length < 2) return false;
  for (const kw of keywords) {
    const k = kw.toLowerCase().replace(/[^a-z]/g, '');
    if (!k) continue;
    if (w.includes(k) || k.includes(w)) return true;
    if (w.length >= 4 && k.length >= 4 && w.slice(0, 4) === k.slice(0, 4)) return true;
    const longer = Math.max(w.length, k.length);
    if (longer >= 4 && levenshtein(w, k) <= Math.ceil(longer * 0.35)) return true;
  }
  return false;
}

function isSkipWord(wordRaw) {
  const w = wordRaw.toLowerCase().replace(/[^a-z]/g, '');
  return SKIP_KW.some(k => w === k || (w.length >= 3 && k.includes(w)));
}

function getBestCategory(wordRaw) {
  for (const [cat, kws] of Object.entries(CATEGORY_KW)) {
    if (fuzzyMatch(wordRaw, kws)) return cat;
  }
  return null;
}

// Group flat EasyOCR words into horizontal lines
function extractLines(data) {
  if (!data || !data.words || data.words.length === 0) return [];
  
  // Convert EasyOCR bbox to x0, y0, x1, y1
  const processedWords = data.words.map(w => {
    return {
      text: w.text,
      confidence: w.confidence,
      bbox: {
        x0: w.bbox[0][0],
        y0: w.bbox[0][1],
        x1: w.bbox[2][0],
        y1: w.bbox[2][1]
      }
    };
  });
  
  // Sort by Y initially
  processedWords.sort((a, b) => a.bbox.y0 - b.bbox.y0);
  
  const lines = [];
  let currentLine = [processedWords[0]];
  
  for (let i = 1; i < processedWords.length; i++) {
    const w = processedWords[i];
    const prev = currentLine[currentLine.length - 1];
    
    // Check vertical overlap
    const yOverlap = Math.max(0, Math.min(prev.bbox.y1, w.bbox.y1) - Math.max(prev.bbox.y0, w.bbox.y0));
    const minHeight = Math.min(prev.bbox.y1 - prev.bbox.y0, w.bbox.y1 - w.bbox.y0);
    
    if (yOverlap > minHeight * 0.4) { // 40% vertical overlap = same line
      currentLine.push(w);
    } else {
      lines.push({ words: currentLine });
      currentLine = [w];
    }
  }
  if (currentLine.length > 0) lines.push({ words: currentLine });
  
  // Sort words left-to-right within each line
  lines.forEach(l => l.words.sort((a, b) => a.bbox.x0 - b.bbox.x0));
  
  return lines;
}

function findHeaderLineIndex(lines) {
  let bestScore = 1; // Must match at least 2 distinct categories
  let bestIdx = -1;

  lines.forEach((line, idx) => {
    const matched = new Set();
    for (const w of line.words) {
      const cat = getBestCategory(w.text);
      if (cat) matched.add(cat);
    }
    if (matched.size > bestScore) { bestScore = matched.size; bestIdx = idx; }
  });

  return bestIdx;
}

function detectColumnAnchors(headerLine) {
  const words = headerLine.words;
  if (!words.length) return [];

  const avgW = words.reduce((s, w) => s + (w.bbox.x1 - w.bbox.x0), 0) / words.length;
  const gapThreshold = Math.max(avgW * 1.0, 12);

  const cells = [];
  let cell = { words: [words[0]] };
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].bbox.x0 - words[i-1].bbox.x1;
    if (gap > gapThreshold) { cells.push(cell); cell = { words: [words[i]] }; }
    else { cell.words.push(words[i]); }
  }
  cells.push(cell);

  const columns = [];
  const used = new Set();

  for (const c of cells) {
    const combined = c.words.map(w => w.text).join(' ');
    const xL = c.words[0].bbox.x0;
    const xR = c.words[c.words.length - 1].bbox.x1;
    const xCenter = (xL + xR) / 2;

    const hasSkip = c.words.some(w => isSkipWord(w.text));
    const hasBatchRef = fuzzyMatch(combined, ['item', 'batch', 'lot', 'serial', 'reference']);
    const allSkip = c.words.every(w => isSkipWord(w.text) || /^[/#.\\d]+$/.test(w.text));

    if (hasSkip && (hasBatchRef || allSkip)) continue;

    let bestCat = null;
    for (const w of c.words) {
      const cat = getBestCategory(w.text);
      if (cat && !used.has(cat)) { bestCat = cat; break; }
    }
    if (bestCat) {
      columns.push({ category: bestCat, xCenter, xLeft: xL, xRight: xR, headerText: combined });
      used.add(bestCat);
    }
  }

  console.log("DETECTED COLUMNS:", columns); return columns.sort((a, b) => a.xCenter - b.xCenter);
}

function assignWordToColumn(word, columns) {
  if (!columns.length) return null;
  const cx = (word.bbox.x0 + word.bbox.x1) / 2;
  let nearest = null, minDist = Infinity;
  for (const col of columns) {
    const d = Math.abs(cx - col.xCenter);
    if (d < minDist) { minDist = d; nearest = col.category; }
  }
  return nearest;
}

function parseDataLine(line, columns) {
  const buffers = { productName: [], qty: [], expDate: [], unit: [] };
  
  for (const word of line.words) {
    if (!word.text.trim()) continue;
    const cat = assignWordToColumn(word, columns);
    if (cat && buffers[cat] !== undefined) {
      buffers[cat].push(word.text);
    }
  }

  const record = {};
  for (const [cat, tokens] of Object.entries(buffers)) {
    record[cat] = tokens.join(' ').trim();
  }

  if (/^\d{1,3}$/.test(record.productName)) record.productName = '';

  return record;
}

function isUsableDataLine(line) {
  if (line.words.length < 2) return false;
  return true;
}

export function parseTableData(data) {
  const lines = extractLines(data);
  if (!lines.length) return { rows: [], columns: [], headerFound: false, headerText: '', lineCount: 0 };

  let headerIdx = findHeaderLineIndex(lines);
  // If a header is found on the very last line, or there's only 1 line, it's not a real table.
  let headerFound = headerIdx >= 0 && headerIdx < lines.length - 1;

  let columns = [], headerText = '';
  if (headerFound) {
    columns = detectColumnAnchors(lines[headerIdx]);
    headerText = lines[headerIdx].words.map(w => w.text).join(' ');
  } else {
    // SINGLE LINE / NON-TABLE FALLBACK LOGIC
    const fullText = lines.map(l => l.words.map(w => w.text).join(' ')).join(' ');
    
    let qty = '';
    let expDate = '';
    
    const qtyMatch = fullText.match(/(?:qty|quantity|amount|pieces|pcs)\s*[:.-]*\s*(\d+)/i);
    if (qtyMatch) {
      qty = qtyMatch[1];
    } else {
      const pureNumMatch = fullText.match(/\b(\d{1,4})\b/);
      if (pureNumMatch) qty = pureNumMatch[1];
    }
    
    const expMatch = fullText.match(/(?:exp(?:iry|iration)?\s*(?:date)?[\s:.-]*|best\s*before[\s:.-]*|bb[\s:.-]*)(20\d{2}[-./]\d{2}[-./]\d{2}|\d{2}[-./]\d{2}[-./]20\d{2}|\d{2}[-./]20\d{2})/i);
    if (expMatch) {
      expDate = expMatch[1];
    } else {
      const genericDateMatch = fullText.match(/\b(20\d{2}[-./]\d{2}[-./]\d{2}|\d{2}[-./]\d{2}[-./]20\d{2}|\d{2}[-./]20\d{2})\b/);
      if (genericDateMatch) expDate = genericDateMatch[1];
    }
    
    let productName = fullText.split(/(?:qty|quantity|amount|exp(?:iry|iration)?|best\s*before)/i)[0].replace(/[0-9-./:]/g, '').trim();
    if (productName.length < 3) productName = fullText;
    
    return { 
      rows: [{ productName, qty, expDate }], 
      columns: [], 
      headerFound: false, 
      headerText: '', 
      lineCount: lines.length 
    };
  }

  const dataStart = headerIdx + 1;
  const rows = [];

  for (let i = dataStart; i < lines.length; i++) {
    if (!isUsableDataLine(lines[i])) continue;
    const rec = parseDataLine(lines[i], columns);
    if (rec.productName || rec.qty || rec.expDate) {
       rows.push(rec);
    }
  }

  return { rows, columns, headerFound, headerText, lineCount: lines.length };
}
