/**
 * Dashboard - Charts (ApexCharts)
 *
 * Professional, executive-grade SVG charts with native data labels and export capabilities:
 *   1. Releases Over Time (Smooth gradient area chart with live timeframe selector)
 *   2. Stock Utilization (In-Stock vs. Total Released grouped columns)
 *   3. Top Barangays Distribution Reach (Ranked horizontal bars with percentage labels)
 *   4. Expiration Risk Horizon (Urgency horizons: Critical <30d, Near Expiry, Moderate, Good)
 */

import ApexCharts from 'apexcharts';

let _chartInstances = {};

export function initDashboardCharts(chartData, expirationSummary) {
  destroyDashboardCharts();

  // ── Common Styling & Fonts ──────────────────────────────────────────────
  const chartFont = {
    fontFamily: "'Inter', sans-serif",
    foreColor: '#64748b',
  };

  // ── 1. Stock Utilization (In-Stock vs. Total Distributed) ───────────────
  // Aggregate both current active stock and total released for each commodity
  const stockByCommodity = {};
  const releasedByCommodity = {};

  chartData.batches.forEach(b => {
    const name = b.commodities?.name || 'Unknown';
    stockByCommodity[name] = (stockByCommodity[name] || 0) + (b.quantity || 0);
  });

  chartData.releases.forEach(r => {
    const name = r.batches?.commodities?.name || 'Unknown';
    releasedByCommodity[name] = (releasedByCommodity[name] || 0) + (r.quantity || 0);
  });

  // Get all unique commodity names
  const allCommodityNames = Array.from(
    new Set([...Object.keys(stockByCommodity), ...Object.keys(releasedByCommodity)])
  ).filter(n => n !== 'Unknown');

  // Sort by combined volume (descending), top 7
  allCommodityNames.sort((a, b) => {
    const volA = (stockByCommodity[a] || 0) + (releasedByCommodity[a] || 0);
    const volB = (stockByCommodity[b] || 0) + (releasedByCommodity[b] || 0);
    return volB - volA;
  });

  const topCommodities = allCommodityNames.slice(0, 7);
  const stockSeriesData = topCommodities.map(c => stockByCommodity[c] || 0);
  const releasedSeriesData = topCommodities.map(c => releasedByCommodity[c] || 0);

  const elStock = document.getElementById('chart-stock');
  if (elStock) {
    const stockOptions = {
      series: [
        { name: 'Available In Stock', data: stockSeriesData },
        { name: 'Total Distributed', data: releasedSeriesData },
      ],
      chart: {
        type: 'bar',
        height: 310,
        toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false } },
        fontFamily: chartFont.fontFamily,
      },
      colors: ['#059669', '#2563eb'],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 4,
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => (val > 0 ? val.toLocaleString() : ''),
        style: {
          fontSize: '10px',
          fontWeight: 600,
          colors: ['#ffffff'],
        },
        dropShadow: { enabled: true, top: 1, left: 1, blur: 1, opacity: 0.45 },
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent'],
      },
      xaxis: {
        categories: topCommodities.length > 0 ? topCommodities : ['No Data'],
        labels: {
          style: { fontSize: '11px', colors: chartFont.foreColor },
          rotate: -20,
          rotateAlways: false,
          trim: true,
          maxHeight: 60,
        },
      },
      yaxis: {
        labels: {
          style: { fontSize: '11px', colors: chartFont.foreColor },
          formatter: (val) => Math.round(val).toLocaleString(),
        },
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '12px',
        markers: { radius: 12 },
      },
      grid: {
        borderColor: '#f1f5f9',
        strokeDashArray: 3,
      },
      tooltip: {
        y: {
          formatter: (val) => `${val.toLocaleString()} units`,
        },
      },
      noData: {
        text: 'No stock or release data available',
        style: { fontSize: '14px', color: '#94a3b8' },
      },
    };

    _chartInstances['stock'] = new ApexCharts(elStock, stockOptions);
    _chartInstances['stock'].render();
  }

  // ── 2. Top Barangays Distribution Reach ─────────────────────────────────
  const brgyMap = {};
  let totalDistributedAll = 0;
  chartData.releases.forEach(r => {
    if (r.barangay) {
      brgyMap[r.barangay] = (brgyMap[r.barangay] || 0) + (r.quantity || 0);
      totalDistributedAll += (r.quantity || 0);
    }
  });

  const sortedBrgy = Object.entries(brgyMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const brgyCategories = sortedBrgy.map(item => item[0]);
  const brgyValues = sortedBrgy.map(item => item[1]);

  const elBrgy = document.getElementById('chart-barangay');
  if (elBrgy) {
    const brgyOptions = {
      series: [{ name: 'Distributed Units', data: brgyValues }],
      chart: {
        type: 'bar',
        height: 310,
        toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false } },
        fontFamily: chartFont.fontFamily,
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '62%',
          borderRadius: 4,
          dataLabels: { position: 'top' },
        },
      },
      colors: ['#0d9488'],
      dataLabels: {
        enabled: true,
        offsetX: 28,
        formatter: (val) => {
          const pct = totalDistributedAll > 0 ? ((val / totalDistributedAll) * 100).toFixed(1) : 0;
          return `${val.toLocaleString()} (${pct}%)`;
        },
        style: {
          fontSize: '11px',
          fontWeight: 600,
          colors: ['#1e293b'],
        },
      },
      xaxis: {
        categories: brgyCategories.length > 0 ? brgyCategories : ['No Data'],
        labels: {
          style: { fontSize: '11px', colors: chartFont.foreColor },
          formatter: (v) => v.toLocaleString(),
        },
      },
      yaxis: {
        labels: {
          style: { fontSize: '11px', colors: chartFont.foreColor, fontWeight: 500 },
        },
      },
      grid: {
        borderColor: '#f1f5f9',
        strokeDashArray: 3,
      },
      tooltip: {
        y: {
          formatter: (val) => `${val.toLocaleString()} units (${totalDistributedAll > 0 ? ((val / totalDistributedAll) * 100).toFixed(1) : 0}% of municipal total)`,
        },
      },
      noData: {
        text: 'No distribution records available',
        style: { fontSize: '14px', color: '#94a3b8' },
      },
    };

    _chartInstances['barangay'] = new ApexCharts(elBrgy, brgyOptions);
    _chartInstances['barangay'].render();
  }

  // ── 3. Expiration Risk Horizon (Replacing the Old Static Pie Chart) ─────
  // Computes active stock quantity & batches across 4 operational urgency horizons:
  //   - Critical (< 30 days)  -> Red #dc2626
  //   - Near Expiry (30-90d)  -> Orange #ea580c
  //   - Moderate (3-6 Months) -> Yellow #eab308
  //   - Good (> 6 Months)     -> Green #059669
  const now = new Date();
  const horizons = {
    critical: { label: 'Critical (< 30d)', qty: 0, batches: 0, color: '#dc2626' },
    near:     { label: 'Near Expiry (1–3m)', qty: 0, batches: 0, color: '#ea580c' },
    moderate: { label: 'Moderate (3–6m)', qty: 0, batches: 0, color: '#eab308' },
    good:     { label: 'Good (> 6m)',     qty: 0, batches: 0, color: '#059669' },
  };

  chartData.batches.forEach(b => {
    if (!b.expiration_date) return;
    const diffDays = Math.ceil((new Date(b.expiration_date) - now) / (1000 * 60 * 60 * 24));
    const qty = b.quantity || 0;

    if (diffDays <= 30) {
      horizons.critical.qty += qty;
      horizons.critical.batches++;
    } else if (diffDays <= 90) {
      horizons.near.qty += qty;
      horizons.near.batches++;
    } else if (diffDays <= 180) {
      horizons.moderate.qty += qty;
      horizons.moderate.batches++;
    } else {
      horizons.good.qty += qty;
      horizons.good.batches++;
    }
  });

  const horizonCategories = [
    horizons.critical.label,
    horizons.near.label,
    horizons.moderate.label,
    horizons.good.label,
  ];
  const horizonValues = [
    horizons.critical.qty,
    horizons.near.qty,
    horizons.moderate.qty,
    horizons.good.qty,
  ];
  const horizonBatches = [
    horizons.critical.batches,
    horizons.near.batches,
    horizons.moderate.batches,
    horizons.good.batches,
  ];

  const elExpiry = document.getElementById('chart-expiry');
  if (elExpiry) {
    const expiryOptions = {
      series: [{ name: 'In-Stock Quantity', data: horizonValues }],
      chart: {
        type: 'bar',
        height: 310,
        toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false } },
        fontFamily: chartFont.fontFamily,
      },
      plotOptions: {
        bar: {
          distributed: true,
          columnWidth: '50%',
          borderRadius: 6,
        },
      },
      colors: [horizons.critical.color, horizons.near.color, horizons.moderate.color, horizons.good.color],
      dataLabels: {
        enabled: true,
        formatter: (val, opt) => {
          const bCount = horizonBatches[opt.dataPointIndex];
          if (val === 0) return '0';
          return `${val.toLocaleString()}\n(${bCount} batch${bCount !== 1 ? 'es' : ''})`;
        },
        style: {
          fontSize: '11px',
          fontWeight: 600,
          colors: ['#ffffff'],
        },
        dropShadow: { enabled: true, top: 1, left: 1, blur: 1, opacity: 0.5 },
      },
      xaxis: {
        categories: horizonCategories,
        labels: {
          style: { fontSize: '11px', colors: chartFont.foreColor, fontWeight: 500 },
        },
      },
      yaxis: {
        labels: {
          style: { fontSize: '11px', colors: chartFont.foreColor },
          formatter: (v) => Math.round(v).toLocaleString(),
        },
      },
      legend: { show: false },
      grid: {
        borderColor: '#f1f5f9',
        strokeDashArray: 3,
      },
      tooltip: {
        custom: function({ series, seriesIndex, dataPointIndex, w }) {
          const cat = horizonCategories[dataPointIndex];
          const qty = horizonValues[dataPointIndex];
          const bCnt = horizonBatches[dataPointIndex];
          const color = [horizons.critical.color, horizons.near.color, horizons.moderate.color, horizons.good.color][dataPointIndex];

          return `
            <div style="padding: 10px 12px; font-size: 12px; font-family: 'Inter', sans-serif;">
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${color};"></span>
                <strong>${cat}</strong>
              </div>
              <div style="color:#475569;">Stock: <strong>${qty.toLocaleString()}</strong> units</div>
              <div style="color:#64748b; font-size:11px;">Active Batches: <strong>${bCnt}</strong></div>
            </div>
          `;
        },
      },
    };

    _chartInstances['expiry'] = new ApexCharts(elExpiry, expiryOptions);
    _chartInstances['expiry'].render();
  }

  // ── 4. Releases Over Time ───────────────────────────────────────────────
  renderDashboardReleasesChart(chartData, 'monthly');
}

