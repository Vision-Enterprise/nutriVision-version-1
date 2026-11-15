/**
 * Milk Bank Advisor Console
 *
 * Plain-English operational intelligence for Milk Bank staff:
 *   1. Milk In vs. Out      (Monthly bags collected vs. dispensed)
 *   2. Where Milk Goes      (Bags delivered per barangay)
 *   3. Donor Outreach       (By Barangay OR By Individual Donation)
 *   4. Expiry Check         (Stored bags grouped by shelf-life urgency)
 */

import ApexCharts from 'apexcharts';
import { BARANGAYS } from '../../shared/constants/app.constants.js';
import { getDaysRemaining } from '../../shared/utils/date.utils.js';

let _activeChartInstance = null;
let _cachedAnalyticsData = null;
let _currentChannel = 'inflow';
let _yearFilter = 'all';
let _periodFilter = 'all';
let _limitFilter = '10';
let _donorViewFilter = 'barangay'; // 'barangay' | 'individual'

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function isDateMatchingFilter(dateStr, yearVal, periodVal, customStart, customEnd) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;

  const y = d.getFullYear().toString();
  if (yearVal !== 'all' && y !== yearVal) return false;

  if (periodVal === 'custom') {
    if (customStart && dateStr < customStart) return false;
    if (customEnd && dateStr > customEnd) return false;
    return true;
  }

  if (periodVal !== 'all') {
    const m = d.getMonth() + 1;
    if (periodVal === 'q1' && (m < 1 || m > 3)) return false;
    if (periodVal === 'q2' && (m < 4 || m > 6)) return false;
    if (periodVal === 'q3' && (m < 7 || m > 9)) return false;
    if (periodVal === 'q4' && (m < 10 || m > 12)) return false;
  }

  return true;
}

function resolveDonorBarangay(donorRecord, donorLogs = []) {
  const code = String(donorRecord.donor_code || '').trim().toLowerCase();
  const matchedLog = donorLogs.find(l => String(l.donor_code || '').trim().toLowerCase() === code && l.barangay);
  if (matchedLog) return matchedLog.barangay;

  const notes = String(donorRecord.expression_date_notes || '').toLowerCase();
  const transport = String(donorRecord.transport_condition || '').toLowerCase();
  for (const b of BARANGAYS) {
    const bLower = b.toLowerCase();
    if (code.includes(bLower) || notes.includes(bLower) || transport.includes(bLower)) {
      return b;
    }
  }
  return 'Unassigned / MNAO Center';
}

export function computeMilkAnalytics({
  donorLogs = [],
  donations = [],
  dispatches = [],
  batches = [],
  period = 'all',
  customStart = '',
  customEnd = '',
}) {
  return {
    rawDonorLogs: donorLogs || [],
    rawDonations: donations || [],
    rawDispatches: dispatches || [],
    rawBatches: batches || [],
    period,
    customStart,
    customEnd,
  };
}

