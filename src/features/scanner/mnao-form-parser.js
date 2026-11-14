import { COMMODITY_UNITS } from '../../shared/constants/app.constants.js';
import { normalizeUnit } from './table-parser.js';

const MONTHS = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', sept: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12',
};

function lastDayOfMonth(year, monthStr) {
  const y = parseInt(year, 10);
  const m = parseInt(monthStr, 10);
  const d = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function parseFlexibleDate(raw) {
  if (!raw) return '';
  let s = String(raw).trim()
    .replace(/^028([-./])/, '2028$1')
    .replace(/\s+/g, ' ');

  // YYYY-MM-DD or YYYY/MM/DD
  let m = s.match(/\b(20\d{2})[-./](\d{1,2})[-./](\d{1,2})\b/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;

  // MM/DD/YYYY or DD/MM/YYYY
  m = s.match(/\b(\d{1,2})[-./](\d{1,2})[-./](20\d{2})\b/);
  if (m) {
    let a = parseInt(m[1], 10);
    let b = parseInt(m[2], 10);
    const y = m[3];
    // If first > 12 it must be DD/MM/YYYY; otherwise PH gov forms use MM/DD/YYYY
    const month = a > 12 ? b : a;
    const day = a > 12 ? a : b;
    return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // DD-Mon-YY or DD-Mon-YYYY (e.g. 26-Oct-26)
  m = s.match(/\b(\d{1,2})[-\s]([A-Za-z]{3,9})[-\s](\d{2,4})\b/);
  if (m && MONTHS[m[2].toLowerCase()]) {
    const day = m[1].padStart(2, '0');
    const mon = MONTHS[m[2].toLowerCase()];
    const yr = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${yr}-${mon}-${day}`;
  }

  // Month DD, YYYY (e.g. February 04, 2026 or Jul 06, 2026 or December 30, 2027)
  m = s.match(/\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(20\d{2})\b/);
  if (m && MONTHS[m[1].toLowerCase()]) {
    return `${m[3]}-${MONTHS[m[1].toLowerCase()]}-${m[2].padStart(2, '0')}`;
  }

  // Mon-YYYY (e.g. Mar-2027, Feb-2027) -> last day of that month
  m = s.match(/\b([A-Za-z]{3,9})[-/\s](20\d{2})\b/);
  if (m && MONTHS[m[1].toLowerCase()]) {
    return lastDayOfMonth(m[2], MONTHS[m[1].toLowerCase()]);
  }

  return '';
}

export function detectFormType(rawCells) {
  const fullText = (rawCells || []).map(c => c.text || '').join(' ');
  if (/stock\s*transfer\s*slip/i.test(fullText)) return 'STS';
  if (/property\s*transfer\s*report|annex\s*21/i.test(fullText)) return 'PTR';
  if (/requisition\s*and\s*issuance\s*slip|appendix\s*9-6/i.test(fullText)) return 'RIS';
  return 'GENERIC';
}

function groupCellsIntoLines(rawCells) {
  const items = (rawCells || []).map((c, idx) => ({
    idx,
    text: (c.text || '').trim(),
    confidence: Number(c.confidence ?? 1),
    bbox: c.bbox,
    x1: c.bbox[0],
    y1: c.bbox[1],
    x2: c.bbox[2],
    y2: c.bbox[3],
    midX: (c.bbox[0] + c.bbox[2]) / 2,
    midY: (c.bbox[1] + c.bbox[3]) / 2,
    h: Math.max(1, c.bbox[3] - c.bbox[1]),
  })).filter(i => i.text.length > 0);

  items.sort((a, b) => a.midY - b.midY || a.x1 - b.x1);

  const lines = [];
  for (const item of items) {
    let placed = false;
    for (const line of lines) {
      const anchor = line.items[0];
      const yOverlap = Math.min(item.y2, anchor.y2) - Math.max(item.y1, anchor.y1);
      const minH = Math.min(item.h, anchor.h);

      if (yOverlap > minH * 0.50) {
        line.items.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) lines.push({ items: [item] });
  }

  lines.forEach(l => {
    l.items.sort((a, b) => a.x1 - b.x1);
    l.y1 = Math.min(...l.items.map(i => i.y1));
    l.y2 = Math.max(...l.items.map(i => i.y2));
    l.midY = (l.y1 + l.y2) / 2;
    l.h = Math.max(1, l.y2 - l.y1);
    l.text = l.items.map(i => i.text).join(' ');
  });

  return { items, lines };
}

function classifyHeaderText(text) {
  const t = text.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!t) return null;
  if (/\b(stock\s*no|stock|#)\b/.test(t) && !/description/.test(t)) return 'anchor';
  if (/\bitem\s*code\b/.test(t)) return 'itemCode';
  if (/\b(date\s*acquired|delivery\s*date)\b/.test(t)) return 'delDate';
  if (/\b(purchase\s*order|contract\s*no)\b/.test(t)) return 'ignore';
  if (/\b(complete\s*item\s*description|item\s*description|description|particulars|commodity|product|item)\b/.test(t) && !/code/.test(t)) return 'productName';
  if (/\b(batch|lot)\b/.test(t)) return 'batchNo';
  if (/\b(expir\w*|exp\.?\s*date)\b/.test(t)) return 'expDate';
  if (/\bquantity\s*and\s*unit\b/.test(t)) return 'qtyUnit';
  if (/\bunit\s*cost\b/.test(t)) return 'ignore';
  if (/\b(quantity\s*received|remarks|rejection)\b/.test(t)) return 'ignore';
  if (/\b(qty|quantity)\b/.test(t)) return 'qty';
  if (/\bunit\b/.test(t)) return 'unit';
  if (/\b(vendor|supplier)\b/.test(t)) return 'supplier';
  if (/\bamount\b/.test(t)) return 'amountOrQty';
  return null;
}

function findHeaderBand(lines) {
  const headerScore = (lineText) => {
    const kws = [
      /description|particulars|\bitem\b|\bcommodity\b/i,
      /\bqty\b|\bquantity\b|\bamount\b/i,
      /\bunit\b/i,
      /\bexpir|\bexp\.?\s*date/i,
      /\bbatch|\blot\b/i,
      /\bdate\s*acquired\b/i,
      /\bstock\b|\bitem\s*code\b/i,
      /\bvendor\b|\bsupplier\b/i,
    ];
    return kws.reduce((cnt, rx) => cnt + (rx.test(lineText) ? 1 : 0), 0);
  };

  let bestIdx = -1;
  let bestScore = 1;
  for (let i = 0; i < lines.length; i++) {
    const s = headerScore(lines[i].text);
    // Avoid super-header lines like "Issuing Facility's Action"
    if (s > bestScore && !/issuing\s+facility|receiving\s+facility/i.test(lines[i].text)) {
      bestScore = s;
      bestIdx = i;
    }
  }
  if (bestIdx === -1) return null;

  const bandIndices = [bestIdx];
  const baseH = lines[bestIdx].h;

  // Check 1 line above or below for 2-line wrapped column headers (e.g. STS: DATE / ACQUIRED, BATCH/ / LOT NO.)
  const isSubHeader = (txt) => /\b(quantity|acquired|no\.?|lot\s*no|date|cost|unit|code|applicable|rejection)\b/i.test(txt)
    && !/\b(\d{3,}|february|december|mar-20|feb-20|sachet|bottle)\b/i.test(txt);
  if (bestIdx > 0 && (lines[bestIdx].y1 - lines[bestIdx - 1].y2) < baseH * 1.4 && isSubHeader(lines[bestIdx - 1].text)) {
    bandIndices.unshift(bestIdx - 1);
  }
  if (bestIdx + 1 < lines.length && (lines[bestIdx + 1].y1 - lines[bestIdx].y2) < baseH * 1.4 && isSubHeader(lines[bestIdx + 1].text)) {
    bandIndices.push(bestIdx + 1);
  }
  if (bestIdx + 2 < lines.length && (lines[bestIdx + 2].y1 - lines[bestIdx].y2) < baseH * 2.2 && isSubHeader(lines[bestIdx + 2].text)) {
    bandIndices.push(bestIdx + 2);
  }

  const headerItems = bandIndices.flatMap(idx => lines[idx].items);
  return {
    startLineIdx: bandIndices[0],
    endLineIdx: bandIndices[bandIndices.length - 1],
    items: headerItems,
  };
}

function buildColumnsFromHeader(headerItems, formType) {
  // Group header items that overlap horizontally into single column headers
  const sorted = [...headerItems].sort((a, b) => a.x1 - b.x1);
  const clusters = [];
  for (const item of sorted) {
    let matched = null;
    for (const c of clusters) {
      const overlap = Math.min(item.x2, c.x2) - Math.max(item.x1, c.x1);
      const minW = Math.min(item.x2 - item.x1, c.x2 - c.x1);
      const centerDist = Math.abs(item.midX - c.midX);
      if (overlap > minW * 0.25 || centerDist < 28) {
        matched = c;
        break;
      }
    }
    if (matched) {
      matched.items.push(item);
      matched.x1 = Math.min(matched.x1, item.x1);
      matched.x2 = Math.max(matched.x2, item.x2);
      matched.midX = (matched.x1 + matched.x2) / 2;
    } else {
      clusters.push({ items: [item], x1: item.x1, x2: item.x2, midX: item.midX });
    }
  }

  clusters.sort((a, b) => a.midX - b.midX);

  const hasQtyCol = clusters.some(c => /\bqty\b|\bquantity\b/i.test(c.items.map(i => i.text).join(' ')));

  const cols = clusters.map(c => {
    const text = c.items.sort((a, b) => a.y1 - b.y1 || a.x1 - b.x1).map(i => i.text).join(' ');
    let role = classifyHeaderText(text) || 'ignore';
    if (role === 'amountOrQty') {
      role = (hasQtyCol || formType !== 'GENERIC') ? 'ignore' : 'qty';
    }
    return { text, role, x1: c.x1, x2: c.x2, midX: c.midX };
  });

  // Compute non-overlapping horizontal boundaries between adjacent columns
  for (let i = 0; i < cols.length; i++) {
    if (i === 0) {
      cols[i].boundLeft = 0;
    } else if (cols[i].role === 'productName') {
      // Wide centered description headers: start right after previous narrow column (e.g. UNIT / ITEM CODE)
      cols[i].boundLeft = Math.min((cols[i - 1].midX + cols[i].midX) / 2, cols[i - 1].x2 + 6);
    } else if (cols[i - 1].role === 'productName') {
      cols[i].boundLeft = Math.max((cols[i - 1].midX + cols[i].midX) / 2, cols[i].x1 - 12);
    } else {
      cols[i].boundLeft = (cols[i - 1].midX + cols[i].midX) / 2;
    }
    cols[i].boundRight = Infinity;
  }
  for (let i = 0; i < cols.length - 1; i++) {
    cols[i].boundRight = cols[i + 1].boundLeft;
  }

  return cols;
}

function assignItemToColumn(item, cols) {
  for (const col of cols) {
    if (item.midX >= col.boundLeft && item.midX < col.boundRight) {
      return col;
    }
  }
  // Fallback nearest midX
  let best = cols[0];
  let bestDist = Infinity;
  for (const col of cols) {
    const d = Math.abs(item.midX - col.midX);
    if (d < bestDist) { bestDist = d; best = col; }
  }
  return best;
}

function extractFormMetadata(lines, headerStartIdx, formType, maxX) {
  const meta = { supplier: '', deliveryDate: '', metaItemIndices: new Set() };
  const topLines = lines.slice(0, headerStartIdx);

  for (let i = 0; i < topLines.length; i++) {
    const line = topLines[i];
    const txt = line.text;

    if (formType === 'RIS') {
      // Skip QMS Effective Date at top right
      if (/effective\s*date/i.test(txt)) continue;

      const dateMatch = txt.match(/DATE\s*:\s*([0-9A-Za-z\-\/]+)/i);
      if (dateMatch && !meta.deliveryDate) {
        const parsed = parseFlexibleDate(dateMatch[1]);
        if (parsed) {
          meta.deliveryDate = parsed;
          line.items.filter(it => /DATE/i.test(it.text)).forEach(it => meta.metaItemIndices.add(it.idx));
        }
      }

      if (/^SUPPLIER\b/i.test(txt.trim()) || line.items.some(it => /^SUPPLIER$/i.test(it.text.trim()))) {
        // Supplier name is printed on 1-2 lines right above SUPPLIER label on left half
        const supParts = [];
        for (let k = Math.max(0, i - 2); k < i; k++) {
          const prevLeft = topLines[k].items.filter(it => it.x1 < maxX * 0.45);
          const prevTxt = prevLeft.map(it => it.text).join(' ').trim();
          if (prevTxt && !/requisition|issuance|general\s+services|manolo|bukidnon|philippines/i.test(prevTxt)) {
            supParts.push(prevTxt);
            prevLeft.forEach(it => meta.metaItemIndices.add(it.idx));
          }
        }
        if (supParts.length) meta.supplier = supParts.join(' ');
      }
    } else if (formType === 'PTR') {
      for (const it of line.items) {
        const fromMatch = it.text.match(/\bFrom\s*:\s*(.+)/i);
        if (fromMatch && !meta.supplier) {
          meta.supplier = fromMatch[1].trim();
          meta.metaItemIndices.add(it.idx);
        }
        const dateMatch = it.text.match(/Date\s*Prepared\s*:\s*([0-9A-Za-z\-\/,\s]+)/i);
        if (dateMatch && !meta.deliveryDate) {
          const parsed = parseFlexibleDate(dateMatch[1]);
          if (parsed) {
            meta.deliveryDate = parsed;
            meta.metaItemIndices.add(it.idx);
          }
        }
      }
    } else if (formType === 'STS') {
      for (const it of line.items) {
        const entMatch = it.text.match(/Entity\s*Name\s*:\s*(.+)/i);
        if (entMatch && !meta.supplier) {
          meta.supplier = entMatch[1].trim();
          meta.metaItemIndices.add(it.idx);
        }
        const dateMatch = it.text.match(/Date\s*of\s*Transfer\s*:\s*(.+)/i);
        if (dateMatch && !meta.deliveryDate) {
          const parsed = parseFlexibleDate(dateMatch[1]);
          if (parsed) {
            meta.deliveryDate = parsed;
            meta.metaItemIndices.add(it.idx);
          }
        }
      }
    }
  }

  return meta;
}

function isCutoffLine(lineText) {
  return /\b(sub-?total|total|nothing\s+fol+ows|reason\s+for\s+transfer|goods\s+are\s+checked|purpose\s*:|prepared\s+by|released\/?issued|approved\s+by|delivered\s+by|received\s*(?:\/acknowledged)?\s*by)\b/i.test(lineText);
}

function isBannerLine(lineText) {
  return /supply\s+and\s+delivery\s+of|general\s+fund|1st\s+half|2nd\s+half/i.test(lineText);
}

function cleanProductName(raw) {
  let s = (raw || '').replace(/\s+/g, ' ').trim();
  // Remove leading bullet artifacts and 5-7 digit government item codes
  s = s.replace(/^[•·\-\s]+/, '').replace(/^\d{5,7}\s+/, '').trim();
  return s;
}

export function parseMnaoReceipt(rawCells) {
  if (!rawCells || !rawCells.length) {
    return { formType: 'GENERIC', rows: [], annotatedCells: [], avgConfidence: 0, headerFound: false };
  }

  const formType = detectFormType(rawCells);
  const { items, lines } = groupCellsIntoLines(rawCells);
  const maxX = Math.max(...items.map(i => i.x2), 1000);
  const avgConfidence = items.reduce((s, i) => s + i.confidence, 0) / items.length;

  const headerBand = findHeaderBand(lines);
  if (!headerBand) {
    return { formType, rows: [], annotatedCells: items.map(i => ({ ...i, role: 'ignored' })), avgConfidence, headerFound: false };
  }

  const cols = buildColumnsFromHeader(headerBand.items, formType);
  const meta = extractFormMetadata(lines, headerBand.startLineIdx, formType, maxX);

  // Role & rowIndex lookup for bounding box overlay
  const roleByIdx = new Map();
  const rowIndexByIdx = new Map();
  headerBand.items.forEach(it => roleByIdx.set(it.idx, 'header'));
  meta.metaItemIndices.forEach(idx => roleByIdx.set(idx, 'meta'));
  const hasExpDateColumn = cols.some(c => c.role === 'expDate');

  const records = [];
  let current = null;
  let currentCellIndices = [];

  const flushCurrent = () => {
    if (!current) return;
    const productName = cleanProductName(current.productName.join(' '));
    const expDate = parseFlexibleDate(current.expDate.join(' '));
    const delDateRaw = parseFlexibleDate(current.delDate.join(' '));
    const deliveryDate = delDateRaw || meta.deliveryDate || '';

    let qty = '';
    let unit = '';
    if (current.qtyUnit.length) {
      const qu = current.qtyUnit.join(' ');
      const m = qu.match(/(\d[\d,]*)\s*([A-Za-z]+)?/);
      if (m) {
        qty = m[1].replace(/,/g, '');
        if (m[2]) unit = normalizeUnit(m[2]) || m[2];
      }
    }
    if (!qty && current.qty.length) {
      // RIS has 2 QTY columns; pick first valid integer
      for (const qStr of current.qty) {
        const qm = qStr.replace(/,/g, '').match(/^\d{1,6}$/);
        if (qm) { qty = qm[0]; break; }
      }
    }
    if (!unit && current.unit.length) {
      const uRaw = current.unit.join(' ').trim();
      const splitMatch = uRaw.match(/^(\d[\d,]*)\s+([A-Za-z]+.*)$/);
      if (splitMatch) {
        if (!qty) qty = splitMatch[1].replace(/,/g, '');
        const wordOnly = splitMatch[2].replace(/[^A-Za-z\s]/g, '').trim();
        unit = normalizeUnit(wordOnly) || wordOnly;
      } else {
        const wordOnly = uRaw.replace(/\d+/g, '').trim();
        unit = normalizeUnit(wordOnly) || wordOnly;
      }
    }

    const supplier = current.supplier.join(' ').trim() || meta.supplier || '';
    const batchCode = current.batchNo.join(' ').trim();

    if (productName.length >= 2 || (qty && (expDate || deliveryDate))) {
      const savedIdx = records.length;
      currentCellIndices.forEach(ci => rowIndexByIdx.set(ci, savedIdx));
      records.push({
        productName,
        qty,
        unit,
        expDate,
        deliveryDate,
        supplier,
        batchCode,
        hasExpDateColumn,
      });
    }
    current = null;
    currentCellIndices = [];
  };

  const makeEmptyRecord = () => ({
    anchor: [],
    itemCode: [],
    productName: [],
    batchNo: [],
    expDate: [],
    delDate: [],
    qtyUnit: [],
    qty: [],
    unit: [],
    supplier: [],
  });

  for (let i = headerBand.endLineIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (isCutoffLine(line.text)) break;
    if (isBannerLine(line.text)) {
      line.items.forEach(it => roleByIdx.set(it.idx, 'ignored'));
      continue;
    }

    const lineByRole = makeEmptyRecord();
    const lineRoleTag = new Map();

    for (const item of line.items) {
      const col = assignItemToColumn(item, cols);
      const role = col ? col.role : 'ignore';
      lineRoleTag.set(item.idx, role);
      if (role !== 'ignore' && lineByRole[role]) {
        lineByRole[role].push(item.text);
      }
    }

    const hasAnchor = lineByRole.anchor.some(t => /^\d{1,3}$/.test(t.trim()));
    const hasItemCode = lineByRole.itemCode.some(t => /\d{4,}/.test(t))
      || lineByRole.productName.some(t => /^\d{5,7}\b/.test(t.trim()));
    const hasQty = lineByRole.qty.some(t => /^\d[\d,]*$/.test(t.trim()))
      || lineByRole.qtyUnit.some(t => /\d/.test(t))
      || lineByRole.unit.some(t => /^\d[\d,]*\s+[A-Za-z]+/.test(t.trim()));
    const hasBatch = lineByRole.batchNo.some(t => /[A-Za-z0-9]{4,}/.test(t.trim()));
    const hasExp = lineByRole.expDate.some(t => Boolean(parseFlexibleDate(t)));

    const currentHasQty = current && (
      current.qty.length > 0
      || current.qtyUnit.length > 0
      || current.unit.some(t => /\d/.test(t))
    );
    const currentHasBatch = current && current.batchNo.length > 0;
    const currentHasExp = current && Boolean(parseFlexibleDate(current.expDate.join(' ')));
    const currentHasProd = current && current.productName.length > 0;

    const startsNewRow = !current
      || hasAnchor
      || (hasItemCode && currentHasProd)
      || (hasQty && currentHasQty)
      || (hasBatch && currentHasBatch)
      || (hasExp && currentHasExp);

    if (startsNewRow) {
      flushCurrent();
      current = makeEmptyRecord();
      currentCellIndices = [];
    }

    for (const [k, arr] of Object.entries(lineByRole)) {
      if (arr.length) current[k].push(...arr);
    }

    for (const [idx, role] of lineRoleTag.entries()) {
      if (role !== 'ignore') currentCellIndices.push(idx);
      if (role === 'productName') roleByIdx.set(idx, 'product');
      else if (role === 'qty' || role === 'qtyUnit' || role === 'unit') roleByIdx.set(idx, 'qty');
      else if (role === 'expDate' || role === 'delDate') roleByIdx.set(idx, 'date');
      else if (role === 'batchNo') roleByIdx.set(idx, 'batch');
      else if (role === 'supplier') roleByIdx.set(idx, 'meta');
      else roleByIdx.set(idx, 'ignored');
    }
  }

  flushCurrent();

  const annotatedCells = rawCells.map((c, idx) => ({
    ...c,
    role: roleByIdx.get(idx) || 'ignored',
    rowIndex: rowIndexByIdx.has(idx) ? rowIndexByIdx.get(idx) : null,
  }));

  return {
    formType,
    rows: records,
    annotatedCells,
    avgConfidence,
    hasExpDateColumn,
    headerFound: records.length > 0,
    metadata: { supplier: meta.supplier, deliveryDate: meta.deliveryDate },
  };
}
