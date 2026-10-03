/**
 * Inventory Advisor - Charts (ApexCharts)
 *
 * Carousel chart management with native data labels and clean presentation:
 *   1. Releases Over Time
 *   2. Stock Utilization (In-Stock vs. Distributed)
 *   3. Top Barangays Distribution Reach
 *   4. Expiration Risk Horizon
 */

import ApexCharts from 'apexcharts';

let _advChartInstances = {};

export function initAdvCharts(chartData, expirationSummary) {
  destroyAdvCharts();

  const chartFont = {
    fontFamily: "'Inter', sans-serif",
    foreColor: '#64748b',
  };

  // 1. Stock Utilization (In-Stock vs. Released)
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

  const allNames = Array.from(
    new Set([...Object.keys(stockByCommodity), ...Object.keys(releasedByCommodity)])
  ).filter(n => n !== 'Unknown');

  allNames.sort((a, b) => {
    const volA = (stockByCommodity[a] || 0) + (releasedByCommodity[a] || 0);
    const volB = (stockByCommodity[b] || 0) + (releasedByCommodity[b] || 0);
    return volB - volA;
  });

  const topItems = allNames.slice(0, 6);
  const stockData = topItems.map(c => stockByCommodity[c] || 0);
  const releasedData = topItems.map(c => releasedByCommodity[c] || 0);

  const elStock = document.getElementById('adv-chart-stock');
  if (elStock) {
    _advChartInstances['stock'] = new ApexCharts(elStock, {
      series: [
        { name: 'In Stock', data: stockData },
        { name: 'Distributed', data: releasedData },
      ],
      chart: {
        type: 'bar',
        height: 220,
        toolbar: { show: false },
        fontFamily: chartFont.fontFamily,
      },
      colors: ['#059669', '#2563eb'],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 3,
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => (val > 0 ? val.toLocaleString() : ''),
        style: { fontSize: '9px', fontWeight: 600, colors: ['#ffffff'] },
      },
      xaxis: {
        categories: topItems.length > 0 ? topItems : ['No Data'],
        labels: {
          style: { fontSize: '10px', colors: chartFont.foreColor },
          rotate: -20,
          trim: true,
          maxHeight: 50,
        },
      },
      yaxis: {
        labels: {
          style: { fontSize: '10px', colors: chartFont.foreColor },
          formatter: (v) => Math.round(v).toLocaleString(),
        },
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '11px',
      },
      grid: {
        borderColor: '#f1f5f9',
        strokeDashArray: 3,
      },
      tooltip: {
        y: { formatter: (val) => `${val.toLocaleString()} units` },
      },
    });
    _advChartInstances['stock'].render();
  }

  // 2. Top Barangays
  const brgyMap = {};
  let totalDistributed = 0;
  chartData.releases.forEach(r => {
    if (r.barangay) {
      brgyMap[r.barangay] = (brgyMap[r.barangay] || 0) + (r.quantity || 0);
      totalDistributed += (r.quantity || 0);
    }
  });

  const sortedBrgy = Object.entries(brgyMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const elBrgy = document.getElementById('adv-chart-barangay');
  if (elBrgy) {
    _advChartInstances['barangay'] = new ApexCharts(elBrgy, {
      series: [{ name: 'Distributed Units', data: sortedBrgy.map(i => i[1]) }],
      chart: {
        type: 'bar',
        height: 220,
        toolbar: { show: false },
        fontFamily: chartFont.fontFamily,
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '60%',
          borderRadius: 3,
        },
      },
      colors: ['#0d9488'],
      dataLabels: {
        enabled: true,
        formatter: (val) => {
          const pct = totalDistributed > 0 ? ((val / totalDistributed) * 100).toFixed(0) : 0;
          return `${val.toLocaleString()} (${pct}%)`;
        },
        style: { fontSize: '10px', fontWeight: 600, colors: ['#1e293b'] },
        offsetX: 20,
      },
      xaxis: {
        categories: sortedBrgy.length > 0 ? sortedBrgy.map(i => i[0]) : ['No Data'],
        labels: {
          style: { fontSize: '10px', colors: chartFont.foreColor },
          formatter: (v) => v.toLocaleString(),
        },
      },
      yaxis: {
        labels: { style: { fontSize: '10px', colors: chartFont.foreColor } },
      },
      grid: {
        borderColor: '#f1f5f9',
        strokeDashArray: 3,
      },
      tooltip: {
        y: { formatter: (val) => `${val.toLocaleString()} units` },
      },
    });
    _advChartInstances['barangay'].render();
  }

  // 3. Expiration Risk Horizon
  const now = new Date();
  const horizons = {
    critical: { label: 'Critical (< 30d)', qty: 0, color: '#dc2626' },
    near:     { label: 'Near Expiry (1–3m)', qty: 0, color: '#ea580c' },
    moderate: { label: 'Moderate (3–6m)', qty: 0, color: '#eab308' },
    good:     { label: 'Good (> 6m)',     qty: 0, color: '#059669' },
  };

  chartData.batches.forEach(b => {
    if (!b.expiration_date) return;
    const diffDays = Math.ceil((new Date(b.expiration_date) - now) / (1000 * 60 * 60 * 24));
    const qty = b.quantity || 0;

    if (diffDays <= 30) horizons.critical.qty += qty;
    else if (diffDays <= 90) horizons.near.qty += qty;
    else if (diffDays <= 180) horizons.moderate.qty += qty;
    else horizons.good.qty += qty;
  });

  const elExpiry = document.getElementById('adv-chart-expiry');
  if (elExpiry) {
    _advChartInstances['expiry'] = new ApexCharts(elExpiry, {
      series: [{ name: 'In-Stock Quantity', data: [horizons.critical.qty, horizons.near.qty, horizons.moderate.qty, horizons.good.qty] }],
      chart: {
        type: 'bar',
        height: 220,
        toolbar: { show: false },
        fontFamily: chartFont.fontFamily,
      },
      plotOptions: {
        bar: {
          distributed: true,
          columnWidth: '50%',
          borderRadius: 4,
        },
      },
      colors: [horizons.critical.color, horizons.near.color, horizons.moderate.color, horizons.good.color],
      dataLabels: {
        enabled: true,
        formatter: (val) => (val > 0 ? `${val.toLocaleString()} units` : '0'),
        style: { fontSize: '10px', fontWeight: 600, colors: ['#ffffff'] },
      },
      xaxis: {
        categories: [horizons.critical.label, horizons.near.label, horizons.moderate.label, horizons.good.label],
        labels: { style: { fontSize: '10px', colors: chartFont.foreColor } },
      },
      yaxis: {
        labels: {
          style: { fontSize: '10px', colors: chartFont.foreColor },
          formatter: (v) => Math.round(v).toLocaleString(),
        },
      },
      legend: { show: false },
      grid: {
        borderColor: '#f1f5f9',
        strokeDashArray: 3,
      },
      tooltip: {
        y: { formatter: (val) => `${val.toLocaleString()} units` },
      },
    });
    _advChartInstances['expiry'].render();
  }

  // 4. Releases Over Time
  renderAdvReleasesChart(chartData, 'monthly');
}

