/**
 * Milk Bank Analytics & Operations Console (Advisor-Style Single-Console System)
 *
 * Operationally focused intelligence for cold-chain breastmilk banking:
 *   1. Monthly Milk Inflow vs. Outflow (Collected vs. Dispensed in Bags)
 *   2. Distribution Volume Categorized by Barangay (Clean Bags metric, no clinical indications breakdown)
 *   3. Total Active Donor Count per Barangay (Identifies clusters & zero-donor drive targets)
 *   4. Spoilage & Expiry Warning Indicators (FEFO priority risk monitoring)
 *   5. Inventory Status by Freezer Shelf (Remaining bags per batch BM-XXX across shelves)
 *
 * Designed to mirror the Inventory Advisor Console:
 *   - Screen Header with live total/top summary pill and quick export slot
 *   - Spoon-fed Key Takeaway banner
 *   - Interactive single-chart display (ApexCharts) with crisp responsive layout
 *   - 5-Channel Control Deck with clean button borders and sub-labels
 *   - Filter tuners: Year, Period / Quarter, and Scope limit
 */

import ApexCharts from 'apexcharts';
import { BARANGAYS } from '../../shared/constants/app.constants.js';
import { formatDate, getDaysRemaining } from '../../shared/utils/date.utils.js';

let _activeChartInstance = null;
let _cachedAnalyticsData = null;
let _currentChannel = 'inflow';
let _yearFilter = 'all';
let _periodFilter = 'all';
let _limitFilter = '10';

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
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const SHELVES_ORDER = [
  'Shelf 1', 'Shelf 2', 'Shelf 3',
  'Shelf 4', 'Shelf 5', 'Shelf 6',
  'Bottom Bin'
];

/**
 * Filter helper by Year & Quarter/Period
 */
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
    const m = d.getMonth() + 1; // 1-12
    if (periodVal === 'q1' && (m < 1 || m > 3)) return false;
    if (periodVal === 'q2' && (m < 4 || m > 6)) return false;
    if (periodVal === 'q3' && (m < 7 || m > 9)) return false;
    if (periodVal === 'q4' && (m < 10 || m > 12)) return false;
  }

  return true;
}

/**
 * Resolve Barangay from a donor record by searching donor_code, notes, or transport
 */
