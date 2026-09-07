/**
 * Code Generator Utility - NutriVision MNAO Protocol
 *
 * Strict validation architecture for Municipal Nutrition Action Office (MNAO).
 * Enforces FEFO (First-Expired, First-Out) compliance by strictly disallowing
 * blank placeholders, "TBD", or arbitrary fallback defaults (such as "UNT").
 */

const STOP_WORDS = new Set(['WITH', 'AND', 'FOR', 'THE', 'OF', 'IN', 'TO', 'A', 'AN']);
const INVALID_UNIT_PLACEHOLDERS = new Set(['UNT', 'TBD', 'N/A', 'NA', 'NONE', '-', 'NULL', 'UNDEFINED']);

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

  // Strip hyphens, parentheses, and punctuation into spaces
  const sanitizedName = cleanName.replace(/[-_()[\],.;:!?'"\\/]/g, ' ');

  // Split into words and filter out stop words
  const rawWords = sanitizedName.trim().split(/\s+/).filter(Boolean);
  const words = rawWords.filter(w => !STOP_WORDS.has(w.toUpperCase()));

  let acronym = '';

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

  // Unit Part: first 3 letters
  const unitLetters = upperUnit.replace(/[^A-Z0-9]/g, '');
  const unitPart = unitLetters.length <= 3 
    ? unitLetters 
    : unitLetters.slice(0, 3);

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
export function extractExpYYMM(expirationDate) {
  if (expirationDate === null || expirationDate === undefined) {
    throw new Error('Strict Policy: Expiration date is mandatory.');
  }

  const rawStr = String(expirationDate).trim();
  if (!rawStr) {
    throw new Error('Strict Policy: Expiration date is mandatory.');
  }

  const upperStr = rawStr.toUpperCase();
  if (upperStr === 'TBD' || upperStr === 'N/A' || upperStr === 'NONE') {
    throw new Error('Strict Policy: Expiration date is mandatory.');
  }

  let year = '';
  let month = '';

  // 1. Full ISO format: YYYY-MM-DD or YYYY/MM/DD
  let match = rawStr.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) {
    year = match[1];
    month = match[2];
  } else {
    // 2. Full US / EU format: MM-DD-YYYY or DD-MM-YYYY
    match = rawStr.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (match) {
      year = match[3];
      const p1 = parseInt(match[1], 10);
      const p2 = parseInt(match[2], 10);
      if (p1 > 12 && p2 <= 12) {
        // DD-MM-YYYY format
        month = match[2];
      } else {
        // MM-DD-YYYY format (standard US e.g. 10-14-2026)
        month = match[1];
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
          } else {
            throw new Error(`Strict Policy: Invalid expiration date format "${rawStr}".`);
          }
        }
      }
    }
  }

  const mNum = parseInt(month, 10);
  if (isNaN(mNum) || mNum < 1 || mNum > 12) {
    throw new Error(`Strict Policy: Expiration month "${month}" is out of bounds (1-12).`);
  }

  const yy = String(year).slice(-2);
  const mm = String(mNum).padStart(2, '0');
  return `${yy}${mm}`;
}

/**
 * Generates a standard Batch Code for inventory FEFO tracking.
 *
 * Architecture:
 * - Format: [FULL_SKU]-EX[YYMM]
 * - Retains the full commodity SKU and appends "-EX" followed by the 2-digit year
 *   and 2-digit month of expiration.
 * - Strict Validation: Throws Error if expirationDate or sku is missing/invalid.
 *
 * Examples:
 * - generateBatchCode("NMM-TAB", "10-14-2026") -> "NMM-TAB-EX2610"
 * - generateBatchCode("NMM-TAB", "09-2026")    -> "NMM-TAB-EX2609"
 * - generateBatchCode("IFA-TAB", "12-2026")    -> "IFA-TAB-EX2612"
 *
 * @param {string} sku - Standardized full SKU (e.g., "NMM-TAB", "IFA-TAB")
 * @param {string|Date} expirationDate - Expiration date string or Date object
 * @returns {string} Batch code (e.g., "NMM-TAB-EX2610")
 * @throws {Error} If SKU or expiration date fails validation.
 */
export function generateBatchCode(sku, expirationDate) {
  if (!sku || typeof sku !== 'string' || !sku.trim()) {
    throw new Error('Strict Policy: SKU is mandatory to generate a batch code.');
  }

  const cleanSku = sku.trim().toUpperCase();
  const yymm = extractExpYYMM(expirationDate);
  return `${cleanSku}-EX${yymm}`;
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
