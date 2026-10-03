/**
 * Code Generator Utility - NutriVision MNAO Protocol
 *
 * Strict validation architecture for Municipal Nutrition Action Office (MNAO).
 * Enforces FEFO (First-Expired, First-Out) compliance by strictly disallowing
 * blank placeholders, "TBD", or arbitrary fallback defaults (such as "UNT").
 */

const STOP_WORDS = new Set(['WITH', 'AND', 'FOR', 'THE', 'OF', 'IN', 'TO', 'A', 'AN']);
const INVALID_UNIT_PLACEHOLDERS = new Set(['UNT', 'TBD', 'N/A', 'NA', 'NONE', '-', 'NULL', 'UNDEFINED']);

export const STANDARDIZED_UNITS = {
  'SACHET': 'SACHET',
  'SACHETS': 'SACHET',
  'SAC': 'SACHET',
  'SCH': 'SACHET',
  'PACK': 'PACK',
  'PACKS': 'PACK',
  'PAC': 'PACK',
  'PACKAGE': 'PACK',
  'PACKAGES': 'PACK',
  'BOX': 'BOX',
  'BOXES': 'BOX',
  'BOTTLE': 'BOTTLE',
  'BOTTLES': 'BOTTLE',
  'BOT': 'BOTTLE',
  'TABLET': 'TABLET',
  'TABLETS': 'TABLET',
  'TAB': 'TABLET',
  'TABS': 'TABLET',
  'CAPSULE': 'CAPSULE',
  'CAPSULES': 'CAPSULE',
  'CAP': 'CAPSULE',
  'CAPS': 'CAPSULE',
  'PIECE': 'PIECE',
  'PIECES': 'PIECE',
  'PC': 'PIECE',
  'PCS': 'PIECE',
  'PIE': 'PIECE',
  'KILOGRAM': 'KG',
  'KILOGRAMS': 'KG',
  'KILO': 'KG',
  'KG': 'KG',
  'KGS': 'KG',
  'CAN': 'CAN',
  'CANS': 'CAN',
  'VIAL': 'VIAL',
  'VIALS': 'VIAL',
  'TUBE': 'TUBE',
  'TUBES': 'TUBE',
  'BLISTER': 'BLISTER',
  'BLISTER PACK': 'BLISTER',
  'JAR': 'JAR',
  'JARS': 'JAR',
  'BAR': 'BAR',
  'BARS': 'BAR'
};

/**
 * Returns a standardized packaging unit code (e.g. "SACHET", "PACK", "TABLET", "KG").
 */
export function formatUnitCode(unit) {
  if (!unit) return 'UNIT';
  const clean = String(unit).trim().toUpperCase();
  if (STANDARDIZED_UNITS[clean]) {
    return STANDARDIZED_UNITS[clean];
  }
  const alpha = clean.replace(/[^A-Z0-9]/g, '');
  if (alpha.length <= 7) return alpha;
  return alpha.slice(0, 6);
}

const KNOWN_SUPPLIERS = {
  'DEPARTMENT OF HEALTH': 'DOH',
  'DEPT OF HEALTH': 'DOH',
  'DOH': 'DOH',
  'NATIONAL NUTRITION COUNCIL': 'NNC',
  'NNC': 'NNC',
  'LOCAL GOVERNMENT UNIT': 'LGU',
  'LGU': 'LGU',
  'PROVINCIAL HEALTH OFFICE': 'PHO',
  'PHO': 'PHO',
  'MUNICIPAL HEALTH OFFICE': 'MHO',
  'MHO': 'MHO',
  'RURAL HEALTH UNIT': 'RHU',
  'RHU': 'RHU',
  'BARANGAY HEALTH STATION': 'BHS',
  'BHS': 'BHS',
  'WORLD HEALTH ORGANIZATION': 'WHO',
  'WHO': 'WHO',
  'WORLD FOOD PROGRAMME': 'WFP',
  'WORLD FOOD PROGRAM': 'WFP',
  'WFP': 'WFP',
  'UNITED NATIONS CHILDREN\'S FUND': 'UNICEF',
  'UNITED NATIONS CHILDRENS FUND': 'UNICEF',
  'UNICEF': 'UNICEF',
  'ZUELLIG PHARMA': 'ZUELLIG',
  'ZUELLIG': 'ZUELLIG',
  'UNILAB': 'UNILAB',
  'MERCURY DRUG': 'MERCURY',
};

/**
 * Extracts a concise, readable uppercase supplier code for batch code tagging.
 */