export function renderMilkAnalyticsSheet(analyticsData) {
  _cachedAnalyticsData = analyticsData;

  const yearsSet = new Set(['2026', '2025']);
  analyticsData.rawDonorLogs.forEach(l => {
    const dt = l.donation_date || l.created_at;
    if (dt) yearsSet.add(new Date(dt).getFullYear().toString());
  });
  analyticsData.rawDonations.forEach(d => {
    const dt = d.arrival_date || d.created_at;
    if (dt) yearsSet.add(new Date(dt).getFullYear().toString());
  });
  analyticsData.rawDispatches.forEach(disp => {
    const dt = disp.dispensed_date || disp.dispensed_at;
    if (dt) yearsSet.add(new Date(dt).getFullYear().toString());
  });
  const sortedYears = Array.from(yearsSet).filter(Boolean).sort().reverse();

  return `
    <div class="milk-analytics-container" style="padding: 18px 22px 28px; display: flex; flex-direction: column; gap: 16px;">
      <div class="card milk-console-card" style="border: 1.5px solid #bae6fd; border-radius: 16px; overflow: hidden; background: #ffffff; box-shadow: 0 4px 20px rgba(2, 132, 199, 0.08); padding: 0;">

        <!-- Header -->
        <div class="milk-console-header" style="padding: 14px 20px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-bottom: 1.5px solid #bae6fd;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div style="flex: 1; min-width: 220px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                <span class="icon" style="color: #dc2626; font-size: 22px;">insights</span>
                <h3 id="milk-console-title" style="margin: 0; font-size: 1.15rem; color: #0c4a6e; font-weight: 700;">Milk In vs. Out</h3>
              </div>
              <p id="milk-console-subtitle" style="font-size: 13px; color: #0369a1; margin: 0; font-weight: 500;">
                How many bags came in vs. how many went out each month
              </p>
            </div>

            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
              <div id="milk-console-ticker" style="background: #ffffff; padding: 6px 14px; border-radius: 9999px; font-size: 12.5px; color: #0f172a; border: 1.5px solid #bae6fd; display: flex; gap: 14px; align-items: center; flex-wrap: wrap; font-weight: 600;">
                <strong id="milk-ticker-total" style="color: #0284c7;">Loading...</strong>
                <span style="color: #cbd5e1;">|</span>
                <strong id="milk-ticker-top" style="color: #059669;">Loading...</strong>
              </div>

              <button type="button" id="btn-export-milk-awards-pdf" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px; font-weight: 600; border-radius: 9999px;">
                <span class="icon icon--sm" style="font-size: 17px; color: #0284c7;">print</span>
                Export PDF
              </button>
            </div>
          </div>
        </div>

        <!-- Plain-English Takeaway -->
        <div id="milk-console-insight-card" style="margin: 14px 20px 0 20px; padding: 11px 16px; background: #f0f9ff; border: 1px solid #bae6fd; border-left: 4px solid #0284c7; border-radius: 10px; font-size: 13px; color: #0c4a6e; display: flex; align-items: center; gap: 10px; line-height: 1.45;">
          <span class="icon" style="font-size: 20px; color: #0284c7; flex-shrink: 0;">lightbulb</span>
          <div id="milk-console-insight-text" style="font-weight: 500;">Analyzing records...</div>
        </div>

        <!-- Dark Chart Stage (White text on dark background for crisp readability) -->
        <div style="padding: 14px 20px 18px 20px; background: #ffffff;">
          <div style="background: #0f172a; border-radius: 14px; padding: 14px 16px 8px 10px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);">
            <div id="milk-console-chart" style="min-height: 390px; width: 100%;"></div>
          </div>
        </div>

        <!-- Clean Control Deck -->
        <div style="padding: 14px 20px 18px; background-color: #f8fafc; border-top: 1.5px solid #bae6fd; display: flex; flex-direction: column; gap: 12px;">

          <!-- Channel Buttons -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px;" id="milk-channel-controls">
            <button class="btn milk-channel-btn ${(_currentChannel === 'inflow') ? 'milk-channel-btn--active' : ''}" data-channel="inflow" type="button" style="border-radius: 9999px !important; justify-content: center;">
              <span class="icon" style="font-size: 19px;">swap_vert</span>
              <strong>Milk In vs. Out</strong>
            </button>

            <button class="btn milk-channel-btn ${(_currentChannel === 'barangay') ? 'milk-channel-btn--active' : ''}" data-channel="barangay" type="button" style="border-radius: 9999px !important; justify-content: center;">
              <span class="icon" style="font-size: 19px;">location_on</span>
              <strong>Where Milk Goes</strong>
            </button>

            <button class="btn milk-channel-btn ${(_currentChannel === 'donors') ? 'milk-channel-btn--active' : ''}" data-channel="donors" type="button" style="border-radius: 9999px !important; justify-content: center;">
              <span class="icon" style="font-size: 19px;">diversity_1</span>
              <strong>Donor Outreach</strong>
            </button>

            <button class="btn milk-channel-btn ${(_currentChannel === 'expiry') ? 'milk-channel-btn--active' : ''}" data-channel="expiry" type="button" style="border-radius: 9999px !important; justify-content: center;">
              <span class="icon" style="font-size: 19px;">schedule</span>
              <strong>Expiry Check</strong>
            </button>
          </div>

          <!-- Inline Filters -->
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <div id="milk-tuner-year-wrap" style="display: flex; align-items: center; gap: 6px; background: #ffffff; padding: 5px 14px; border-radius: 9999px; border: 1.5px solid #bae6fd;">
              <span class="icon icon--sm" style="color: #0284c7; font-size: 16px;">calendar_today</span>
              <label for="milk-tuner-year" style="font-size: 12px; color: #475569; margin: 0; font-weight: 600;">Year:</label>
              <select id="milk-tuner-year" class="form-input" style="padding: 2px 4px; min-height: auto; font-size: 12.5px; border: none; background: transparent; font-weight: 700; color: #0c4a6e; cursor: pointer;">
                <option value="all" ${_yearFilter === 'all' ? 'selected' : ''}>All Years</option>
                ${sortedYears.map(y => `<option value="${y}" ${_yearFilter === y ? 'selected' : ''}>${y}</option>`).join('')}
              </select>
            </div>

            <div id="milk-tuner-period-wrap" style="display: flex; align-items: center; gap: 6px; background: #ffffff; padding: 5px 14px; border-radius: 9999px; border: 1.5px solid #bae6fd;">
              <span class="icon icon--sm" style="color: #0284c7; font-size: 16px;">date_range</span>
              <label for="milk-tuner-period" style="font-size: 12px; color: #475569; margin: 0; font-weight: 600;">Period:</label>
              <select id="milk-tuner-period" class="form-input" style="padding: 2px 4px; min-height: auto; font-size: 12.5px; border: none; background: transparent; font-weight: 700; color: #0c4a6e; cursor: pointer;">
                <option value="all" ${_periodFilter === 'all' ? 'selected' : ''}>Full Year</option>
                <option value="q1" ${_periodFilter === 'q1' ? 'selected' : ''}>Q1 (Jan–Mar)</option>
                <option value="q2" ${_periodFilter === 'q2' ? 'selected' : ''}>Q2 (Apr–Jun)</option>
                <option value="q3" ${_periodFilter === 'q3' ? 'selected' : ''}>Q3 (Jul–Sep)</option>
                <option value="q4" ${_periodFilter === 'q4' ? 'selected' : ''}>Q4 (Oct–Dec)</option>
              </select>
            </div>

            <div id="milk-tuner-donor-view-wrap" style="display: none; align-items: center; gap: 6px; background: #ffffff; padding: 5px 14px; border-radius: 9999px; border: 1.5px solid #bae6fd;">
              <span class="icon icon--sm" style="color: #0284c7; font-size: 16px;">person_search</span>
              <label for="milk-tuner-donor-view" style="font-size: 12px; color: #475569; margin: 0; font-weight: 600;">Group By:</label>
              <select id="milk-tuner-donor-view" class="form-input" style="padding: 2px 4px; min-height: auto; font-size: 12.5px; border: none; background: transparent; font-weight: 700; color: #0c4a6e; cursor: pointer;">
                <option value="barangay" ${_donorViewFilter === 'barangay' ? 'selected' : ''}>By Barangay</option>
                <option value="individual" ${_donorViewFilter === 'individual' ? 'selected' : ''}>By Individual Donation</option>
              </select>
            </div>

            <div id="milk-tuner-limit-wrap" style="display: none; align-items: center; gap: 6px; background: #ffffff; padding: 5px 14px; border-radius: 9999px; border: 1.5px solid #bae6fd;">
              <span class="icon icon--sm" style="color: #0284c7; font-size: 16px;">filter_list</span>
              <label for="milk-tuner-limit" style="font-size: 12px; color: #475569; margin: 0; font-weight: 600;">Show:</label>
              <select id="milk-tuner-limit" class="form-input" style="padding: 2px 4px; min-height: auto; font-size: 12.5px; border: none; background: transparent; font-weight: 700; color: #0c4a6e; cursor: pointer;">
                <option value="10" ${_limitFilter === '10' ? 'selected' : ''}>Top 10</option>
                <option value="all" ${_limitFilter === 'all' ? 'selected' : ''}>All</option>
              </select>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;
}

export function mountMilkAnalyticsCharts(analyticsData) {
  _cachedAnalyticsData = analyticsData;
  _bindConsoleControls();
  _renderChannelChart();
}

function _bindConsoleControls() {
  const channelBtns = document.querySelectorAll('.milk-channel-btn');
  channelBtns.forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const ch = btn.getAttribute('data-channel');
      if (ch && ch !== _currentChannel) {
        _currentChannel = ch;
        channelBtns.forEach(b => b.classList.remove('milk-channel-btn--active'));
        btn.classList.add('milk-channel-btn--active');
        _renderChannelChart();
      }
    };
  });

  const yearEl = document.getElementById('milk-tuner-year');
  if (yearEl) {
    yearEl.onchange = (e) => {
      _yearFilter = e.target.value;
      _renderChannelChart();
    };
  }

  const periodEl = document.getElementById('milk-tuner-period');
  if (periodEl) {
    periodEl.onchange = (e) => {
      _periodFilter = e.target.value;
      _renderChannelChart();
    };
  }

  const donorViewEl = document.getElementById('milk-tuner-donor-view');
  if (donorViewEl) {
    donorViewEl.onchange = (e) => {
      _donorViewFilter = e.target.value;
      _renderChannelChart();
    };
  }

  const limitEl = document.getElementById('milk-tuner-limit');
  if (limitEl) {
    limitEl.onchange = (e) => {
      _limitFilter = e.target.value;
      _renderChannelChart();
    };
  }
}

function _renderChannelChart() {
  if (!_cachedAnalyticsData) return;

  const chartEl = document.getElementById('milk-console-chart');
  if (!chartEl) return;

  if (_activeChartInstance) {
    try { _activeChartInstance.destroy(); } catch {}
    _activeChartInstance = null;
  }

  if (_currentChannel === 'freezer') {
    _currentChannel = 'inflow';
  }

  const yearWrap = document.getElementById('milk-tuner-year-wrap');
  const periodWrap = document.getElementById('milk-tuner-period-wrap');
  const donorViewWrap = document.getElementById('milk-tuner-donor-view-wrap');
  const limitWrap = document.getElementById('milk-tuner-limit-wrap');

  if (yearWrap) yearWrap.style.display = (_currentChannel === 'expiry') ? 'none' : 'flex';
  if (periodWrap) periodWrap.style.display = (_currentChannel === 'expiry') ? 'none' : 'flex';
  if (donorViewWrap) donorViewWrap.style.display = (_currentChannel === 'donors') ? 'flex' : 'none';
  if (limitWrap) limitWrap.style.display = (_currentChannel === 'barangay' || _currentChannel === 'donors') ? 'flex' : 'none';

  const filteredDonorLogs = (_cachedAnalyticsData.rawDonorLogs || []).filter(l => {
    const dt = l.donation_date || l.created_at;
    return isDateMatchingFilter(dt, _yearFilter, _periodFilter, _cachedAnalyticsData.customStart, _cachedAnalyticsData.customEnd);
  });

  const filteredDonations = _cachedAnalyticsData.rawDonations.filter(d => {
    const dt = d.arrival_date || d.created_at;
    return isDateMatchingFilter(dt, _yearFilter, _periodFilter, _cachedAnalyticsData.customStart, _cachedAnalyticsData.customEnd);
  });

  const filteredDispatches = _cachedAnalyticsData.rawDispatches.filter(disp => {
    const dt = disp.dispensed_date || disp.dispensed_at;
    return isDateMatchingFilter(dt, _yearFilter, _periodFilter, _cachedAnalyticsData.customStart, _cachedAnalyticsData.customEnd);
  });

  const activeBatches = _cachedAnalyticsData.rawBatches.filter(b => (Number(b.remaining_bags || 0) > 0));

  const darkThemeBase = {
    background: '#0f172a',
    foreColor: '#f8fafc',
    fontFamily: "'Inter', sans-serif",
    toolbar: { show: false },
  };

  let chartOptions = {};

  // ── 1. Milk In vs. Out ─────────────────────────────────────────────────────
  if (_currentChannel === 'inflow') {
    _setConsoleHeader(
      'Milk In vs. Out',
      'How many bags came in vs. how many went out each month'
    );

    const monthlyIn = new Array(12).fill(0);
    const monthlyOut = new Array(12).fill(0);
    let totalIn = 0;
    let totalOut = 0;

    filteredDonations.forEach(d => {
      const dt = d.arrival_date || d.created_at;
      if (!dt) return;
      const m = new Date(dt).getMonth();
      const bags = Number(d.bags_count || 1);
      if (m >= 0 && m < 12) {
        monthlyIn[m] += bags;
        totalIn += bags;
      }
    });

    filteredDispatches.forEach(disp => {
      const dt = disp.dispensed_date || disp.dispensed_at;
      if (!dt) return;
      const m = new Date(dt).getMonth();
      const bags = Number(disp.bags_dispensed || 0);
      if (m >= 0 && m < 12) {
        monthlyOut[m] += bags;
        totalOut += bags;
      }
    });

    const net = totalIn - totalOut;
    _updateTicker(`${totalIn} Bags In · ${totalOut} Bags Out`, `${net >= 0 ? '+' : ''}${net} Bags Left`);

    let peakMonth = 'None';
    let peakBags = 0;
    monthlyIn.forEach((qty, idx) => {
      if (qty > peakBags) {
        peakBags = qty;
        peakMonth = MONTH_LABELS[idx];
      }
    });

    _updateTakeaway(
      peakBags > 0
        ? `Most milk arrived in <strong>${peakMonth}</strong> (${peakBags} bags). Overall difference is <strong>${net >= 0 ? '+' : ''}${net} bags</strong>.`
        : `No milk intake recorded for this period yet.`
    );

    chartOptions = {
      series: [
        { name: 'Collected (In)', data: monthlyIn },
        { name: 'Given Out (Out)', data: monthlyOut },
      ],
      chart: { ...darkThemeBase, type: 'bar', height: 390 },
      theme: { mode: 'dark' },
      colors: ['#38bdf8', '#34d399'],
      plotOptions: {
        bar: { horizontal: false, columnWidth: '55%', borderRadius: 6, dataLabels: { position: 'top' } },
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => (val > 0 ? `${val}` : ''),
        offsetY: -20,
        style: { fontSize: '12px', fontWeight: 700, colors: ['#ffffff'] },
      },
      xaxis: {
        categories: MONTH_LABELS,
        labels: { style: { colors: '#e2e8f0', fontSize: '12px', fontWeight: 600 } },
      },
      yaxis: {
        title: { text: 'Bags', style: { color: '#94a3b8', fontWeight: 600 } },
        labels: { style: { colors: '#cbd5e1' } },
      },
      tooltip: { theme: 'dark', y: { formatter: (val) => `${val} Bags` } },
      legend: { position: 'top', horizontalAlign: 'right', fontSize: '13px', fontWeight: 600, labels: { colors: '#f8fafc' } },
      grid: { borderColor: '#1e293b' },
    };
  }

  // ── 2. Where Milk Goes ─────────────────────────────────────────────────────
  else if (_currentChannel === 'barangay') {
    _setConsoleHeader(
      'Where Milk Goes',
      'Total pasteurized milk bags delivered to babies in each barangay'
    );

    const brgyMap = {};
    let totalDispensed = 0;

    filteredDispatches.forEach(disp => {
      const b = String(disp.barangay || 'Unspecified').trim();
      const bags = Number(disp.bags_dispensed || 0);
      brgyMap[b] = (brgyMap[b] || 0) + bags;
      totalDispensed += bags;
    });

    let sortedBrgys = Object.keys(brgyMap).sort((a, b) => brgyMap[b] - brgyMap[a]);
    if (_limitFilter !== 'all') {
      sortedBrgys = sortedBrgys.slice(0, parseInt(_limitFilter, 10) || 10);
    }

    const topName = sortedBrgys[0] || 'None';
    const topQty = brgyMap[topName] || 0;

    _updateTicker(`${totalDispensed.toLocaleString()} Bags Delivered`, `Top: ${topName} (${topQty})`);

    if (totalDispensed > 0 && topQty > 0) {
      const topPct = Math.round((topQty / totalDispensed) * 100);
      _updateTakeaway(
        `<strong>${topName}</strong> received the most milk with <strong>${topQty} bags</strong> (${topPct}% of deliveries across ${Object.keys(brgyMap).length} barangays).`
      );
    } else {
      _updateTakeaway(`No deliveries recorded for this period yet.`);
    }

    chartOptions = {
      series: [{ name: 'Bags Delivered', data: sortedBrgys.map(b => brgyMap[b] || 0) }],
      chart: { ...darkThemeBase, type: 'bar', height: Math.max(360, sortedBrgys.length * 40) },
      theme: { mode: 'dark' },
      colors: ['#38bdf8'],
      plotOptions: {
        bar: { horizontal: true, barHeight: '60%', borderRadius: 6, dataLabels: { position: 'right' } },
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => (val > 0 ? `${val} Bags` : ''),
        offsetX: 8,
        style: { fontSize: '12px', fontWeight: 700, colors: ['#ffffff'] },
      },
      xaxis: {
        categories: sortedBrgys,
        labels: { style: { colors: '#cbd5e1' } },
        title: { text: 'Bags Delivered', style: { color: '#94a3b8', fontWeight: 600 } },
      },
      yaxis: {
        labels: { style: { colors: '#f8fafc', fontWeight: 600, fontSize: '12.5px' } },
      },
      tooltip: { theme: 'dark', y: { formatter: (val) => `${val} Bags delivered` } },
      grid: { borderColor: '#1e293b' },
    };
  }

  // ── 3. Donor Outreach (By Barangay OR By Individual Donation) ──────────────
  else if (_currentChannel === 'donors') {
    if (_donorViewFilter === 'individual') {
      _setConsoleHeader(
        'Donor Outreach — By Individual Donation',
        'Total milk volume donated by each mother'
      );

      // Prefer Donor Log entries (has donor_name, donor_code, volume_ml); fallback to Milk Received if empty
      const donorTotals = new Map();
      const useDonorLogs = filteredDonorLogs.length > 0;

      if (useDonorLogs) {
        filteredDonorLogs.forEach(entry => {
          const code = String(entry.donor_code || '').trim();
          const name = String(entry.donor_name || '').trim();
          const key = code || name || 'Unknown';
          const label = name && code ? `${name} (${code})` : (name || code || 'Unknown');
          const vol = Number(entry.volume_ml || 0);
          if (!donorTotals.has(key)) {
            donorTotals.set(key, { label, value: 0, count: 0, brgy: entry.barangay || '' });
          }
          const rec = donorTotals.get(key);
          rec.value += vol;
          rec.count += 1;
        });
      } else {
        filteredDonations.forEach(d => {
          const code = String(d.donor_code || '').trim() || 'Unknown';
          const bags = Number(d.bags_count || 1);
          if (!donorTotals.has(code)) {
            donorTotals.set(code, { label: code, value: 0, count: 0, brgy: '' });
          }
          const rec = donorTotals.get(code);
          rec.value += bags;
          rec.count += 1;
        });
      }

      let entries = Array.from(donorTotals.values()).sort((a, b) => b.value - a.value);
      const totalDonors = entries.length;
      const totalAmt = entries.reduce((sum, e) => sum + e.value, 0);
      const unitLabel = useDonorLogs ? 'mL' : 'Bags';

      if (_limitFilter !== 'all') {
        entries = entries.slice(0, parseInt(_limitFilter, 10) || 10);
      }

      const top = entries[0];
      _updateTicker(
        `${totalDonors} Donor${totalDonors === 1 ? '' : 's'}`,
        `${totalAmt.toLocaleString()} ${unitLabel} Total`
      );

      _updateTakeaway(
        top
          ? `Top contributor is <strong>${escapeHtml(top.label)}</strong> with <strong>${top.value.toLocaleString()} ${unitLabel}</strong> across ${top.count} donation${top.count === 1 ? '' : 's'}.`
          : `No individual donations recorded for this period yet.`
      );

      chartOptions = {
        series: [{ name: useDonorLogs ? 'Volume Donated (mL)' : 'Bags Donated', data: entries.map(e => e.value) }],
        chart: { ...darkThemeBase, type: 'bar', height: Math.max(360, entries.length * 42) },
        theme: { mode: 'dark' },
        colors: ['#38bdf8'],
        plotOptions: {
          bar: { horizontal: true, barHeight: '60%', borderRadius: 6, dataLabels: { position: 'right' } },
        },
        dataLabels: {
          enabled: true,
          formatter: (val, opts) => {
            if (!val) return '';
            const item = entries[opts.dataPointIndex];
            return `${val.toLocaleString()} ${unitLabel} (${item?.count || 1}x)`;
          },
          offsetX: 8,
          style: { fontSize: '12px', fontWeight: 700, colors: ['#ffffff'] },
        },
        xaxis: {
          categories: entries.map(e => e.label),
          title: { text: useDonorLogs ? 'Total Volume (mL)' : 'Total Bags', style: { color: '#94a3b8', fontWeight: 600 } },
          labels: { style: { colors: '#cbd5e1' } },
        },
        yaxis: {
          labels: { style: { colors: '#f8fafc', fontWeight: 600, fontSize: '12.5px' } },
        },
        tooltip: {
          theme: 'dark',
          y: {
            formatter: (val, opts) => {
              const item = entries[opts.dataPointIndex];
              return `${val.toLocaleString()} ${unitLabel} · ${item?.count || 1} donation(s)`;
            },
          },
        },
        grid: { borderColor: '#1e293b' },
      };
    } else {
      _setConsoleHeader(
        'Donor Outreach — By Barangay',
        'Active donor mothers per barangay to see where to hold donor drives'
      );

      const brgyDonorsMap = {};
      BARANGAYS.forEach(b => { brgyDonorsMap[b] = new Set(); });

      const uniqueDonors = new Set();

      // Use Donor Log entries first (exact barangay field)
      filteredDonorLogs.forEach(entry => {
        const donorKey = String(entry.donor_code || entry.donor_name || '').trim().toLowerCase();
        if (!donorKey) return;
        const brgy = entry.barangay || 'Unassigned / MNAO Center';
        if (!brgyDonorsMap[brgy]) brgyDonorsMap[brgy] = new Set();
        brgyDonorsMap[brgy].add(donorKey);
        uniqueDonors.add(donorKey);
      });

      // Merge any Milk Received donors not already in Donor Log
      filteredDonations.forEach(d => {
        const donorKey = String(d.donor_code || '').trim().toLowerCase();
        if (!donorKey || uniqueDonors.has(donorKey)) return;
        const brgy = resolveDonorBarangay(d, _cachedAnalyticsData.rawDonorLogs || []);
        if (!brgyDonorsMap[brgy]) brgyDonorsMap[brgy] = new Set();
        brgyDonorsMap[brgy].add(donorKey);
        uniqueDonors.add(donorKey);
      });

      let donorEntries = Object.keys(brgyDonorsMap).map(b => ({
        barangay: b,
        count: brgyDonorsMap[b].size,
      })).sort((a, b) => b.count - a.count);

      const zeroDonorCount = donorEntries.filter(e => e.count === 0 && e.barangay !== 'Unassigned / MNAO Center').length;

      if (_limitFilter !== 'all') {
        donorEntries = donorEntries.slice(0, parseInt(_limitFilter, 10) || 10);
      }

      const topArea = donorEntries[0] || { barangay: 'None', count: 0 };

      _updateTicker(`${uniqueDonors.size} Active Donor${uniqueDonors.size === 1 ? '' : 's'}`, `${zeroDonorCount} Barangays Need Drives`);
      _updateTakeaway(
        topArea.count > 0
          ? `<strong>${escapeHtml(topArea.barangay)}</strong> has the most donors (<strong>${topArea.count}</strong>). <strong>${zeroDonorCount} barangays</strong> have 0 donors yet — good spots for outreach.`
          : `No active donors recorded for this period yet.`
      );

      chartOptions = {
        series: [{ name: 'Active Donors', data: donorEntries.map(e => e.count) }],
        chart: { ...darkThemeBase, type: 'bar', height: Math.max(360, donorEntries.length * 36) },
        theme: { mode: 'dark' },
        plotOptions: {
          bar: { horizontal: true, barHeight: '60%', borderRadius: 6, distributed: true, dataLabels: { position: 'right' } },
        },
        colors: donorEntries.map(e => (e.count > 0 ? '#38bdf8' : '#334155')),
        dataLabels: {
          enabled: true,
          formatter: (val) => (val > 0 ? `${val} Donor${val === 1 ? '' : 's'}` : ''),
          offsetX: 8,
          style: { fontSize: '12px', fontWeight: 700, colors: ['#ffffff'] },
        },
        xaxis: {
          categories: donorEntries.map(e => e.barangay),
          title: { text: 'Active Donors', style: { color: '#94a3b8', fontWeight: 600 } },
          labels: { style: { colors: '#cbd5e1' } },
        },
        yaxis: {
          labels: { style: { colors: '#f8fafc', fontWeight: 600, fontSize: '12.5px' } },
        },
        legend: { show: false },
        tooltip: { theme: 'dark', y: { formatter: (val) => `${val} Active donor(s)` } },
        grid: { borderColor: '#1e293b' },
      };
    }
  }

  // ── 4. Expiry Check ────────────────────────────────────────────────────────
  else if (_currentChannel === 'expiry') {
    _setConsoleHeader(
      'Expiry Check',
      'Which stored milk bags should be used first'
    );

    let expiredBags = 0;
    let useSoonBags = 0;  // 0-30 days
    let watchBags = 0;    // 31-60 days
    let freshBags = 0;    // >60 days

    const expiredBatches = [];
    const useSoonBatches = [];

    activeBatches.forEach(b => {
      const days = getDaysRemaining(b.expiry_date);
      const rem = Number(b.remaining_bags || 0);

      if (days < 0) {
        expiredBags += rem;
        expiredBatches.push(b.batch_number);
      } else if (days <= 30) {
        useSoonBags += rem;
        useSoonBatches.push(`${b.batch_number} (${days}d)`);
      } else if (days <= 60) {
        watchBags += rem;
      } else {
        freshBags += rem;
      }
    });

    const totalActive = expiredBags + useSoonBags + watchBags + freshBags;
    _updateTicker(`${totalActive} Bags in Freezer`, `${useSoonBags} Use Soon (≤30d)`);

    if (expiredBags > 0) {
      _updateTakeaway(
        `<span style="color:#dc2626; font-weight:700;">Action Needed:</span> <strong>${expiredBags} bags</strong> are past expiry (${expiredBatches.join(', ')}). Remove from dispatch.`
      );
    } else if (useSoonBags > 0) {
      _updateTakeaway(
        `Give out <strong>${useSoonBags} bags</strong> within 30 days (${useSoonBatches.slice(0, 3).join(', ')}). <strong>${freshBags} bags</strong> are still fresh.`
      );
    } else {
      _updateTakeaway(`All <strong>${totalActive} bags</strong> in storage are fresh (>30 days left).`);
    }

    const categories = ['Expired', 'Use Soon (≤30d)', 'Watch (31–60d)', 'Fresh (>60d)'];
    const bagCounts = [expiredBags, useSoonBags, watchBags, freshBags];
    const riskColors = ['#ef4444', '#f97316', '#eab308', '#10b981'];

    chartOptions = {
      series: [{ name: 'Bags in Storage', data: bagCounts }],
      chart: { ...darkThemeBase, type: 'bar', height: 370 },
      theme: { mode: 'dark' },
      plotOptions: {
        bar: { distributed: true, columnWidth: '48%', borderRadius: 8, dataLabels: { position: 'top' } },
      },
      colors: riskColors,
      dataLabels: {
        enabled: true,
        formatter: (val) => (val > 0 ? `${val} Bags` : '0'),
        offsetY: -22,
        style: { fontSize: '13px', fontWeight: 700, colors: ['#ffffff'] },
      },
      xaxis: {
        categories,
        labels: { style: { colors: '#f8fafc', fontWeight: 700, fontSize: '12.5px' } },
      },
      yaxis: {
        title: { text: 'Bags', style: { color: '#94a3b8', fontWeight: 600 } },
        labels: { style: { colors: '#cbd5e1' } },
      },
      legend: { show: false },
      tooltip: { theme: 'dark', y: { formatter: (val) => `${val} Bags` } },
      grid: { borderColor: '#1e293b' },
    };
  }

  try {
    _activeChartInstance = new ApexCharts(chartEl, chartOptions);
    _activeChartInstance.render();
  } catch (err) {
    console.error('[MilkAnalytics] Error rendering chart:', err);
  }
}

function _setConsoleHeader(title, subtitle) {
  const tEl = document.getElementById('milk-console-title');
  const sEl = document.getElementById('milk-console-subtitle');
  if (tEl) tEl.textContent = title;
  if (sEl) sEl.textContent = subtitle;
}

function _updateTicker(totalText, topText) {
  const totEl = document.getElementById('milk-ticker-total');
  const topEl = document.getElementById('milk-ticker-top');
  if (totEl) totEl.textContent = totalText;
  if (topEl) topEl.textContent = topText;
}

function _updateTakeaway(html) {
  const insEl = document.getElementById('milk-console-insight-text');
  if (insEl) insEl.innerHTML = html;
}