function resolveDonorBarangay(donorRecord) {
  const code = String(donorRecord.donor_code || '').toLowerCase();
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

/**
 * Compute Aggregated Analytics for all 5 Channels (Measured purely in BAGS)
 */
export function computeMilkAnalytics({
  donations = [],
  dispatches = [],
  batches = [],
  period = 'all',
  customStart = '',
  customEnd = '',
}) {
  return {
    rawDonations: donations || [],
    rawDispatches: dispatches || [],
    rawBatches: batches || [],
    period,
    customStart,
    customEnd,
  };
}

/**
 * Render the HTML layout for the Milk Bank Analytics Console
 */
export function renderMilkAnalyticsSheet(analyticsData) {
  _cachedAnalyticsData = analyticsData;

  // Determine available years from records
  const yearsSet = new Set(['2026', '2025']);
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
    <div class="milk-analytics-container" style="padding: 20px 24px 32px; display: flex; flex-direction: column; gap: 20px;">
      
      <!-- ── TV-Style Console Card (Mirrors Advisor Layout) ──────────────── -->
      <div class="card milk-console-card" style="border: 1.5px solid #bae6fd; border-radius: 16px; overflow: hidden; background: #ffffff; box-shadow: 0 4px 20px rgba(2, 132, 199, 0.08); padding: 0;">
        
        <!-- Console Header with Live Ticker Slot & PDF Export -->
        <div class="milk-console-header" style="padding: 16px 22px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-bottom: 1.5px solid #bae6fd;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px;">
            <div style="flex: 1; min-width: 240px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span class="icon" style="color: var(--color-milk-primary, #0284c7); font-size: 24px;">insights</span>
                <h3 id="milk-console-title" style="margin: 0; font-size: 1.25rem; color: #0c4a6e; font-weight: 700;">Monthly Milk Inflow vs. Outflow</h3>
              </div>
              <p id="milk-console-subtitle" style="font-size: 13px; color: #0369a1; margin: 0; line-height: 1.4; font-weight: 500;">
                Compare monthly milk collected vs. total volume dispensed to infants (in bags)
              </p>
            </div>

            <!-- Live Summary Ticker & Print Preview Action -->
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
              <div id="milk-console-ticker" style="background: #ffffff; padding: 7px 16px; border-radius: 999px; font-size: 13px; color: #0f172a; box-shadow: 0 1px 3px rgba(2, 132, 199, 0.1); border: 1.5px solid #bae6fd; display: flex; gap: 16px; align-items: center; flex-wrap: wrap; font-weight: 600;">
                <span style="display: flex; align-items: center; gap: 6px;">
                  <span class="icon icon--sm" style="color: #0284c7; font-size: 16px;">summarize</span>
                  <span style="color: #64748b; font-weight: 500;">Total:</span>
                  <strong id="milk-ticker-total" style="color: #0284c7;">Calculating...</strong>
                </span>
                <span id="milk-ticker-top-wrap" style="display: flex; align-items: center; gap: 6px;">
                  <span class="icon icon--sm" style="color: #059669; font-size: 16px;">trending_up</span>
                  <span style="color: #64748b; font-weight: 500;">Top:</span>
                  <strong id="milk-ticker-top" style="color: #059669;">Calculating...</strong>
                </span>
              </div>

              <button type="button" id="btn-export-milk-awards-pdf" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; font-weight: 600;">
                <span class="icon icon--sm" style="font-size: 17px; color: #0284c7;">print</span>
                Export Report (PDF)
              </button>
            </div>
          </div>
        </div>

        <!-- Spoon-Fed Takeaway Banner (Cold-chain alert style) -->
        <div id="milk-console-insight-card" style="margin: 14px 22px 0 22px; padding: 12px 18px; background: #f0f9ff; border: 1.5px solid #bae6fd; border-left: 5px solid #0284c7; border-radius: 8px; font-size: 13px; color: #0369a1; display: flex; align-items: center; gap: 12px; line-height: 1.5;">
          <span class="icon" style="font-size: 22px; color: #0284c7; flex-shrink: 0;">lightbulb</span>
          <div id="milk-console-insight-text" style="font-weight: 500;">Analyzing milk bank operations...</div>
        </div>

        <!-- Chart Display Stage -->
        <div style="padding: 16px 22px 20px 22px; background: #ffffff;">
          <div id="milk-console-chart" style="min-height: 420px; width: 100%;"></div>
        </div>

        <!-- Control Deck: Channel Selector & Filters -->
        <div style="padding: 18px 22px 22px; background-color: #f8fafc; border-top: 1.5px solid #bae6fd;">
          
          <!-- Channel Switcher -->
          <div style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <p style="font-size: 12px; font-weight: 700; color: #0369a1; text-transform: uppercase; letter-spacing: 0.6px; margin: 0;">
                Choose an Analytics Report
              </p>
              <span style="font-size: 12px; color: #64748b;">Click channel button to switch chart</span>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px;" id="milk-channel-controls">
              
              <!-- Channel 1: Inflow vs Outflow -->
              <button class="btn milk-channel-btn ${(_currentChannel === 'inflow') ? 'milk-channel-btn--active' : ''}" data-channel="inflow" type="button">
                <span class="icon" style="font-size: 22px;">swap_vert</span>
                <span style="text-align: left;">
                  <strong style="display: block; font-size: 13px;">Inflow vs Outflow</strong>
                  <span style="font-size: 11px; opacity: 0.85; font-weight: 400;">Monthly collected vs dispensed</span>
                </span>
              </button>

              <!-- Channel 2: Distribution by Barangay -->
              <button class="btn milk-channel-btn ${(_currentChannel === 'barangay') ? 'milk-channel-btn--active' : ''}" data-channel="barangay" type="button">
                <span class="icon" style="font-size: 22px;">location_on</span>
                <span style="text-align: left;">
                  <strong style="display: block; font-size: 13px;">By Barangay</strong>
                  <span style="font-size: 11px; opacity: 0.85; font-weight: 400;">Bags delivered to infants</span>
                </span>
              </button>

              <!-- Channel 3: Active Donors by Barangay -->
              <button class="btn milk-channel-btn ${(_currentChannel === 'donors') ? 'milk-channel-btn--active' : ''}" data-channel="donors" type="button">
                <span class="icon" style="font-size: 22px;">diversity_1</span>
                <span style="text-align: left;">
                  <strong style="display: block; font-size: 13px;">Donor Outreach</strong>
                  <span style="font-size: 11px; opacity: 0.85; font-weight: 400;">Active donors to target drives</span>
                </span>
              </button>

              <!-- Channel 4: Spoilage & Expiry Risk -->
              <button class="btn milk-channel-btn ${(_currentChannel === 'expiry') ? 'milk-channel-btn--active' : ''}" data-channel="expiry" type="button">
                <span class="icon" style="font-size: 22px;">schedule</span>
                <span style="text-align: left;">
                  <strong style="display: block; font-size: 13px;">Expiry Monitor</strong>
                  <span style="font-size: 11px; opacity: 0.85; font-weight: 400;">Shelf-life & spoilage risk</span>
                </span>
              </button>

              <!-- Channel 5: Freezer Shelf Status -->
              <button class="btn milk-channel-btn ${(_currentChannel === 'freezer') ? 'milk-channel-btn--active' : ''}" data-channel="freezer" type="button">
                <span class="icon" style="font-size: 22px;">kitchen</span>
                <span style="text-align: left;">
                  <strong style="display: block; font-size: 13px;">Freezer Shelves</strong>
                  <span style="font-size: 11px; opacity: 0.85; font-weight: 400;">Remaining bags per shelf</span>
                </span>
              </button>

            </div>
          </div>

          <!-- Section: Filters & Customization -->
          <div>
            <p style="font-size: 12px; font-weight: 700; color: #0369a1; text-transform: uppercase; letter-spacing: 0.6px; margin: 0 0 8px 0;">
              Filters &amp; Customization
            </p>
            <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
              
              <!-- Year Filter -->
              <div id="milk-tuner-year-wrap" style="display: flex; align-items: center; gap: 8px; background: #ffffff; padding: 6px 14px; border-radius: 8px; border: 1.5px solid #bae6fd; box-shadow: 0 1px 2px rgba(2, 132, 199, 0.05);">
                <span class="icon icon--sm" style="color: #0284c7; font-size: 16px;">calendar_today</span>
                <label for="milk-tuner-year" style="font-size: 12px; color: #475569; margin: 0; font-weight: 600;">Year:</label>
                <select id="milk-tuner-year" class="form-input" style="padding: 2px 4px; min-height: auto; font-size: 13px; border: none; background: transparent; font-weight: 700; color: #0c4a6e; cursor: pointer;">
                  <option value="all" ${_yearFilter === 'all' ? 'selected' : ''}>All Years</option>
                  ${sortedYears.map(y => `<option value="${y}" ${_yearFilter === y ? 'selected' : ''}>${y}</option>`).join('')}
                </select>
              </div>

              <!-- Period Filter (Full Year / Quarters) -->
              <div id="milk-tuner-period-wrap" style="display: flex; align-items: center; gap: 8px; background: #ffffff; padding: 6px 14px; border-radius: 8px; border: 1.5px solid #bae6fd; box-shadow: 0 1px 2px rgba(2, 132, 199, 0.05);">
                <span class="icon icon--sm" style="color: #0284c7; font-size: 16px;">date_range</span>
                <label for="milk-tuner-period" style="font-size: 12px; color: #475569; margin: 0; font-weight: 600;">Period:</label>
                <select id="milk-tuner-period" class="form-input" style="padding: 2px 4px; min-height: auto; font-size: 13px; border: none; background: transparent; font-weight: 700; color: #0c4a6e; cursor: pointer;">
                  <option value="all" ${_periodFilter === 'all' ? 'selected' : ''}>Full Year</option>
                  <option value="q1" ${_periodFilter === 'q1' ? 'selected' : ''}>Q1 (Jan – Mar)</option>
                  <option value="q2" ${_periodFilter === 'q2' ? 'selected' : ''}>Q2 (Apr – Jun)</option>
                  <option value="q3" ${_periodFilter === 'q3' ? 'selected' : ''}>Q3 (Jul – Sep)</option>
                  <option value="q4" ${_periodFilter === 'q4' ? 'selected' : ''}>Q4 (Oct – Dec)</option>
                </select>
              </div>

              <!-- Limit / Scope Filter (For Barangay & Donors) -->
              <div id="milk-tuner-limit-wrap" style="display: none; align-items: center; gap: 8px; background: #ffffff; padding: 6px 14px; border-radius: 8px; border: 1.5px solid #bae6fd; box-shadow: 0 1px 2px rgba(2, 132, 199, 0.05);">
                <span class="icon icon--sm" style="color: #0284c7; font-size: 16px;">filter_list</span>
                <label for="milk-tuner-limit" style="font-size: 12px; color: #475569; margin: 0; font-weight: 600;">Show:</label>
                <select id="milk-tuner-limit" class="form-input" style="padding: 2px 4px; min-height: auto; font-size: 13px; border: none; background: transparent; font-weight: 700; color: #0c4a6e; cursor: pointer;">
                  <option value="10" ${_limitFilter === '10' ? 'selected' : ''}>Top 10</option>
                  <option value="all" ${_limitFilter === 'all' ? 'selected' : ''}>All 22 Barangays</option>
                </select>
              </div>

              <!-- Expiry Horizon Note (For Expiry Channel only) -->
              <div id="milk-tuner-expiry-note" style="display: none; align-items: center; gap: 6px; font-size: 12px; color: #64748b; font-weight: 500;">
                <span class="icon icon--sm" style="color: #d97706; font-size: 16px;">info</span>
                Thresholds: Expired (0d), Priority Dispatch (&le;30d), Moderate (31&ndash;60d), Safe (&gt;60d)
              </div>

            </div>
          </div>

        </div>
      </div>

    </div>
  `;
}

/**
 * Mount and Render ApexCharts according to Active Channel
 */
export function mountMilkAnalyticsCharts(analyticsData) {
  _cachedAnalyticsData = analyticsData;
  _bindConsoleControls();
  _renderChannelChart();
}

/**
 * Bind Click & Change Events on Control Deck
 */
function _bindConsoleControls() {
  // Channel Buttons
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

  // Year Tuner
  const yearEl = document.getElementById('milk-tuner-year');
  if (yearEl) {
    yearEl.onchange = (e) => {
      _yearFilter = e.target.value;
      _renderChannelChart();
    };
  }

  // Period Tuner
  const periodEl = document.getElementById('milk-tuner-period');
  if (periodEl) {
    periodEl.onchange = (e) => {
      _periodFilter = e.target.value;
      _renderChannelChart();
    };
  }

  // Limit Tuner
  const limitEl = document.getElementById('milk-tuner-limit');
  if (limitEl) {
    limitEl.onchange = (e) => {
      _limitFilter = e.target.value;
      _renderChannelChart();
    };
  }
}

/**
 * Master Chart Switcher & Renderer
 */
function _renderChannelChart() {
  if (!_cachedAnalyticsData) return;

  const chartEl = document.getElementById('milk-console-chart');
  if (!chartEl) return;

  if (_activeChartInstance) {
    try {
      _activeChartInstance.destroy();
    } catch {}
    _activeChartInstance = null;
  }

  // Toggle tuner visibility
  const yearWrap = document.getElementById('milk-tuner-year-wrap');
  const periodWrap = document.getElementById('milk-tuner-period-wrap');
  const limitWrap = document.getElementById('milk-tuner-limit-wrap');
  const expiryNote = document.getElementById('milk-tuner-expiry-note');

  if (yearWrap) yearWrap.style.display = (_currentChannel === 'expiry' || _currentChannel === 'freezer') ? 'none' : 'flex';
  if (periodWrap) periodWrap.style.display = (_currentChannel === 'expiry' || _currentChannel === 'freezer') ? 'none' : 'flex';
  if (limitWrap) limitWrap.style.display = (_currentChannel === 'barangay' || _currentChannel === 'donors') ? 'flex' : 'none';
  if (expiryNote) expiryNote.style.display = (_currentChannel === 'expiry') ? 'flex' : 'none';

  // Filter raw collections and dispatches according to year and period
  const filteredDonations = _cachedAnalyticsData.rawDonations.filter(d => {
    const dt = d.arrival_date || d.created_at;
    return isDateMatchingFilter(dt, _yearFilter, _periodFilter, _cachedAnalyticsData.customStart, _cachedAnalyticsData.customEnd);
  });

  const filteredDispatches = _cachedAnalyticsData.rawDispatches.filter(disp => {
    const dt = disp.dispensed_date || disp.dispensed_at;
    return isDateMatchingFilter(dt, _yearFilter, _periodFilter, _cachedAnalyticsData.customStart, _cachedAnalyticsData.customEnd);
  });

  const activeBatches = _cachedAnalyticsData.rawBatches.filter(b => (Number(b.remaining_bags || 0) > 0));

  let chartOptions = {};

  // ══════════════════════════════════════════════════════════════════════════
  // CHANNEL 1: Monthly Milk Inflow vs. Outflow (in Bags)
  // ══════════════════════════════════════════════════════════════════════════
  if (_currentChannel === 'inflow') {
    _setConsoleHeader(
      'Monthly Milk Inflow vs. Outflow',
      'Compare monthly milk collected vs. total volume dispensed to infants (in bags)'
    );

    const monthlyInflow = new Array(12).fill(0);
    const monthlyOutflow = new Array(12).fill(0);

    let totalInflowBags = 0;
    let totalOutflowBags = 0;

    filteredDonations.forEach(d => {
      const dt = d.arrival_date || d.created_at;
      if (!dt) return;
      const m = new Date(dt).getMonth();
      const bags = Number(d.bags_count || 1);
      if (m >= 0 && m < 12) {
        monthlyInflow[m] += bags;
        totalInflowBags += bags;
      }
    });

    filteredDispatches.forEach(disp => {
      const dt = disp.dispensed_date || disp.dispensed_at;
      if (!dt) return;
      const m = new Date(dt).getMonth();
      const bags = Number(disp.bags_dispensed || 0);
      if (m >= 0 && m < 12) {
        monthlyOutflow[m] += bags;
        totalOutflowBags += bags;
      }
    });

    const netBalance = totalInflowBags - totalOutflowBags;

    _updateTicker(
      `${totalInflowBags} Bags Inflow · ${totalOutflowBags} Bags Dispensed`,
      `${netBalance >= 0 ? '+' : ''}${netBalance} Bags Net Reserve`
    );

    let peakMonthName = 'None';
    let peakMonthBags = 0;
    monthlyInflow.forEach((qty, idx) => {
      if (qty > peakMonthBags) {
        peakMonthBags = qty;
        peakMonthName = MONTH_LABELS[idx];
      }
    });

    _updateTakeaway(
      `Peak intake was observed in <strong>${peakMonthName}</strong> (${peakMonthBags} bags collected). Net balance for this filter period stands at <strong>${netBalance >= 0 ? '+' : ''}${netBalance} bags</strong>.`
    );

    chartOptions = {
      series: [
        { name: 'Milk Bags Collected', data: monthlyInflow },
        { name: 'Milk Bags Dispensed', data: monthlyOutflow },
      ],
      chart: {
        type: 'bar',
        height: 400,
        fontFamily: "'Inter', sans-serif",
        toolbar: { show: false },
      },
      colors: ['#0284c7', '#059669'],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 4,
          dataLabels: { position: 'top' },
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => (val > 0 ? `${val}` : ''),
        offsetY: -20,
        style: { fontSize: '11px', fontWeight: 600, colors: ['#475569'] },
      },
      stroke: { show: true, width: 2, colors: ['transparent'] },
      xaxis: {
        categories: MONTH_LABELS,
        labels: { style: { colors: '#64748b', fontSize: '12px', fontWeight: 600 } },
      },
      yaxis: {
        title: { text: 'Number of Bags', style: { color: '#0369a1', fontWeight: 600 } },
        labels: { style: { colors: '#64748b' } },
      },
      fill: { opacity: 0.95 },
      tooltip: {
        y: { formatter: (val) => `${val} Bags` },
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '13px',
        fontWeight: 600,
      },
      grid: { borderColor: '#f1f5f9' },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CHANNEL 2: Distribution Volume Categorized by Barangay (Clean Bags)
  // ══════════════════════════════════════════════════════════════════════════
  else if (_currentChannel === 'barangay') {
    _setConsoleHeader(
      'Distribution Volume by Barangay',
      'Total pasteurized milk bags delivered to infant beneficiaries across Manolo Fortich'
    );

    const brgyMap = {};
    let totalDispensedBags = 0;

    filteredDispatches.forEach(disp => {
      const b = String(disp.barangay || 'Unspecified').trim();
      const bags = Number(disp.bags_dispensed || 0);
      brgyMap[b] = (brgyMap[b] || 0) + bags;
      totalDispensedBags += bags;
    });

    let sortedBrgys = Object.keys(brgyMap).sort((a, b) => brgyMap[b] - brgyMap[a]);
    if (_limitFilter !== 'all') {
      const limit = parseInt(_limitFilter, 10) || 10;
      sortedBrgys = sortedBrgys.slice(0, limit);
    }

    const seriesData = sortedBrgys.map(b => brgyMap[b] || 0);

    const topName = sortedBrgys[0] || 'None';
    const topQty = brgyMap[topName] || 0;

    _updateTicker(
      `${totalDispensedBags.toLocaleString()} Total Bags Delivered`,
      `${topName} (${topQty.toLocaleString()} Bags)`
    );

    if (totalDispensedBags > 0 && topQty > 0) {
      const topPct = Math.round((topQty / totalDispensedBags) * 100);
      _updateTakeaway(
        `<strong>${topName}</strong> received the largest infant allocation with <strong>${topQty} bags</strong> (~${topPct}% of all distributed milk across ${Object.keys(brgyMap).length} recipient barangays).`
      );
    } else {
      _updateTakeaway(
        `No pasteurized milk dispatch records found for the selected filter period.`
      );
    }

    chartOptions = {
      series: [
        { name: 'Bags Dispensed', data: seriesData },
      ],
      chart: {
        type: 'bar',
        height: Math.max(380, sortedBrgys.length * 36),
        fontFamily: "'Inter', sans-serif",
        toolbar: { show: false },
      },
      colors: ['#0284c7'],
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '60%',
          borderRadius: 6,
          dataLabels: { position: 'right' },
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => `${val} Bags`,
        offsetX: 10,
        style: { fontSize: '12px', fontWeight: 700, colors: ['#0369a1'] },
      },
      xaxis: {
        categories: sortedBrgys,
        labels: { style: { colors: '#64748b' } },
        title: { text: 'Total Bags Delivered', style: { color: '#0369a1', fontWeight: 600 } },
      },
      yaxis: {
        labels: { style: { colors: '#334155', fontWeight: 600, fontSize: '12.5px' } },
      },
      tooltip: {
        y: { formatter: (val) => `${val} Bags delivered` },
      },
      grid: { borderColor: '#f1f5f9' },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CHANNEL 3: Active Donors Count per Barangay (Targeting Donor Drives)
  // ══════════════════════════════════════════════════════════════════════════
  else if (_currentChannel === 'donors') {
    _setConsoleHeader(
      'Active Donors Count & Drive Targets',
      'Active donor mothers per barangay to identify donor clusters and target community drives'
    );

    const brgyDonorsMap = {};
    BARANGAYS.forEach(b => {
      brgyDonorsMap[b] = new Set();
    });
    brgyDonorsMap['Unassigned / MNAO Center'] = new Set();

    filteredDonations.forEach(d => {
      const donorKey = String(d.donor_code || '').trim().toLowerCase();
      if (!donorKey) return;
      const brgy = resolveDonorBarangay(d);
      if (!brgyDonorsMap[brgy]) brgyDonorsMap[brgy] = new Set();
      brgyDonorsMap[brgy].add(donorKey);
    });

    let donorEntries = Object.keys(brgyDonorsMap).map(b => ({
      barangay: b,
      count: brgyDonorsMap[b].size,
    })).sort((a, b) => b.count - a.count);

    const totalDonors = new Set(
      filteredDonations.map(d => String(d.donor_code || '').trim().toLowerCase()).filter(Boolean)
    ).size;

    const zeroDonorBrgys = donorEntries.filter(e => e.count === 0 && e.barangay !== 'Unassigned / MNAO Center');

    if (_limitFilter !== 'all') {
      const limit = parseInt(_limitFilter, 10) || 10;
      donorEntries = donorEntries.slice(0, limit);
    }

    const topDonorArea = donorEntries[0] || { barangay: 'None', count: 0 };

    _updateTicker(
      `${totalDonors} Active Donor Mothers`,
      `${zeroDonorBrgys.length} Target Drive Areas`
    );

    _updateTakeaway(
      `<strong>${topDonorArea.barangay}</strong> leads with <strong>${topDonorArea.count} active donors</strong>. A total of <strong>${zeroDonorBrgys.length} barangays</strong> have 0 active contributors &mdash; prioritize these areas for MNAO mobile lactation collection drives.`
    );

    chartOptions = {
      series: [
        { name: 'Active Donor Mothers', data: donorEntries.map(e => e.count) },
      ],
      chart: {
        type: 'bar',
        height: Math.max(380, donorEntries.length * 36),
        fontFamily: "'Inter', sans-serif",
        toolbar: { show: false },
      },
      colors: ['#0284c7'],
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '60%',
          borderRadius: 6,
          distributed: true,
          dataLabels: { position: 'right' },
        },
      },
      colors: donorEntries.map(e => (e.count > 0 ? '#0284c7' : '#cbd5e1')),
      dataLabels: {
        enabled: true,
        formatter: (val) => `${val} Donors`,
        offsetX: 10,
        style: { fontSize: '12px', fontWeight: 700, colors: ['#0f172a'] },
      },
      xaxis: {
        categories: donorEntries.map(e => e.barangay),
        title: { text: 'Unique Donor Mothers Count', style: { color: '#0369a1', fontWeight: 600 } },
        labels: { style: { colors: '#64748b' } },
      },
      yaxis: {
        labels: { style: { colors: '#334155', fontWeight: 600, fontSize: '12.5px' } },
      },
      legend: { show: false },
      tooltip: {
        y: { formatter: (val) => `${val} Active donor mothers` },
      },
      grid: { borderColor: '#f1f5f9' },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CHANNEL 4: Spoilage / Expiration Warning Indicators (Bags)
  // ══════════════════════════════════════════════════════════════════════════
  else if (_currentChannel === 'expiry') {
    _setConsoleHeader(
      'Spoilage & Expiry Risk Indicators',
      'Remaining pasteurized bags categorized by shelf-life thresholds for FEFO dispatch'
    );

    let expiredBags = 0;
    let nearExpiryBags = 0;  // 1-30 days
    let moderateBags = 0;    // 31-60 days
    let optimalBags = 0;     // >60 days

    let expiredBatches = [];
    let nearExpiryBatches = [];

    activeBatches.forEach(b => {
      const days = getDaysRemaining(b.expiry_date);
      const rem = Number(b.remaining_bags || 0);

      if (days < 0) {
        expiredBags += rem;
        expiredBatches.push(b.batch_number);
      } else if (days <= 30) {
        nearExpiryBags += rem;
        nearExpiryBatches.push(`${b.batch_number} (${days}d)`);
      } else if (days <= 60) {
        moderateBags += rem;
      } else {
        optimalBags += rem;
      }
    });

    const totalActiveBags = expiredBags + nearExpiryBags + moderateBags + optimalBags;

    _updateTicker(
      `${totalActiveBags} Total In-Stock Bags`,
      `${nearExpiryBags} Bags Priority Dispatch (≤30d)`
    );

    if (expiredBags > 0) {
      _updateTakeaway(
        `<span style="color:#dc2626; font-weight:700;">Critical Alert:</span> <strong>${expiredBags} bags</strong> are past expiration (${expiredBatches.join(', ')}). Immediate quarantine required.`
      );
    } else if (nearExpiryBags > 0) {
      _updateTakeaway(
        `<strong>${nearExpiryBags} bags</strong> require priority dispatch under FEFO within 30 days (${nearExpiryBatches.slice(0, 3).join(', ')}). <strong>${optimalBags} bags</strong> remain in safe cold storage.`
      );
    } else {
      _updateTakeaway(
        `All <strong>${totalActiveBags} active bags</strong> in cold chain are in safe, optimal condition with &gt;30 days remaining shelf-life.`
      );
    }

    const categories = ['Expired (>0d overdue)', 'Near Expiry (≤30d)', 'Moderate (31-60d)', 'Optimal (>60d)'];
    const bagCounts = [expiredBags, nearExpiryBags, moderateBags, optimalBags];
    const riskColors = ['#dc2626', '#d97706', '#ca8a04', '#059669'];

    chartOptions = {
      series: [
        { name: 'Remaining Bags', data: bagCounts },
      ],
      chart: {
        type: 'bar',
        height: 380,
        fontFamily: "'Inter', sans-serif",
        toolbar: { show: false },
      },
      plotOptions: {
        bar: {
          distributed: true,
          columnWidth: '50%',
          borderRadius: 6,
          dataLabels: { position: 'top' },
        },
      },
      colors: riskColors,
      dataLabels: {
        enabled: true,
        formatter: (val) => `${val} Bags`,
        offsetY: -22,
        style: { fontSize: '13px', fontWeight: 700, colors: ['#0f172a'] },
      },
      xaxis: {
        categories: categories,
        labels: { style: { colors: '#475569', fontWeight: 700, fontSize: '12.5px' } },
      },
      yaxis: {
        title: { text: 'Remaining Bags', style: { color: '#0369a1', fontWeight: 600 } },
        labels: { style: { colors: '#64748b' } },
      },
      legend: { show: false },
      tooltip: {
        y: { formatter: (val) => `${val} Bags in risk tier` },
      },
      grid: { borderColor: '#f1f5f9' },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CHANNEL 5: Inventory Status by Freezer Shelf (Remaining Bags)
  // ══════════════════════════════════════════════════════════════════════════
  else if (_currentChannel === 'freezer') {
    _setConsoleHeader(
      'Inventory Status by Freezer Shelf',
      'Remaining pasteurized bags categorized by physical shelf location and batch lot'
    );

    const shelfMap = {};
    SHELVES_ORDER.forEach(s => {
      shelfMap[s] = {};
    });

    let totalInFreezer = 0;
    const allBatchesSet = new Set();

    activeBatches.forEach(b => {
      const shelf = b.freezer_shelf || 'Shelf 1';
      if (!shelfMap[shelf]) shelfMap[shelf] = {};
      const rem = Number(b.remaining_bags || 0);
      shelfMap[shelf][b.batch_number] = (shelfMap[shelf][b.batch_number] || 0) + rem;
      totalInFreezer += rem;
      allBatchesSet.add(b.batch_number);
    });

    const batchList = Array.from(allBatchesSet);

    // Compute busiest shelf
    let busiestShelf = 'Shelf 1';
    let maxShelfBags = 0;
    SHELVES_ORDER.forEach(s => {
      const bagsOnShelf = Object.values(shelfMap[s] || {}).reduce((a, c) => a + c, 0);
      if (bagsOnShelf > maxShelfBags) {
        maxShelfBags = bagsOnShelf;
        busiestShelf = s;
      }
    });

    _updateTicker(
      `${totalInFreezer} Total Bags in Cold Chain`,
      `${busiestShelf} (${maxShelfBags} Bags)`
    );

    _updateTakeaway(
      `<strong>${busiestShelf}</strong> holds the highest storage volume with <strong>${maxShelfBags} bags</strong>. Physical distribution is balanced across ${activeBatches.length} active pasteurized lots.`
    );

    const series = batchList.map(batchNum => ({
      name: batchNum,
      data: SHELVES_ORDER.map(s => shelfMap[s]?.[batchNum] || 0),
    }));

    chartOptions = {
      series: series.length > 0 ? series : [{ name: 'No Active Stock', data: new Array(SHELVES_ORDER.length).fill(0) }],
      chart: {
        type: 'bar',
        stacked: true,
        height: 400,
        fontFamily: "'Inter', sans-serif",
        toolbar: { show: false },
      },
      colors: ['#0284c7', '#38bdf8', '#0ea5e9', '#0369a1', '#059669', '#f59e0b', '#7c3aed'],
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '65%',
          borderRadius: 4,
          dataLabels: {
            total: {
              enabled: true,
              offsetX: 10,
              style: { fontSize: '12px', fontWeight: 700, color: '#0369a1' },
              formatter: (val) => `${val} Bags`,
            },
          },
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: SHELVES_ORDER,
        title: { text: 'Remaining Bags', style: { color: '#0369a1', fontWeight: 600 } },
        labels: { style: { colors: '#64748b' } },
      },
      yaxis: {
        labels: { style: { colors: '#334155', fontWeight: 700, fontSize: '13px' } },
      },
      tooltip: {
        y: { formatter: (val) => `${val} Bags remaining` },
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '12px',
        fontWeight: 600,
      },
      grid: { borderColor: '#f1f5f9' },
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
  if (sEl) tEl && (sEl.textContent = subtitle);
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