export function extractSupplierCode(supplier) {
  if (!supplier || typeof supplier !== 'string') return '';
  const clean = supplier.trim().toUpperCase();
  if (!clean) return '';

  if (KNOWN_SUPPLIERS[clean]) return KNOWN_SUPPLIERS[clean];

  // Strip punctuation
  const noPunct = clean.replace(/[^A-Z0-9\s]/g, ' ');
  const words = noPunct.split(/\s+/).filter(Boolean);

  if (words.length === 1) {
    return words[0].slice(0, 8);
  }

  // Multi-word: check initials of non-stop words
  const nonStopWords = words.filter(w => !STOP_WORDS.has(w));
  const targetWords = nonStopWords.length > 0 ? nonStopWords : words;
  const initials = targetWords.map(w => w[0]).join('');

  if (initials.length >= 2 && initials.length <= 6) {
    return initials;
  }

  return targetWords[0].slice(0, 6);
}

/**
 * Generates an Acronym Commodity SKU.
 *
 * Architecture & Logic:
 * - Strips hyphens, parentheses, and punctuation from commodity name.
 * - Splits into words and filters out stop words ("with", "and", "for", "the", etc.).
 * - If multiple words: Extracts the first letter of the first 3 or 4 words (e.g., "Nutri-Med MMS" -> "NMM").
 * - If single word: Extracts the first 3 consonants (e.g., "Nutribun" -> "NTR").
 * - Appends a hyphen and the first 3 letters of the unit. Converts entirely to uppercase.
 * - Strict Validation: Throws Error if unit is null, undefined, empty, or an invalid placeholder.
 *
 * Examples:
 * - generateCommoditySKU("Nutri-Med MMS", "Tablet") -> "NMM-TAB"
 * - generateCommoditySKU("Iron with Folic Acid", "Tablet") -> "IFA-TAB"
 * - generateCommoditySKU("Nutribun", "Piece") -> "NTR-PIE"
 *
 * @param {string} name - Commodity name
 * @param {string} unit - Packaging unit
 * @returns {string} Acronym-based SKU (e.g., "NMM-TAB", "IFA-TAB")
 * @throws {Error} If unit or name fails strict validation rules.
 */
