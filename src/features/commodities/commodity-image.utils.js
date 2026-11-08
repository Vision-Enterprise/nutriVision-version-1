/**
 * Commodity Image & Category Illustration Utilities (#87)
 *
 * Provides:
 *  1. Client-side image resize + JPEG compression (~18-35 KB Data URL) so commodity
 *     photos work identically on Web (Vercel) and Desktop (PyWebView) without external
 *     bucket CORS dependencies.
 *  2. Local fallback cache (localStorage) so photo uploads/removals work immediately
 *     even before the consolidated database migration adds `commodities.image_url`.
 *  3. Crisp category-themed vector SVG illustrations when no custom photo is uploaded.
 */

import { isNutribunName } from '../../shared/utils/shelf-life.utils.js';

const LOCAL_COMMODITY_IMAGE_KEY = 'nutrivision_commodity_images_v1';

function readLocalImageStore() {
  try {
    const raw = localStorage.getItem(LOCAL_COMMODITY_IMAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLocalImageStore(store) {
  try {
    localStorage.setItem(LOCAL_COMMODITY_IMAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

/**
 * Persist or clear a commodity's custom image in local fallback storage.
 * Uses `null` sentinel to remember explicit removals before DB column exists.
 *
 * @param {{ id?: string, commodity_code?: string }} commodity
 * @param {string|null} imageUrl
 */
export function saveLocalCommodityImage(commodity, imageUrl) {
  if (!commodity) return;
  const store = readLocalImageStore();
  const value = imageUrl || null;
  if (commodity.id) {
    store[`id:${commodity.id}`] = value;
  }
  if (commodity.commodity_code) {
    store[`code:${String(commodity.commodity_code).trim().toUpperCase()}`] = value;
  }
  writeLocalImageStore(store);
}

/**
 * Hydrate `commodity.image_url` from DB value first, falling back to local cache
 * when the `image_url` column has not yet been added in Supabase.
 *
 * @param {Object} commodity
 * @returns {Object}
 */
export function hydrateCommodityImage(commodity) {
  if (!commodity || typeof commodity !== 'object') return commodity;

  // If DB already returned image_url column (either string or explicit null when column exists)
  if (typeof commodity.image_url === 'string' && commodity.image_url.trim()) {
    saveLocalCommodityImage(commodity, commodity.image_url.trim());
    return commodity;
  }

  // If DB row does not have a non-empty image_url, check local fallback store
  if (!('image_url' in commodity) || commodity.image_url == null) {
    const store = readLocalImageStore();
    const idKey = commodity.id ? `id:${commodity.id}` : null;
    const codeKey = commodity.commodity_code
      ? `code:${String(commodity.commodity_code).trim().toUpperCase()}`
      : null;

    if (idKey && typeof store[idKey] === 'string' && store[idKey].trim()) {
      commodity.image_url = store[idKey];
    } else if (codeKey && typeof store[codeKey] === 'string' && store[codeKey].trim()) {
      commodity.image_url = store[codeKey];
    }
  }

  return commodity;
}

/**
 * Resize and compress an uploaded commodity photo into a clean JPEG Data URL.
 * Fits proportionally onto a 640x420 soft-white canvas (~18-35 KB output).
 *
 * @param {File} file
 * @param {{ maxWidth?: number, maxHeight?: number, quality?: number }} [opts]
 * @returns {Promise<string>}
 */
export function compressCommodityImage(file, opts = {}) {
  const maxWidth = opts.maxWidth || 640;
  const maxHeight = opts.maxHeight || 420;
  const quality = opts.quality || 0.84;

  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file (JPG, PNG, or WebP).'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error('Image file must be smaller than 10 MB.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Selected image could not be decoded.'));
      img.onload = () => {
        try {
          const srcW = img.naturalWidth || img.width || 1;
          const srcH = img.naturalHeight || img.height || 1;

          // Scale down if larger than target bounds while keeping natural proportions
          const scale = Math.min(1, maxWidth / srcW, maxHeight / srcH);
          const outW = Math.max(1, Math.round(srcW * scale));
          const outH = Math.max(1, Math.round(srcH * scale));

          const canvas = document.createElement('canvas');
          canvas.width = outW;
          canvas.height = outH;

          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, outW, outH);
          ctx.drawImage(img, 0, 0, outW, outH);

          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (err) {
          reject(err);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Resolve category theme & crisp inline SVG vector illustration for commodities
 * that do not have a custom photo uploaded yet.
 *
 * @param {{ category?: string, name?: string }} [item]
 * @returns {{ label: string, bgGradient: string, accentColor: string, badgeBg: string, svgHtml: string }}
 */
export function getCategoryArtwork(item = {}) {
  const cat = String(item?.category || '').trim().toLowerCase();
  const name = String(item?.name || '').trim().toLowerCase();

  // 1. Bakery / Nutribun / Fresh Bread
  if (isNutribunName(name) || /bakery|perishable|bread|bun|pastry/.test(cat)) {
    return {
      label: 'Bakery / Perishables',
      bgGradient: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 55%, #fed7aa 100%)',
      accentColor: '#c2410c',
      badgeBg: 'rgba(194, 65, 12, 0.10)',
      svgHtml: `
        <svg viewBox="0 0 160 104" width="144" height="94" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="80" cy="52" r="42" fill="#ffffff" fill-opacity="0.72"/>
          <path d="M40 64C40 44 57 32 80 32C103 32 120 44 120 64C120 70 115 74 108 74H52C45 74 40 70 40 64Z" fill="#f59e0b" fill-opacity="0.22" stroke="#c2410c" stroke-width="2.6" stroke-linejoin="round"/>
          <path d="M62 41C65 46 66 51 65 56M80 38C83 44 84 50 83 56M98 41C101 46 102 51 101 56" stroke="#c2410c" stroke-width="2.4" stroke-linecap="round"/>
          <path d="M34 74H126" stroke="#9a3412" stroke-width="2.6" stroke-linecap="round"/>
          <path d="M114 24C118 20 124 20 126 24C122 28 117 28 114 24Z" fill="#ea580c" fill-opacity="0.45"/>
        </svg>`,
    };
  }

  // 2. Milk / Dairy Powder / Liquid Milk
  if (/\bmilk\b|dairy|lact/.test(name) || /milk|dairy/.test(cat)) {
    return {
      label: item?.category || 'Dairy Nutrition',
      bgGradient: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 55%, #bae6fd 100%)',
      accentColor: '#0369a1',
      badgeBg: 'rgba(3, 105, 161, 0.10)',
      svgHtml: `
        <svg viewBox="0 0 160 104" width="144" height="94" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="80" cy="52" r="42" fill="#ffffff" fill-opacity="0.76"/>
          <path d="M66 24H94L98 36V76C98 79.3 95.3 82 92 82H68C64.7 82 62 79.3 62 76V36L66 24Z" fill="#38bdf8" fill-opacity="0.20" stroke="#0284c7" stroke-width="2.6" stroke-linejoin="round"/>
          <path d="M63 36H97M69 20H91" stroke="#0284c7" stroke-width="2.6" stroke-linecap="round"/>
          <path d="M80 48C80 48 72 57 72 62C72 66.4 75.6 70 80 70C84.4 70 88 66.4 88 62C88 57 80 48 80 48Z" fill="#0284c7" fill-opacity="0.28" stroke="#0369a1" stroke-width="2.2"/>
        </svg>`,
    };
  }

  // 3. Vitamins
  if (/vitamin/.test(cat) || /vitamin|retinol|ascorbic/.test(name)) {
    return {
      label: item?.category || 'Vitamins',
      bgGradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 55%, #fde68a 100%)',
      accentColor: '#b45309',
      badgeBg: 'rgba(180, 83, 9, 0.10)',
      svgHtml: `
        <svg viewBox="0 0 160 104" width="144" height="94" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="80" cy="52" r="42" fill="#ffffff" fill-opacity="0.75"/>
          <g transform="rotate(-32 80 52)">
            <rect x="50" y="39" width="60" height="26" rx="13" fill="#ffffff" stroke="#d97706" stroke-width="2.6"/>
            <path d="M80 39H97C104.2 39 110 44.8 110 52C110 59.2 104.2 65 97 65H80V39Z" fill="#f59e0b" fill-opacity="0.38"/>
            <line x1="80" y1="39" x2="80" y2="65" stroke="#d97706" stroke-width="2.4"/>
          </g>
          <circle cx="109" cy="30" r="6" fill="#fbbf24" fill-opacity="0.55" stroke="#d97706" stroke-width="1.8"/>
        </svg>`,
    };
  }

  // 4. Minerals
  if (/mineral/.test(cat) || /\biron\b|\bzinc\b|calcium|ferrous|folic|iodine/.test(name)) {
    return {
      label: item?.category || 'Minerals',
      bgGradient: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 55%, #99f6e4 100%)',
      accentColor: '#0f766e',
      badgeBg: 'rgba(15, 118, 110, 0.10)',
      svgHtml: `
        <svg viewBox="0 0 160 104" width="144" height="94" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="80" cy="52" r="42" fill="#ffffff" fill-opacity="0.76"/>
          <polygon points="80,22 106,37 106,67 80,82 54,67 54,37" fill="#14b8a6" fill-opacity="0.20" stroke="#0f766e" stroke-width="2.6" stroke-linejoin="round"/>
          <circle cx="80" cy="52" r="13" fill="#ffffff" stroke="#0f766e" stroke-width="2.2"/>
          <path d="M74 52H86M80 46V58" stroke="#0f766e" stroke-width="2.4" stroke-linecap="round"/>
        </svg>`,
    };
  }

  // 5. Therapeutics (RUTF / RUSF / Clinical Nutrition)
  if (/therapeutic/.test(cat) || /rutf|rusf|f-75|f-100|therapeutic|paste/.test(name)) {
    return {
      label: item?.category || 'Therapeutics',
      bgGradient: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 55%, #fecdd3 100%)',
      accentColor: '#be123c',
      badgeBg: 'rgba(190, 18, 60, 0.10)',
      svgHtml: `
        <svg viewBox="0 0 160 104" width="144" height="94" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="80" cy="52" r="42" fill="#ffffff" fill-opacity="0.78"/>
          <rect x="56" y="24" width="48" height="56" rx="9" fill="#fb7185" fill-opacity="0.20" stroke="#be123c" stroke-width="2.6"/>
          <path d="M56 33H104" stroke="#be123c" stroke-width="2.2" stroke-dasharray="3 3"/>
          <path d="M80 44V64M70 54H90" stroke="#be123c" stroke-width="3.2" stroke-linecap="round"/>
        </svg>`,
    };
  }

  // 6. Equipment (Scales, Height Boards, MUAC Tapes)
  if (/equipment|device|tool/.test(cat) || /scale|muac|board|caliper|tape/.test(name)) {
    return {
      label: item?.category || 'Equipment',
      bgGradient: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 55%, #c7d2fe 100%)',
      accentColor: '#4338ca',
      badgeBg: 'rgba(67, 56, 202, 0.10)',
      svgHtml: `
        <svg viewBox="0 0 160 104" width="144" height="94" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="80" cy="52" r="42" fill="#ffffff" fill-opacity="0.78"/>
          <rect x="52" y="28" width="56" height="48" rx="10" fill="#818cf8" fill-opacity="0.20" stroke="#4338ca" stroke-width="2.6"/>
          <path d="M66 48C70 40 90 40 94 48" stroke="#4338ca" stroke-width="2.4" stroke-linecap="round"/>
          <line x1="80" y1="49" x2="86" y2="41" stroke="#4338ca" stroke-width="2.6" stroke-linecap="round"/>
          <circle cx="80" cy="50" r="2.5" fill="#4338ca"/>
          <line x1="66" y1="64" x2="94" y2="64" stroke="#4338ca" stroke-width="2.4" stroke-linecap="round"/>
        </svg>`,
    };
  }

  // 7. Supplements & Default Nutrition Commodity
  return {
    label: item?.category || 'Supplements',
    bgGradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 55%, #a7f3d0 100%)',
    accentColor: '#047857',
    badgeBg: 'rgba(4, 120, 87, 0.10)',
    svgHtml: `
      <svg viewBox="0 0 160 104" width="144" height="94" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="80" cy="52" r="42" fill="#ffffff" fill-opacity="0.78"/>
        <path d="M56 30C56 26.7 58.7 24 62 24H98C101.3 24 104 26.7 104 30V74C104 77.3 101.3 80 98 80H62C58.7 80 56 77.3 56 74V30Z" fill="#10b981" fill-opacity="0.20" stroke="#047857" stroke-width="2.6"/>
        <path d="M56 33H104" stroke="#047857" stroke-width="2.2"/>
        <path d="M80 65C80 54 88 46 94 45C93 56 87 63 80 65Z" fill="#10b981" fill-opacity="0.45" stroke="#047857" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M80 65C80 56 73 49 67 48C68 57 73 63 80 65Z" fill="#34d399" fill-opacity="0.35" stroke="#047857" stroke-width="2.2" stroke-linejoin="round"/>
      </svg>`,
  };
}
