/**
 * Inventory Advisor Page (Controller)
 *
 * Coordinates advisor state, summary generation, analytics carousel,
 * and chart lifecycle.
 *
 * MVC Controller: delegates HTML templates to .render.js and Chart.js to .charts.js.
 */

import { fetchAdvisorData } from './advisor.service.js';
import { fetchChartData, fetchDashboardStats } from '../dashboard/dashboard.service.js';
import { renderAdvisorLayout } from './advisor.render.js';
import { initAdvCharts, renderAdvReleasesChart } from './advisor.charts.js';
import './advisor.css';

let _advChartData = null;

export async function renderAdvisorPage(profile) {
  const content = document.getElementById('page-content');
  if (!content) return;

  content.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Inventory Advisor</h1>
      <p style="color: var(--color-text-muted);">Action Center & Inventory Health Analysis</p>
    </div>
    
    <div class="loading-state" id="advisor-loading">
      <div class="spinner spinner-lg"></div>
      <p>Analyzing inventory health...</p>
    </div>
    
    <div id="advisor-content" style="display: none;"></div>
  `;

  const [advisorRes, chartRes, statsRes] = await Promise.all([
    fetchAdvisorData(),
    fetchChartData(),
    fetchDashboardStats()
  ]);
  
  const { success, data, error } = advisorRes;
  _advChartData = !chartRes.error ? chartRes : null;
  
  if (!success) {
    document.getElementById('advisor-loading').innerHTML = `
      <div class="alert alert-error">
        Failed to load advisor data: ${error}
      </div>
    `;
    return;
  }

  document.getElementById('advisor-loading').style.display = 'none';
  const contentContainer = document.getElementById('advisor-content');
  contentContainer.style.overflowX = 'hidden';
  contentContainer.innerHTML = renderAdvisorLayout(data);
  contentContainer.style.display = 'block';

  // Carousel Navigation
  _initCarousel();

  // Charts Initialization
  if (statsRes && _advChartData) {
    initAdvCharts(_advChartData, statsRes.expirationSummary);

    document.getElementById('adv-chart-releases-toggle')?.addEventListener('change', e => {
      renderAdvReleasesChart(_advChartData, e.target.value);
    });
  }
}

function _initCarousel() {
  let currentSlide = 0;
  const track = document.getElementById('adv-carousel-track');
  const prevBtn = document.getElementById('adv-carousel-prev');
  const nextBtn = document.getElementById('adv-carousel-next');

  if (!track || !prevBtn || !nextBtn) return;

  const updateCarousel = () => {
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
  };

  prevBtn.addEventListener('click', () => {
    if (currentSlide > 0) {
      currentSlide--;
      updateCarousel();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentSlide < 3) {
      currentSlide++;
      updateCarousel();
    }
  });
}