export function generateCommoditySKU(name, unit) {
  // Strict Unit Validation
  if (unit === null || unit === undefined) {
    throw new Error('Strict Policy: Unit is mandatory to generate a commodity SKU.');
  }

  const cleanUnit = String(unit).trim();
  if (!cleanUnit) {
    throw new Error('Strict Policy: Unit is mandatory to generate a commodity SKU.');
  }

  const upperUnit = cleanUnit.toUpperCase();
  if (INVALID_UNIT_PLACEHOLDERS.has(upperUnit)) {
    throw new Error(`Strict Policy: Unit "${cleanUnit}" is an invalid placeholder. Unit is mandatory.`);
  }

  // Name Validation
  if (name === null || name === undefined) {
    throw new Error('Strict Policy: Commodity name is mandatory to generate a commodity SKU.');
  }

  const cleanName = String(name).trim();
  if (!cleanName) {
    throw new Error('Strict Policy: Commodity name is mandatory to generate a commodity SKU.');
  }

const KNOWN_COMMODITY_ACRONYMS = {
  'MICRONUTRIENT POWDER': 'MNP',
  'READY TO USE THERAPEUTIC FOOD': 'RUTF',
  'READY TO USE SUPPLEMENTARY FOOD': 'RUSF',
  'READY TO USE SUPPLEMENTARY FOODS': 'RUSF',
  'IRON WITH FOLIC ACID': 'IFA',
  'IRON FOLIC ACID': 'IFA',
  'IRON WITH FOLIC ACID TABLET': 'IFA',
  'FOLIC ACID': 'FA',
  'VITAMIN A': 'VITA',
  'DEWORMING TABLET': 'ALB',
  'ALBENDAZOLE': 'ALB',
  'MEBENDAZOLE': 'MBZ'
};

  // Strip hyphens, parentheses, and punctuation into spaces
  const sanitizedName = cleanName.replace(/[-_()[\],.;:!?'"\\/]/g, ' ');
  const normKey = sanitizedName.replace(/\s+/g, ' ').trim().toUpperCase();

  let acronym = KNOWN_COMMODITY_ACRONYMS[normKey] || '';

  if (!acronym) {
    // Split into words and filter out stop words
    const rawWords = sanitizedName.trim().split(/\s+/).filter(Boolean);
    const words = rawWords.filter(w => !STOP_WORDS.has(w.toUpperCase()));

    if (words.length > 1) {
      // Multiple words: Extract first letter of first 3 or 4 words
      const targetWords = words.slice(0, 4);
      acronym = targetWords.map(w => w.replace(/[^a-zA-Z0-9]/g, '')[0] || '').join('').toUpperCase();
    } else if (words.length === 1) {
      // Single word: Extract first 3 consonants (e.g., "Nutribun" -> "NTR")
      const word = words[0].toUpperCase();
      const consonants = word.replace(/[^BCDFGHJKLMNPQRSTVWXYZ]/g, '');
      if (consonants.length >= 3) {
        acronym = consonants.slice(0, 3);
      } else {
        // Fallback if word has fewer than 3 consonants: take consonants then remaining letters
        const alphaOnly = word.replace(/[^A-Z0-9]/g, '');
        acronym = alphaOnly.slice(0, 3);
      }
    } else {
      // Fallback if all words were stop words
      const fallbackWord = (rawWords[0] || 'COMM').toUpperCase();
      acronym = fallbackWord.slice(0, 3);
    }
  }

  // Unit Part: Standardized packaging unit (e.g., SACHET, PACK, TABLET, KG)
  const unitPart = formatUnitCode(cleanUnit);

  if (!unitPart) {
    throw new Error('Strict Policy: Unit is mandatory to generate a commodity SKU.');
  }

  return `${acronym}-${unitPart}`;
}

/**
 * Safely parses expiration dates in various formats to extract 2-digit year (YY) and 2-digit month (MM).
 *
 * Supported formats:
 * - Full ISO: "2026-10-14", "2026/10/14" -> "2610"
 * - Full US: "10-14-2026", "10/14/2026" -> "2610"
 * - Full EU/Intl: "14-10-2026" (day > 12 detected) -> "2610"
 * - Month-Year: "12-2026", "12/2026", "09-2026" -> "2612", "2609"
 * - Year-Month: "2026-12", "2026/12", "2026-09" -> "2612", "2609"
 *
 * @param {string|Date} expirationDate
 * @returns {string} "YYMM" string (e.g., "2610", "2612", "2609")
 * @throws {Error} If expiration date is missing or invalid.
 */
/**
 * Safely parses dates to extract 2-digit year (YY) and 2-digit month (MM),
 * and 2-digit day (DD) when a full date is provided.
 *
 * Supported formats:
 * - Full ISO: "2026-10-03" -> "261003"
 * - Full US: "10-03-2026" -> "261003"
 * - Full EU/Intl: "03-10-2026" -> "261003"
 * - Month-Year: "10-2026" -> "2610"
 * - Year-Month: "2026-10" -> "2610"
 *
 * @param {string|Date} dateStr
 * @returns {string} "YYMM" or "YYMMDD"
 * @throws {Error} If date is missing or invalid.
 */
export function extractExpDateCode(dateStr) {
  if (dateStr === null || dateStr === undefined) {
    throw new Error('Strict Policy: Date is mandatory.');
  }

  const rawStr = String(dateStr).trim();
  if (!rawStr) {
    throw new Error('Strict Policy: Date is mandatory.');
  }

  const upperStr = rawStr.toUpperCase();
  if (upperStr === 'TBD' || upperStr === 'N/A' || upperStr === 'NONE') {
    throw new Error('Strict Policy: Date is mandatory.');
  }

  let year = '';
  let month = '';
  let day = '';

  // 1. Full ISO format: YYYY-MM-DD or YYYY/MM/DD
  let match = rawStr.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) {
    year = match[1];
    month = match[2];
    day = match[3];
  } else {
    // 2. Full US / EU format: MM-DD-YYYY or DD-MM-YYYY
    match = rawStr.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (match) {
      year = match[3];
      const p1 = parseInt(match[1], 10);
      const p2 = parseInt(match[2], 10);
      if (p1 > 12 && p2 <= 12) {
        // DD-MM-YYYY format
        day = match[1];
        month = match[2];
      } else {
        // MM-DD-YYYY format (standard US e.g. 10-14-2026)
        month = match[1];
        day = match[2];
      }
    } else {
      // 3. Month-Year: MM-YYYY or MM/YYYY (e.g., 12-2026, 09-2026)
      match = rawStr.match(/^(\d{1,2})[-/.](\d{4})$/);
      if (match) {
        month = match[1];
        year = match[2];
      } else {
        // 4. Year-Month: YYYY-MM or YYYY/MM (e.g., 2026-12, 2026-09)
        match = rawStr.match(/^(\d{4})[-/.](\d{1,2})$/);
        if (match) {
          year = match[1];
          month = match[2];
        } else {
          // 5. Native Date or parseable string
          const parsed = new Date(rawStr);
          if (!isNaN(parsed.getTime())) {
            year = String(parsed.getFullYear());
            month = String(parsed.getMonth() + 1);
            day = String(parsed.getDate());
          } else {
            throw new Error(`Strict Policy: Invalid date format "${rawStr}".`);
          }
        }
      }
    }
  }

  const mNum = parseInt(month, 10);
  if (isNaN(mNum) || mNum < 1 || mNum > 12) {
    throw new Error(`Strict Policy: Month "${month}" is out of bounds (1-12).`);
  }

  const yy = String(year).slice(-2);
  const mm = String(mNum).padStart(2, '0');
  return `${yy}${mm}`;
}

export function extractExpYYMM(expirationDate) {
  return extractExpDateCode(expirationDate);
}

/**
 * Extracts strictly 4-digit YYMM (Year and Month) for date tags.
 */
export function extractDateYYMMOnly(dateStr) {
  return extractExpDateCode(dateStr);
}

/**
 * Generates a comprehensive, human-readable Batch Code for MNAO inventory FEFO tracking.
 *
 * Architecture:
 * - Format: [SKU]-DEL[YYMM]-EXP[YYMM]-[SUPPLIER]
 *   Example: MNP-SACHET-DEL2603-EXP2802-DOH
 *
 * @param {string} sku - Standardized full SKU (e.g., "MNP-SACHET", "IFA-TABLET")
 * @param {string|Date} expirationDate - Expiration date string or Date object
 * @param {string|Date|null} deliveryDate - Optional delivery date
 * @param {string|null} supplier - Optional supplier or donor name
 * @returns {string} Batch code (e.g., "MNP-SACHET-DEL2603-EXP280228-DOH")
 * @throws {Error} If SKU or expiration date fails validation.
 */
export function generateBatchCode(sku, expirationDate, deliveryDate = null, supplier = null) {
  if (!sku || typeof sku !== 'string' || !sku.trim()) {
    throw new Error('Strict Policy: SKU is mandatory to generate a batch code.');
  }

  const cleanSku = sku.trim().toUpperCase();
  const expCode = extractExpDateCode(expirationDate);

  let delSegment = '';
  if (deliveryDate) {
    try {
      const delYymm = extractDateYYMMOnly(deliveryDate);
      delSegment = `-DEL${delYymm}`;
    } catch {}
  }

  const expSegment = `-EXP${expCode}`;

  let supSegment = '';
  if (supplier) {
    const supCode = extractSupplierCode(supplier);
    if (supCode) {
      supSegment = `-${supCode}`;
    }
  }

  return `${cleanSku}${delSegment}${expSegment}${supSegment}`;
}

/**
 * Generates a unique duplicate fingerprint signature string to silently detect
 * duplicate receipt lines before database submission.
 *
 * Format:
 * [receipt]_[supplier]_[YYYY-MM-DD]_[sku]_[qty]
 *
 * Fallback: If receiptNumber is missing or blank, defaults to "no-ref".
 *
 * @param {string|null} receiptNumber - Receipt or delivery reference number
 * @param {string} supplier - Supplier or donor name
 * @param {string} deliveryDate - Delivery date (YYYY-MM-DD)
 * @param {string} sku - Commodity SKU
 * @param {number|string} quantity - Quantity received
 * @returns {string} Concatenated lowercase fingerprint signature
 */
export function generateDuplicateSignature(receiptNumber, supplier, deliveryDate, sku, quantity) {
  const receipt = (receiptNumber && String(receiptNumber).trim())
    ? String(receiptNumber).trim().toLowerCase()
    : 'no-ref';

  const supp = (supplier && String(supplier).trim())
    ? String(supplier).trim().toLowerCase()
    : 'no-supplier';

  let delDate = 'no-date';
  if (deliveryDate) {
    const dStr = String(deliveryDate).trim();
    delDate = dStr.slice(0, 10).toLowerCase();
  }

  const cleanSku = (sku && String(sku).trim())
    ? String(sku).trim().toLowerCase()
    : 'no-sku';

  const cleanQty = (quantity !== null && quantity !== undefined && String(quantity).trim())
    ? String(quantity).trim()
    : '0';

  return `${receipt}_${supp}_${delDate}_${cleanSku}_${cleanQty}`;
}
