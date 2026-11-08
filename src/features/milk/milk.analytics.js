/**
 * Milk Bank Analytics & Distribution (Item #88)
 *
 * Professional distribution analytics, barangay dispatches, and individual
 * donor recognition honor rolls for MNAO Award Giving & reporting.
 *
 * Provides:
 *   1. Recipient Barangay Distribution Charts & Summary
 *   2. Individual Top Donor Mothers Volume Charts & Award Rankings (Podium 1st, 2nd, 3rd)
 *   3. Filter by Period (All-Time, 2026, 2025, Custom Date Range)
 *   4. Official Printable Award Giving & Distribution PDF export
 */

import ApexCharts from 'apexcharts';
import { BARANGAYS } from '../../shared/constants/app.constants.js';
import { formatDate } from '../../shared/utils/date.utils.js';

let _chartBarangayInstance = null;
let _chartDonorsInstance = null;

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Filter date check helper
 */
function isDateInPeriod(dateStr, period, customStart, customEnd) {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return true;
  const year = d.getFullYear();

  if (period === 'year-2026') return year === 2026;
  if (period === 'year-2025') return year === 2025;
  if (period === 'custom') {
    if (customStart && dateStr < customStart) return false;
    if (customEnd && dateStr > customEnd) return false;
    return true;
  }
  return true; // 'all'
}

/**
 * Compute aggregated analytics for Barangay Distribution & Top Donors
 */
export function computeMilkAnalytics({
  donations = [],
  dispatches = [],
  period = 'all',
  customStart = '',
  customEnd = '',
}) {
  const filteredDonations = (donations || []).filter(d =>
    isDateInPeriod(d.arrival_date || d.created_at, period, customStart, customEnd)
  );

  const filteredDispatches = (dispatches || []).filter(d =>
    isDateInPeriod(d.dispensed_date || d.dispensed_at, period, customStart, customEnd)
  );

  // 1. Group Donations by Donor Mother
  const donorMap = new Map();
  let totalDonatedMl = 0;
  let totalDonationBags = 0;

  for (const d of filteredDonations) {
    const rawName = String(d.donor_code || '').trim();
    if (!rawName) continue;

    const ml = Number(d.volume_ml || 0);
    const bags = Number(d.bags_count || 1);
    totalDonatedMl += ml;
    totalDonationBags += bags;

    const key = rawName.toLowerCase();
    const existing = donorMap.get(key) || {
      name: rawName,
      volumeMl: 0,
      bags: 0,
      intakesCount: 0,
      lastArrivalDate: '',
      barangay: '',
    };

    existing.volumeMl += ml;
    existing.bags += bags;
    existing.intakesCount += 1;

    const arrDate = String(d.arrival_date || '');
    if (!existing.lastArrivalDate || arrDate > existing.lastArrivalDate) {
      existing.lastArrivalDate = arrDate;
    }

    // Try extracting barangay if written in donor name or notes
    if (!existing.barangay) {
      for (const b of BARANGAYS) {
        if (rawName.toLowerCase().includes(b.toLowerCase()) ||
            String(d.transport_condition || '').toLowerCase().includes(b.toLowerCase())) {
          existing.barangay = b;
          break;
        }
      }
    }

    donorMap.set(key, existing);
  }

  // Sort donors by volume (or bags if volume 0)
  const sortedDonors = Array.from(donorMap.values()).sort((a, b) => {
    if (b.volumeMl !== a.volumeMl) return b.volumeMl - a.volumeMl;
    return b.bags - a.bags;
  });

  const rankedDonors = sortedDonors.map((donor, idx) => {
    const rank = idx + 1;
    let citation = 'Honorable Contributor';
    let badgeClass = 'badge--secondary';
    if (rank === 1) { citation = 'Champion Mother Donor'; badgeClass = 'milk-badge--gold'; }
    else if (rank === 2) { citation = 'Outstanding Donor'; badgeClass = 'milk-badge--silver'; }
    else if (rank === 3) { citation = 'Exemplary Donor'; badgeClass = 'milk-badge--bronze'; }

    return {
      ...donor,
      rank,
      citation,
      badgeClass,
    };
  });

  // 2. Group Dispatches by Recipient Barangay
  const barangayMap = new Map();
  let totalDispensedBags = 0;

  for (const disp of filteredDispatches) {
    const brgy = String(disp.barangay || 'Unspecified').trim();
    const bags = Number(disp.bags_dispensed || 0);
    totalDispensedBags += bags;

    const existing = barangayMap.get(brgy) || {
      barangay: brgy,
      bags: 0,
      dispatchesCount: 0,
      recipients: new Set(),
      indications: {},
    };

    existing.bags += bags;
    existing.dispatchesCount += 1;
    if (disp.recipient_name) existing.recipients.add(disp.recipient_name.trim().toLowerCase());

    const ind = String(disp.indication || 'Other').trim();
    existing.indications[ind] = (existing.indications[ind] || 0) + bags;

    barangayMap.set(brgy, existing);
  }

  // Sort barangays by bags descending
  const sortedBarangays = Array.from(barangayMap.values()).map(b => {
    let topIndication = 'N/A';
    let topIndicationBags = 0;
    for (const [ind, count] of Object.entries(b.indications)) {
      if (count > topIndicationBags) {
        topIndicationBags = count;
        topIndication = ind;
      }
    }
    return {
      barangay: b.barangay,
      bags: b.bags,
      dispatchesCount: b.dispatchesCount,
      recipientCount: b.recipients.size,
      topIndication,
    };
  }).sort((a, b) => b.bags - a.bags);

  const topDonor = rankedDonors[0] || null;
  const topBarangay = sortedBarangays[0] || null;

  return {
    period,
    customStart,
    customEnd,
    totalDonatedMl,
    totalDonationBags,
    totalDonorsCount: rankedDonors.length,
    totalDonationRecords: filteredDonations.length,
    totalDispensedBags,
    totalDispatchRecords: filteredDispatches.length,
    topDonor,
    topBarangay,
    rankedDonors,
    sortedBarangays,
  };
}

