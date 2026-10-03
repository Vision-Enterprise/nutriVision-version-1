/**
 * Inventory Advisor - Interactive Analytics Console
 *
 * TV-style single-chart console with channel switching,
 * time filtering (year/quarter), granularity control
 * (daily/weekly/monthly/yearly for Release History),
 * product/commodity filter, display limits, and stock sorting.
 *
 * Designed for non-technical users:
 * - Spoon-fed key insights banner
 * - Plain language labels and human-readable tooltips
 * - Intuitive download icon (replaces confusing hamburger menu)
 * - Quick Export button in header
 */

import ApexCharts from 'apexcharts';

let tvChartInstance = null;
let currentChartData = null;
let currentExpirationSummary = null;

const chartFont = {
  fontFamily: "'Inter', sans-serif",
  foreColor: '#64748b',
};

const axisTitleStyle = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#475569',
};

// ── Modern Curated Palette for Multi-Product Bars ───────
const palette = [
  '#0d9488', // Teal
  '#2563eb', // Royal Blue
  '#7c3aed', // Violet
  '#ea580c', // Orange
  '#059669', // Emerald
  '#db2777', // Pink
  '#ca8a04', // Amber
  '#0284c7', // Sky Blue
  '#4f46e5', // Indigo
  '#e11d48', // Rose
];

// ── Shared toolbar with download icon (placed in top header slot) ──
const downloadIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

const chartToolbar = {
  show: true,
  offsetX: 0,
  offsetY: 0,
  tools: {
    download: downloadIcon,
    selection: false,
    zoom: false,
    zoomin: false,
    zoomout: false,
    pan: false,
    reset: false,
  },
  export: {
    csv: {
      filename: 'nutrivision-advisor-report',
      columnDelimiter: ',',
      headerCategory: 'Category',
      headerValue: 'Quantity',
    },
    svg: {
      filename: 'nutrivision-advisor-chart',
    },
    png: {
      filename: 'nutrivision-advisor-chart',
    }
  }
};

// ── Public API ──────────────────────────────────────────

export function initAdvCharts(chartData, expirationSummary) {
  currentChartData = chartData;
  currentExpirationSummary = expirationSummary;

  // Populate dynamic product / commodity dropdown
  const commoditySelect = document.getElementById('tv-tuner-commodity');
  if (commoditySelect && chartData) {
    const commoditySet = new Set();
    (chartData.batches || []).forEach(b => {
      if (b.commodities?.name) commoditySet.add(b.commodities.name);
    });
    (chartData.releases || []).forEach(r => {
      if (r.batches?.commodities?.name) commoditySet.add(r.batches.commodities.name);
    });

    const commodities = Array.from(commoditySet).sort();
    const currentVal = commoditySelect.value || 'all';
    commoditySelect.innerHTML = `<option value="all">All Products</option>` +
      commodities.map(c => `<option value="${c}">${c}</option>`).join('');
    if (commodities.includes(currentVal)) {
      commoditySelect.value = currentVal;
    }
  }

  // Channel buttons
  const channelBtns = document.querySelectorAll('.tv-channel-btn');
  channelBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      channelBtns.forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-outline');
      });
      const target = e.currentTarget;
      target.classList.remove('btn-outline');
      target.classList.add('btn-primary');
      renderAdvChart(target.dataset.channel, currentChartData, currentExpirationSummary);
    });
  });

  // Time & custom tuners
  const rerender = () => {
    const ch = document.querySelector('.tv-channel-btn.btn-primary')?.dataset.channel || 'barangay';
    renderAdvChart(ch, currentChartData, currentExpirationSummary);
  };

  document.getElementById('tv-tuner-year')?.addEventListener('change', rerender);
  document.getElementById('tv-tuner-period')?.addEventListener('change', rerender);
  document.getElementById('tv-tuner-granularity')?.addEventListener('change', rerender);
  document.getElementById('tv-tuner-commodity')?.addEventListener('change', rerender);
  document.getElementById('tv-tuner-limit')?.addEventListener('change', rerender);
  document.getElementById('tv-tuner-stock-sort')?.addEventListener('change', rerender);
}