export function renderDashboardReleasesChart(chartData, timeframe) {
  if (_chartInstances['releases']) {
    try { _chartInstances['releases'].destroy(); } catch (e) { /* ignore */ }
  }

  const dataMap = {};
  chartData.releases.forEach(r => {
    const d = new Date(r.released_at);
    let key = '';

    if (timeframe === 'daily') {
      key = d.toISOString().split('T')[0];
    } else if (timeframe === 'weekly') {
      const dCopy = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = dCopy.getUTCDay() || 7;
      dCopy.setUTCDate(dCopy.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(dCopy.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil(((dCopy - yearStart) / 86400000 + 1) / 7);
      key = `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    } else if (timeframe === 'monthly') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else if (timeframe === 'yearly') {
      key = `${d.getFullYear()}`;
    }

    dataMap[key] = (dataMap[key] || 0) + (r.quantity || 0);
  });

  const sortedKeys = Object.keys(dataMap).sort();
  const sortedValues = sortedKeys.map(k => dataMap[k]);

  const elReleases = document.getElementById('chart-releases');
  if (!elReleases) return;

  const releasesOptions = {
    series: [{ name: 'Quantity Released', data: sortedValues }],
    chart: {
      type: 'area',
      height: 310,
      toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false } },
      fontFamily: "'Inter', sans-serif",
    },
    colors: ['#2563eb'],
    stroke: {
      curve: 'smooth',
      width: 2.5,
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [0, 95, 100],
      },
    },
    markers: {
      size: sortedValues.length <= 15 ? 4 : 0,
      hover: { size: 6 },
    },
    dataLabels: {
      enabled: sortedValues.length <= 12,
      formatter: (val) => (val > 0 ? val.toLocaleString() : ''),
      offsetY: -6,
      style: {
        fontSize: '10px',
        fontWeight: 600,
        colors: ['#1d4ed8'],
      },
      background: {
        enabled: true,
        foreColor: '#1e40af',
        borderRadius: 4,
        padding: 3,
        opacity: 0.9,
        borderWidth: 1,
        borderColor: '#bfdbfe',
      },
    },
    xaxis: {
      categories: sortedKeys.length > 0 ? sortedKeys : ['No Activity'],
      labels: {
        style: { fontSize: '11px', colors: '#64748b' },
      },
    },
    yaxis: {
      labels: {
        style: { fontSize: '11px', colors: '#64748b' },
        formatter: (v) => Math.round(v).toLocaleString(),
      },
    },
    grid: {
      borderColor: '#f1f5f9',
      strokeDashArray: 3,
    },
    tooltip: {
      y: {
        formatter: (val) => `${val.toLocaleString()} units released`,
      },
    },
    noData: {
      text: 'No distribution activity recorded for this period',
      style: { fontSize: '14px', color: '#94a3b8' },
    },
  };

  _chartInstances['releases'] = new ApexCharts(elReleases, releasesOptions);
  _chartInstances['releases'].render();
}

export function destroyDashboardCharts() {
  Object.values(_chartInstances).forEach(inst => {
    if (inst && typeof inst.destroy === 'function') {
      try { inst.destroy(); } catch (e) { /* ignore */ }
    }
  });
  _chartInstances = {};
}