/**
 * Render the HTML layout for the Analytics & Distribution tab
 */
export function renderMilkAnalyticsSheet(analyticsData) {
  const {
    period,
    customStart,
    customEnd,
    totalDonatedMl,
    totalDonationBags,
    totalDonorsCount,
    totalDispensedBags,
    topDonor,
    topBarangay,
    rankedDonors,
    sortedBarangays,
  } = analyticsData;

  const top3 = rankedDonors.slice(0, 3);
  const remainingDonors = rankedDonors.slice(3);

  return `
    <div class="milk-analytics-container">

      <!-- ── Filter & Action Toolbar ─────────────────────────────── -->
      <div class="milk-analytics-toolbar">
        <div class="milk-analytics-filter-group">
          <label for="milk-analytics-period" class="milk-analytics-label">
            <span class="icon" style="font-size:16px; color:var(--color-milk-primary);">calendar_month</span>
            Analysis Period:
          </label>
          <select id="milk-analytics-period" class="form-select milk-analytics-select">
            <option value="all" ${period === 'all' ? 'selected' : ''}>All-Time Historical</option>
            <option value="year-2026" ${period === 'year-2026' ? 'selected' : ''}>Current Year (2026)</option>
            <option value="year-2025" ${period === 'year-2025' ? 'selected' : ''}>Previous Year (2025)</option>
            <option value="custom" ${period === 'custom' ? 'selected' : ''}>Custom Date Range</option>
          </select>

          <div id="milk-analytics-custom-dates" class="milk-analytics-custom-dates" style="display: ${period === 'custom' ? 'flex' : 'none'};">
            <input type="date" id="milk-analytics-start" class="form-input milk-analytics-date-input" value="${escapeHtml(customStart)}" placeholder="From" />
            <span style="color:var(--color-text-muted);">&mdash;</span>
            <input type="date" id="milk-analytics-end" class="form-input milk-analytics-date-input" value="${escapeHtml(customEnd)}" placeholder="To" />
            <button type="button" id="milk-analytics-apply-btn" class="btn btn-secondary btn-sm">Apply</button>
          </div>
        </div>

        <button type="button" id="btn-export-milk-awards-pdf" class="btn btn--ice" style="display:inline-flex; align-items:center; gap:6px;">
          <span class="icon" style="font-size:18px;">print</span>
          Export Analytics &amp; Citations (PDF)
        </button>
      </div>

      <!-- ── Section 1: Executive KPI Cards ─────────────────────── -->
      <div class="milk-analytics-kpis">
        <div class="stat-card milk-stat-card--blue">
          <div class="stat-card__label">Total Collected Volume</div>
          <div class="stat-card__value" style="color:var(--color-milk-primary);">
            ${totalDonatedMl > 0 ? totalDonatedMl.toLocaleString() + ' <span style="font-size:14px; font-weight:500;">mL</span>' : totalDonationBags.toLocaleString() + ' <span style="font-size:14px; font-weight:500;">Bags</span>'}
          </div>
          <div class="stat-card__footer">
            ${totalDonationBags} total bags from ${totalDonorsCount} donor mothers
          </div>
        </div>

        <div class="stat-card milk-stat-card--blue">
          <div class="stat-card__label">Dispensed to Infants</div>
          <div class="stat-card__value" style="color:#059669;">
            ${totalDispensedBags.toLocaleString()} <span style="font-size:14px; font-weight:500;">Bags</span>
          </div>
          <div class="stat-card__footer">
            Pasteurized nutrition distributed to beneficiaries
          </div>
        </div>

        <div class="stat-card milk-stat-card--blue">
          <div class="stat-card__label">Champion Mother Donor</div>
          <div class="stat-card__value" style="font-size:1.15rem; color:#b45309; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${topDonor ? escapeHtml(topDonor.name) : 'No donations yet'}
          </div>
          <div class="stat-card__footer">
            ${topDonor ? `Rank #1 · ${topDonor.volumeMl > 0 ? topDonor.volumeMl.toLocaleString() + ' mL' : topDonor.bags + ' bags'} contributed` : 'Awaiting intake records'}
          </div>
        </div>

        <div class="stat-card milk-stat-card--blue">
          <div class="stat-card__label">Top Recipient Barangay</div>
          <div class="stat-card__value" style="font-size:1.15rem; color:#0369a1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${topBarangay ? escapeHtml(topBarangay.barangay) : 'No dispatches yet'}
          </div>
          <div class="stat-card__footer">
            ${topBarangay ? `${topBarangay.bags.toLocaleString()} bags received for infants` : 'Awaiting dispatches'}
          </div>
        </div>
      </div>

      <!-- ── Section 2: Top Donor Mother Podium (Recognition) ──── -->
      <div class="card" style="padding: 20px; margin-bottom: 24px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 16px; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="icon" style="color:#eab308; font-size:22px;">military_tech</span>
            <h3 style="margin:0; font-size:1.05rem; font-weight:700; color:var(--color-text);">Donor Mothers Honor Roll &amp; Recognition</h3>
          </div>
          <span style="font-size:12px; color:var(--color-text-muted);">
            Recognizing selfless maternal breastmilk contributors across Manolo Fortich
          </span>
        </div>

        ${top3.length === 0 ? `
          <div style="padding: 30px; text-align: center; color: var(--color-text-muted);">
            <span class="icon" style="font-size: 32px; color: var(--color-milk-primary);">favorite</span>
            <p style="margin-top: 8px;">No donor records logged within this period.</p>
          </div>
        ` : `
          <div class="milk-podium-grid">
            ${top3.map((d) => `
              <div class="milk-podium-card milk-podium-card--${d.rank}">
                <div class="milk-podium-medal">
                  ${d.rank === 1 ? '🥇' : d.rank === 2 ? '🥈' : '🥉'}
                </div>
                <div class="milk-podium-rank">Rank #${d.rank}</div>
                <div class="milk-podium-name">${escapeHtml(d.name)}</div>
                <div class="milk-podium-vol">
                  ${d.volumeMl > 0 ? `${d.volumeMl.toLocaleString()} mL` : `${d.bags} Bag(s)`}
                </div>
                <div class="milk-podium-citation">${escapeHtml(d.citation)}</div>
                <div class="milk-podium-meta">
                  ${d.intakesCount} donation intake${d.intakesCount !== 1 ? 's' : ''}
                  ${d.barangay ? ` &middot; ${escapeHtml(d.barangay)}` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- ── Section 3: Dual Charts Row ────────────────────────── -->
      <div class="milk-analytics-charts-grid">
        <!-- Chart 1: Barangay Distribution -->
        <div class="card" style="padding: 20px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="icon" style="color:var(--color-milk-primary);">location_on</span>
              <h4 style="margin:0; font-size:0.95rem; font-weight:700;">Barangay Infant Dispensing Distribution</h4>
            </div>
            <span style="font-size:11.5px; color:var(--color-text-muted);">Bags Distributed</span>
          </div>
          <div id="chart-milk-barangay" style="min-height: 320px;"></div>
        </div>

        <!-- Chart 2: Top Individual Donors -->
        <div class="card" style="padding: 20px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="icon" style="color:#eab308;">leaderboard</span>
              <h4 style="margin:0; font-size:0.95rem; font-weight:700;">Top Donor Mothers Volume (mL)</h4>
            </div>
            <span style="font-size:11.5px; color:var(--color-text-muted);">Volume in mL</span>
          </div>
          <div id="chart-milk-donors" style="min-height: 320px;"></div>
        </div>
      </div>

      <!-- ── Section 4: Comprehensive Distribution & Honor Roll Tables ── -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px; margin-top: 24px;">

        <!-- Donor Mothers Honor Roll Table -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="padding: 14px 18px; border-bottom: 1px solid var(--color-border); background: var(--color-surface-alt); display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-size:0.9rem; color:var(--color-text); display:flex; align-items:center; gap:6px;">
              <span class="icon" style="font-size:16px; color:#eab308;">emoji_events</span>
              Donor Mothers Leaderboard (${rankedDonors.length})
            </strong>
          </div>
          <div class="table-responsive" style="max-height: 380px; overflow-y: auto;">
            <table class="table" style="margin: 0; font-size: 12.5px;">
              <thead>
                <tr>
                  <th style="width: 50px; text-align: center;">Rank</th>
                  <th>Donor Mother</th>
                  <th style="text-align: right;">Volume (mL)</th>
                  <th style="text-align: center;">Intakes</th>
                  <th>Citation / Recognition</th>
                </tr>
              </thead>
              <tbody>
                ${rankedDonors.length === 0 ? `
                  <tr><td colspan="5" style="text-align:center; padding:20px; color:var(--color-text-muted);">No donor entries found</td></tr>
                ` : rankedDonors.map(d => `
                  <tr>
                    <td style="text-align:center; font-weight:700; ${d.rank <= 3 ? 'color:#b45309;' : 'color:var(--color-text-muted);'}">
                      #${d.rank}
                    </td>
                    <td>
                      <strong style="color:var(--color-text);">${escapeHtml(d.name)}</strong>
                      ${d.barangay ? `<br><span style="font-size:11px; color:var(--color-text-muted);">${escapeHtml(d.barangay)}</span>` : ''}
                    </td>
                    <td style="text-align:right; font-weight:700; color:var(--color-milk-primary);">
                      ${d.volumeMl > 0 ? d.volumeMl.toLocaleString() + ' mL' : d.bags + ' Bags'}
                    </td>
                    <td style="text-align:center; color:var(--color-text-secondary);">${d.intakesCount}</td>
                    <td>
                      <span class="badge ${d.badgeClass}" style="font-size:11px;">
                        ${escapeHtml(d.citation)}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Barangay Dispensing Summary Table -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="padding: 14px 18px; border-bottom: 1px solid var(--color-border); background: var(--color-surface-alt); display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-size:0.9rem; color:var(--color-text); display:flex; align-items:center; gap:6px;">
              <span class="icon" style="font-size:16px; color:var(--color-milk-primary);">holiday_village</span>
              Barangay Recipient Distribution Summary (${sortedBarangays.length})
            </strong>
          </div>
          <div class="table-responsive" style="max-height: 380px; overflow-y: auto;">
            <table class="table" style="margin: 0; font-size: 12.5px;">
              <thead>
                <tr>
                  <th style="width: 50px; text-align: center;">#</th>
                  <th>Barangay</th>
                  <th style="text-align: right;">Bags Dispensed</th>
                  <th style="text-align: center;">Infants</th>
                  <th>Primary Indication</th>
                </tr>
              </thead>
              <tbody>
                ${sortedBarangays.length === 0 ? `
                  <tr><td colspan="5" style="text-align:center; padding:20px; color:var(--color-text-muted);">No dispatches recorded yet</td></tr>
                ` : sortedBarangays.map((b, idx) => `
                  <tr>
                    <td style="text-align:center; font-weight:600; color:var(--color-text-muted);">${idx + 1}</td>
                    <td>
                      <strong style="color:var(--color-text);">${escapeHtml(b.barangay)}</strong>
                    </td>
                    <td style="text-align:right; font-weight:700; color:#059669;">
                      ${b.bags.toLocaleString()} Bags
                    </td>
                    <td style="text-align:center; color:var(--color-text-secondary);">${b.recipientCount}</td>
                    <td>
                      <span style="font-size:11.5px; color:var(--color-text-secondary);">${escapeHtml(b.topIndication)}</span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  `;
}

/**
 * Render ApexCharts for Barangay Distribution and Top Donors
 */
export function mountMilkAnalyticsCharts(analyticsData) {
  const { sortedBarangays, rankedDonors } = analyticsData;

  // Cleanup old charts
  if (_chartBarangayInstance) {
    try { _chartBarangayInstance.destroy(); } catch {}
    _chartBarangayInstance = null;
  }
  if (_chartDonorsInstance) {
    try { _chartDonorsInstance.destroy(); } catch {}
    _chartDonorsInstance = null;
  }

  // 1. Mount Barangay Chart
  const elBrgy = document.getElementById('chart-milk-barangay');
  if (elBrgy) {
    const topBarangays = (sortedBarangays || []).slice(0, 10);
    const categories = topBarangays.length > 0 ? topBarangays.map(b => b.barangay) : ['No Data'];
    const seriesData = topBarangays.length > 0 ? topBarangays.map(b => b.bags) : [0];

    const optionsBrgy = {
      series: [{ name: 'Bags Dispensed', data: seriesData }],
      chart: {
        type: 'bar',
        height: 310,
        toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false } },
        fontFamily: "'Inter', sans-serif",
      },
      colors: ['#0284c7'],
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: '45%',
          distributed: false,
          dataLabels: { position: 'top' },
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => val > 0 ? `${val} bags` : '',
        offsetY: -20,
        style: { fontSize: '11px', colors: ['#475569'], fontWeight: 600 },
      },
      xaxis: {
        categories,
        labels: {
          rotate: -25,
          style: { fontSize: '11px', colors: '#64748b' },
          trim: true,
        },
      },
      yaxis: {
        title: { text: 'Bags Dispensed', style: { fontSize: '12px', fontWeight: 600, color: '#475569' } },
        labels: { style: { colors: '#64748b' } },
      },
      grid: { borderColor: '#f1f5f9' },
      tooltip: {
        y: { formatter: (val) => `${val} bags dispensed to infants` },
      },
    };

    _chartBarangayInstance = new ApexCharts(elBrgy, optionsBrgy);
    _chartBarangayInstance.render();
  }

  // 2. Mount Top Donors Chart
  const elDonors = document.getElementById('chart-milk-donors');
  if (elDonors) {
    const topDonors = (rankedDonors || []).slice(0, 8);
    const donorNames = topDonors.length > 0 ? topDonors.map(d => d.name) : ['No Donors'];
    const volumeData = topDonors.length > 0 ? topDonors.map(d => d.volumeMl || (d.bags * 100)) : [0];

    const optionsDonors = {
      series: [{ name: 'Volume Donated (mL)', data: volumeData }],
      chart: {
        type: 'bar',
        height: 310,
        toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false } },
        fontFamily: "'Inter', sans-serif",
      },
      colors: ['#059669'],
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
          barHeight: '52%',
          dataLabels: { position: 'top' },
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => val > 0 ? `${val.toLocaleString()} mL` : '',
        offsetX: 26,
        style: { fontSize: '11px', colors: ['#1e293b'], fontWeight: 600 },
      },
      xaxis: {
        categories: donorNames,
        labels: {
          style: { fontSize: '11px', colors: '#64748b' },
          formatter: (val) => `${Number(val || 0).toLocaleString()} mL`,
        },
      },
      yaxis: {
        labels: {
          style: { fontSize: '11px', colors: '#334155', fontWeight: 600 },
          maxWidth: 160,
        },
      },
      grid: { borderColor: '#f1f5f9' },
      tooltip: {
        y: { formatter: (val) => `${val.toLocaleString()} mL contributed` },
      },
    };

    _chartDonorsInstance = new ApexCharts(elDonors, optionsDonors);
    _chartDonorsInstance.render();
  }
}