export function renderAdvReleasesChart(chartData, timeframe) {
  if (_advChartInstances['releases']) {
    try { _advChartInstances['releases'].destroy(); } catch (e) { /* ignore */ }
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
      key = `W${weekNo}`;
    } else if (timeframe === 'monthly') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else {
      key = `${d.getFullYear()}`;
    }
    dataMap[key] = (dataMap[key] || 0) + (r.quantity || 0);
  });

  const sortedKeys = Object.keys(dataMap).sort();
  const sortedValues = sortedKeys.map(k => dataMap[k]);

  const elReleases = document.getElementById('adv-chart-releases');
  if (!elReleases) return;

  _advChartInstances['releases'] = new ApexCharts(elReleases, {
    series: [{ name: 'Quantity Released', data: sortedValues }],
    chart: {
      type: 'area',
      height: 220,
      toolbar: { show: false },
      fontFamily: "'Inter', sans-serif",
    },
    colors: ['#2563eb'],
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 },
    },
    markers: { size: 3 },
    dataLabels: {
      enabled: sortedValues.length <= 10,
      formatter: (val) => (val > 0 ? val.toLocaleString() : ''),
      style: { fontSize: '9px', fontWeight: 600, colors: ['#1d4ed8'] },
    },
    xaxis: {
      categories: sortedKeys.length > 0 ? sortedKeys : ['No Activity'],
      labels: { style: { fontSize: '10px', colors: '#64748b' } },
    },
    yaxis: {
      labels: {
        style: { fontSize: '10px', colors: '#64748b' },
        formatter: (v) => Math.round(v).toLocaleString(),
      },
    },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 3 },
    tooltip: {
      y: { formatter: (val) => `${val.toLocaleString()} units` },
    },
  });
  _advChartInstances['releases'].render();
}

export function destroyAdvCharts() {
  Object.values(_advChartInstances).forEach(inst => {
    if (inst && typeof inst.destroy === 'function') {
      try { inst.destroy(); } catch (e) { /* ignore */ }
    }
  });
  _advChartInstances = {};
}