export function renderAdvChart(channel, chartData, _expSummary) {
  const el = document.getElementById('tv-console-chart');
  if (!el) return;

  const yearFilter = document.getElementById('tv-tuner-year')?.value || 'all';
  const periodFilter = document.getElementById('tv-tuner-period')?.value || 'all';
  const granularity = document.getElementById('tv-tuner-granularity')?.value || 'monthly';
  const commodityFilter = document.getElementById('tv-tuner-commodity')?.value || 'all';
  const limitFilter = document.getElementById('tv-tuner-limit')?.value || '10';
  const stockSort = document.getElementById('tv-tuner-stock-sort')?.value || 'lowest';

  // Toggle tuner visibility based on active channel
  const yearWrap = document.getElementById('tv-tuner-year-wrap');
  const periodWrap = document.getElementById('tv-tuner-period-wrap');
  const granWrap = document.getElementById('tv-tuner-granularity-wrap');
  const commWrap = document.getElementById('tv-tuner-commodity-wrap');
  const limitWrap = document.getElementById('tv-tuner-limit-wrap');
  const stockSortWrap = document.getElementById('tv-tuner-stock-sort-wrap');
  const expiryNote = document.getElementById('tv-tuner-expiry-note');

  if (yearWrap) yearWrap.style.display = channel !== 'expiry' ? 'flex' : 'none';
  if (periodWrap) periodWrap.style.display = channel !== 'expiry' ? 'flex' : 'none';
  if (granWrap) granWrap.style.display = channel === 'velocity' ? 'flex' : 'none';
  if (commWrap) commWrap.style.display = 'flex';
  if (limitWrap) limitWrap.style.display = channel === 'barangay' ? 'flex' : 'none';
  if (stockSortWrap) stockSortWrap.style.display = channel === 'stock' ? 'flex' : 'none';
  if (expiryNote) expiryNote.style.display = channel === 'expiry' ? 'flex' : 'none';

  // Filter releases by year + quarter + commodity
  const filterReleases = (releases) => {
    return (releases || []).filter(r => {
      const d = new Date(r.released_at);
      if (yearFilter !== 'all' && d.getFullYear().toString() !== yearFilter) return false;
      if (periodFilter !== 'all') {
        const m = d.getMonth() + 1;
        if (periodFilter === 'q1' && (m < 1 || m > 3)) return false;
        if (periodFilter === 'q2' && (m < 4 || m > 6)) return false;
        if (periodFilter === 'q3' && (m < 7 || m > 9)) return false;
        if (periodFilter === 'q4' && (m < 10 || m > 12)) return false;
      }
      if (commodityFilter !== 'all' && r.batches?.commodities?.name !== commodityFilter) return false;
      return true;
    });
  };

  const filteredReleases = filterReleases(chartData.releases);

  let options = {};
  let title = '';
  let subtitle = '';
  let tickerTotal = '';
  let tickerTop = '';
  let insightHtml = '';

  // ── Channel: Barangay Breakdown ───────────────────────
  if (channel === 'barangay') {
    const isSingleProd = commodityFilter !== 'all';
    title = isSingleProd ? `Supplies Delivered to Barangays: ${commodityFilter}` : 'Where do supplies go?';
    subtitle = isSingleProd 
      ? `Shows units of ${commodityFilter} delivered to each barangay`
      : 'See how many supplies each barangay received, broken down by product type';

    const brgyMap = {};
    let totalDist = 0;
    const commoditiesSet = new Set();

    filteredReleases.forEach(r => {
      if (r.barangay && r.batches?.commodities?.name) {
        const b = r.barangay;
        const c = r.batches.commodities.name;
        if (!brgyMap[b]) brgyMap[b] = { total: 0, items: {} };
        brgyMap[b].items[c] = (brgyMap[b].items[c] || 0) + (r.quantity || 0);
        brgyMap[b].total += (r.quantity || 0);
        totalDist += (r.quantity || 0);
        commoditiesSet.add(c);
      }
    });

    let sortedBrgy = Object.keys(brgyMap).sort((a, b) => brgyMap[b].total - brgyMap[a].total);
    if (limitFilter !== 'all') {
      const n = parseInt(limitFilter, 10) || 10;
      sortedBrgy = sortedBrgy.slice(0, n);
    }

    const commoditiesList = Array.from(commoditiesSet);
    const series = isSingleProd 
      ? [{ name: commodityFilter, data: sortedBrgy.map(b => brgyMap[b].items[commodityFilter] || 0) }]
      : commoditiesList.map(c => ({
          name: c,
          data: sortedBrgy.map(b => brgyMap[b].items[c] || 0)
        }));

    tickerTotal = `${totalDist.toLocaleString()} units distributed`;
    tickerTop = sortedBrgy.length > 0
      ? `${sortedBrgy[0]} (${brgyMap[sortedBrgy[0]].total.toLocaleString()})`
      : 'No data';

    // Spoon-fed insight
    if (sortedBrgy.length > 0 && totalDist > 0) {
      const topName = sortedBrgy[0];
      const topQty = brgyMap[topName].total;
      const topPct = Math.round((topQty / totalDist) * 100);
      insightHtml = `<strong>Key Takeaway:</strong> <strong>${topName}</strong> received the largest distribution (${topQty.toLocaleString()} units, ~${topPct}% of all allocated supplies). A total of <strong>${Object.keys(brgyMap).length} barangays</strong> were supplied.`;
    } else {
      insightHtml = `<strong>Key Takeaway:</strong> No distribution records found for this period or product filter. Try selecting <em>All Years</em> or <em>All Products</em>.`;
    }

    options = {
      series: series.length > 0 && sortedBrgy.length > 0 ? series : [{ name: 'No Data', data: [] }],
      chart: {
        type: 'bar',
        stacked: !isSingleProd,
        height: Math.max(380, sortedBrgy.length * 36),
        toolbar: chartToolbar,
        fontFamily: chartFont.fontFamily,
      },
      colors: isSingleProd ? ['#059669'] : palette,
      plotOptions: {
        bar: { horizontal: true, barHeight: '70%', borderRadius: 3 }
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => val > 0 ? val.toLocaleString() : '',
        style: { fontSize: '11px', fontWeight: 600 }
      },
      xaxis: {
        categories: sortedBrgy.length > 0 ? sortedBrgy : ['No Data'],
        title: { text: 'Number of Items Delivered', style: axisTitleStyle, offsetY: -5 },
        labels: { style: { fontSize: '11px', colors: chartFont.foreColor }, formatter: (v) => Number(v).toLocaleString() }
      },
      yaxis: {
        title: { text: 'Barangay', style: axisTitleStyle },
        labels: { style: { fontSize: '12px', colors: '#1e293b', fontWeight: 500 } }
      },
      legend: { position: 'top', horizontalAlign: 'left', offsetY: -5, fontSize: '12px', show: !isSingleProd },
      grid: { borderColor: '#f1f5f9', strokeDashArray: 3 },
      tooltip: {
        y: { formatter: (val) => `${val.toLocaleString()} units` }
      }
    };

  // ── Channel: Stock Status ─────────────────────────────
  } else if (channel === 'stock') {
    title = 'How much stock is left?';
    subtitle = 'Compare items remaining in storage against what has been distributed';

    const stockMap = {};
    const releaseMap = {};

    (chartData.batches || []).forEach(b => {
      const n = b.commodities?.name;
      if (n && (commodityFilter === 'all' || n === commodityFilter)) {
        stockMap[n] = (stockMap[n] || 0) + (b.quantity || 0);
      }
    });

    filteredReleases.forEach(r => {
      const n = r.batches?.commodities?.name;
      if (n && (commodityFilter === 'all' || n === commodityFilter)) {
        releaseMap[n] = (releaseMap[n] || 0) + (r.quantity || 0);
      }
    });

    let allN = Array.from(new Set([...Object.keys(stockMap), ...Object.keys(releaseMap)]));

    if (stockSort === 'lowest') {
      allN.sort((a, b) => (stockMap[a] || 0) - (stockMap[b] || 0));
    } else if (stockSort === 'highest') {
      allN.sort((a, b) => (stockMap[b] || 0) - (stockMap[a] || 0));
    } else { // distributed
      allN.sort((a, b) => (releaseMap[b] || 0) - (releaseMap[a] || 0));
    }

    const topN = allN.slice(0, 10);
    const sData = topN.map(n => stockMap[n] || 0);
    const rData = topN.map(n => releaseMap[n] || 0);

    let tStock = 0; sData.forEach(v => tStock += v);
    let tRel = 0; rData.forEach(v => tRel += v);

    tickerTotal = `${tStock.toLocaleString()} in storage`;
    tickerTop = `${tRel.toLocaleString()} distributed`;

    // Spoon-fed insight
    if (topN.length > 0) {
      const lowestProd = [...topN].sort((a, b) => (stockMap[a] || 0) - (stockMap[b] || 0))[0];
      const lowestStock = stockMap[lowestProd] || 0;
      const mostDistProd = [...topN].sort((a, b) => (releaseMap[b] || 0) - (releaseMap[a] || 0))[0];
      const mostDistQty = releaseMap[mostDistProd] || 0;

      insightHtml = `<strong>Key Takeaway:</strong> <strong>${lowestProd}</strong> has the lowest storage level (<strong>${lowestStock.toLocaleString()} units remaining</strong>). <strong>${mostDistProd}</strong> is the most distributed commodity (${mostDistQty.toLocaleString()} units given out).`;
    } else {
      insightHtml = `<strong>Key Takeaway:</strong> No stock or release records match your current filter.`;
    }

    options = {
      series: [
        { name: 'Still In Storage', data: sData },
        { name: 'Already Distributed', data: rData }
      ],
      chart: {
        type: 'bar',
        height: 400,
        toolbar: chartToolbar,
        fontFamily: chartFont.fontFamily,
      },
      colors: ['#059669', '#2563eb'],
      plotOptions: {
        bar: { horizontal: false, columnWidth: '55%', borderRadius: 4 }
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => val > 0 ? val.toLocaleString() : '',
        style: { fontSize: '10px', colors: ['#fff'] },
        dropShadow: { enabled: true, top: 1, left: 1, blur: 1, opacity: 0.5 }
      },
      xaxis: {
        categories: topN.length > 0 ? topN : ['No Data'],
        title: { text: 'Commodity Product', style: axisTitleStyle, offsetY: -5 },
        labels: { style: { fontSize: '11px', colors: chartFont.foreColor }, rotate: -25, trim: true, maxHeight: 70 }
      },
      yaxis: {
        title: { text: 'Number of Items', style: axisTitleStyle },
        labels: { style: { fontSize: '11px', colors: chartFont.foreColor }, formatter: (v) => Math.round(v).toLocaleString() }
      },
      legend: { position: 'top', horizontalAlign: 'left', offsetY: -5, fontSize: '12px' },
      grid: { borderColor: '#f1f5f9', strokeDashArray: 3 },
      tooltip: {
        y: { formatter: (val) => `${val.toLocaleString()} units` }
      }
    };

  // ── Channel: Release History (Daily / Weekly / Monthly / Yearly) ──
  } else if (channel === 'velocity') {
    const granLabel = granularity.charAt(0).toUpperCase() + granularity.slice(1);
    const prodLabel = commodityFilter !== 'all' ? ` for ${commodityFilter}` : '';
    title = `Release History (${granLabel}${prodLabel})`;
    subtitle = `Track when and how many items were given out — grouped by ${granularity === 'daily' ? 'day' : granularity === 'weekly' ? 'week' : granularity === 'yearly' ? 'year' : 'month'}`;

    const dataMap = {};
    const labelMap = {};
    let totalVel = 0;

    filteredReleases.forEach(r => {
      const d = new Date(r.released_at);
      let key = '';
      let displayLabel = '';

      if (granularity === 'daily') {
        key = d.toISOString().split('T')[0];
        displayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (granularity === 'weekly') {
        const dCopy = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const dayNum = dCopy.getUTCDay() || 7;
        dCopy.setUTCDate(dCopy.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(dCopy.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil(((dCopy - yearStart) / 86400000 + 1) / 7);
        key = `${dCopy.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
        displayLabel = `Wk ${weekNo}, ${dCopy.getUTCFullYear()}`;
      } else if (granularity === 'monthly') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        displayLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } else {
        key = `${d.getFullYear()}`;
        displayLabel = `${d.getFullYear()}`;
      }

      dataMap[key] = (dataMap[key] || 0) + (r.quantity || 0);
      labelMap[key] = displayLabel;
      totalVel += (r.quantity || 0);
    });

    const sortedKeys = Object.keys(dataMap).sort();
    const sortedValues = sortedKeys.map(k => dataMap[k]);
    const displayCategories = sortedKeys.map(k => labelMap[k]);

    tickerTotal = `${totalVel.toLocaleString()} items released`;
    if (sortedValues.length > 0) {
      const maxVal = Math.max(...sortedValues);
      const maxIdx = sortedValues.indexOf(maxVal);
      tickerTop = `${labelMap[sortedKeys[maxIdx]]} (${maxVal.toLocaleString()})`;

      insightHtml = `<strong>Key Takeaway:</strong> Highest distribution occurred during <strong>${labelMap[sortedKeys[maxIdx]]}</strong> with <strong>${maxVal.toLocaleString()} units</strong> given out. A total of <strong>${totalVel.toLocaleString()} units</strong> were distributed across <strong>${sortedKeys.length} ${granularity} periods</strong>.`;
    } else {
      tickerTop = 'No activity';
      insightHtml = `<strong>Key Takeaway:</strong> No release records found matching your selected date and product filters.`;
    }

    options = {
      series: [{ name: 'Items Given Out', data: sortedValues }],
      chart: {
        type: 'area',
        height: 400,
        toolbar: chartToolbar,
        fontFamily: chartFont.fontFamily,
      },
      colors: ['#2563eb'],
      stroke: { curve: 'smooth', width: 3 },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05, stops: [0, 95, 100] } },
      markers: { size: sortedValues.length <= 20 ? 5 : 2, hover: { size: 7 } },
      dataLabels: {
        enabled: sortedValues.length <= 12,
        formatter: (val) => val > 0 ? val.toLocaleString() : '',
        offsetY: -8,
        style: { fontSize: '11px', fontWeight: 600, colors: ['#1d4ed8'] },
        background: { enabled: true, foreColor: '#1e40af', borderRadius: 4, padding: 4, opacity: 0.9, borderWidth: 1, borderColor: '#bfdbfe' }
      },
      xaxis: {
        categories: displayCategories.length > 0 ? displayCategories : ['No Activity'],
        title: { text: `Timeline (${granLabel})`, style: axisTitleStyle, offsetY: -5 },
        labels: { style: { fontSize: '11px', colors: chartFont.foreColor }, rotate: sortedKeys.length > 8 ? -35 : 0, rotateAlways: sortedKeys.length > 12 }
      },
      yaxis: {
        title: { text: 'Number of Items Released', style: axisTitleStyle },
        labels: { style: { fontSize: '11px', colors: chartFont.foreColor }, formatter: (v) => Math.round(v).toLocaleString() }
      },
      grid: { borderColor: '#f1f5f9', strokeDashArray: 3 },
      tooltip: {
        y: { formatter: (val) => `${val.toLocaleString()} units` }
      }
    };

  // ── Channel: Expiry Check ─────────────────────────────
  } else if (channel === 'expiry') {
    const prodLabel = commodityFilter !== 'all' ? ` for ${commodityFilter}` : '';
    title = `Which items are expiring soon?${prodLabel}`;
    subtitle = 'Identifies urgent batches in storage requiring immediate distribution before expiration';

    const now = new Date();
    const horizons = {
      critical: { label: 'Expiring This Month (<=30d)', qty: 0, color: '#dc2626' },
      near:     { label: 'Expiring in 1–3 Months',       qty: 0, color: '#ea580c' },
      moderate: { label: 'Expiring in 3–6 Months',       qty: 0, color: '#eab308' },
      good:     { label: 'Safe (> 6 Months)',            qty: 0, color: '#059669' },
    };

    let totalStock = 0;
    (chartData.batches || []).forEach(b => {
      if (!b.expiration_date) return;
      if (commodityFilter !== 'all' && b.commodities?.name !== commodityFilter) return;

      const diffDays = Math.ceil((new Date(b.expiration_date) - now) / (1000 * 60 * 60 * 24));
      const qty = b.quantity || 0;
      totalStock += qty;

      if (diffDays <= 30) horizons.critical.qty += qty;
      else if (diffDays <= 90) horizons.near.qty += qty;
      else if (diffDays <= 180) horizons.moderate.qty += qty;
      else horizons.good.qty += qty;
    });

    tickerTotal = `${totalStock.toLocaleString()} units in stock`;
    tickerTop = horizons.critical.qty > 0
      ? `⚠ ${horizons.critical.qty.toLocaleString()} critical`
      : horizons.near.qty > 0
        ? `${horizons.near.qty.toLocaleString()} near expiry`
        : 'All safe';

    if (horizons.critical.qty > 0) {
      insightHtml = `<strong>Urgent Restock Action:</strong> <strong>${horizons.critical.qty.toLocaleString()} units</strong> expire within 30 days! Prioritize immediate release to barangays to prevent waste.`;
    } else if (horizons.near.qty > 0) {
      insightHtml = `<strong>Notice:</strong> <strong>${horizons.near.qty.toLocaleString()} units</strong> will expire in 1–3 months. Plan allocation for upcoming community feeding programs.`;
    } else if (totalStock > 0) {
      insightHtml = `<strong>Optimal Health:</strong> All <strong>${totalStock.toLocaleString()} units</strong> currently have over 3 months of shelf life. Zero immediate expiry risks detected.`;
    } else {
      insightHtml = `<strong>Notice:</strong> No inventory batches found matching the selected commodity filter.`;
    }

    const hKeys = ['critical', 'near', 'moderate', 'good'];

    options = {
      series: [{ name: 'Number of Items', data: hKeys.map(k => horizons[k].qty) }],
      chart: {
        type: 'bar',
        height: 400,
        toolbar: chartToolbar,
        fontFamily: chartFont.fontFamily,
      },
      plotOptions: { bar: { distributed: true, columnWidth: '50%', borderRadius: 6 } },
      colors: hKeys.map(k => horizons[k].color),
      dataLabels: {
        enabled: true,
        formatter: (val) => val > 0 ? `${val.toLocaleString()} units` : '0',
        style: { fontSize: '12px', fontWeight: 600, colors: ['#ffffff'] },
        dropShadow: { enabled: true, top: 1, left: 1, blur: 1, opacity: 0.5 }
      },
      xaxis: {
        categories: hKeys.map(k => horizons[k].label),
        title: { text: 'Expiration Urgency Level', style: axisTitleStyle, offsetY: -5 },
        labels: { style: { fontSize: '11px', colors: chartFont.foreColor, fontWeight: 600 } }
      },
      yaxis: {
        title: { text: 'Number of Units in Storage', style: axisTitleStyle },
        labels: { style: { fontSize: '11px', colors: chartFont.foreColor }, formatter: (v) => Math.round(v).toLocaleString() }
      },
      legend: { show: false },
      grid: { borderColor: '#f1f5f9', strokeDashArray: 3 },
      tooltip: {
        y: { formatter: (val) => `${val.toLocaleString()} units` }
      }
    };
  }

  // Update header, ticker, and insight banner
  const titleEl = document.getElementById('tv-console-title');
  const subtitleEl = document.getElementById('tv-console-subtitle');
  const totalEl = document.getElementById('tv-ticker-total');
  const topEl = document.getElementById('tv-ticker-top');
  const insightEl = document.getElementById('tv-console-insight-text');

  if (titleEl) titleEl.textContent = title;
  if (subtitleEl) subtitleEl.textContent = subtitle;
  if (totalEl) totalEl.textContent = tickerTotal;
  if (topEl) topEl.textContent = tickerTop;
  if (insightEl) insightEl.innerHTML = insightHtml;

  // Destroy old instance and render new
  if (tvChartInstance) {
    try {
      tvChartInstance.destroy();
    } catch (e) {
      console.warn('[AdvisorCharts] Destroy error:', e);
    }
  }

  const moveToolbarToSlot = () => {
    const toolbar = el.querySelector('.apexcharts-toolbar');
    const slot = document.getElementById('tv-chart-toolbar-slot');
    if (toolbar && slot) {
      slot.innerHTML = '';
      slot.appendChild(toolbar);
    }
  };

  tvChartInstance = new ApexCharts(el, options);
  const renderPromise = tvChartInstance.render();
  if (renderPromise && typeof renderPromise.then === 'function') {
    renderPromise.then(moveToolbarToSlot);
  } else {
    setTimeout(moveToolbarToSlot, 50);
  }
}

export function destroyAdvCharts() {
  const slot = document.getElementById('tv-chart-toolbar-slot');
  if (slot) slot.innerHTML = '';
  if (tvChartInstance) {
    try { tvChartInstance.destroy(); } catch (e) {}
    tvChartInstance = null;
  }
}
