/**
 * NutriVision — Application Entry Point
 *
 * This file is the first thing Vite loads. It:
 * 1. Imports all global CSS (design tokens → global styles → layout → components)
 * 2. Bootstraps the application
 *
 * IMPORT ORDER MATTERS for CSS:
 * variables.css must load before anything that uses var(--...) tokens.
 * global.css imports variables.css itself, so we only need to import global.css
 * here and the cascade handles the rest.
 *
 * In Phase 3 (Application Shell), this file will:
 * - Initialize the router
 * - Start the auth listener
 * - Render the correct page based on the current route and auth state
 *
 * For now (Phase 0), it renders a placeholder to confirm the project loads.
 */

import './styles/global.css';
import './styles/layout.css';
import './styles/components.css';

// ── Phase 0 Placeholder ────────────────────────────────────────────
// This placeholder is replaced entirely in Phase 3 (Application Shell).
// Its only purpose is to confirm that:
//   1. Vite serves the project correctly
//   2. CSS variables and Inter font load
//   3. No import errors exist

const app = document.getElementById('app');

app.innerHTML = `
  <div style="
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color-background);
    font-family: var(--font-family);
  ">
    <div style="text-align: center; max-width: 320px; padding: var(--space-6);">

      <!-- Brand icon -->
      <div style="
        width: 56px;
        height: 56px;
        background-color: var(--color-primary);
        border-radius: var(--radius-xl);
        margin: 0 auto var(--space-5);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>

      <!-- App name -->
      <h1 style="
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-text);
        margin-bottom: var(--space-2);
        letter-spacing: -0.02em;
      ">NutriVision</h1>

      <!-- Org name -->
      <p style="
        font-size: var(--font-size-xs);
        color: var(--color-text-subtle);
        line-height: var(--line-height-relaxed);
        margin-bottom: var(--space-6);
      ">Municipal Nutrition Action Office<br>Manolo Fortich, Bukidnon</p>

      <!-- Phase indicator -->
      <div style="
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        background-color: var(--color-primary-bg);
        color: var(--color-primary);
        padding: var(--space-2) var(--space-4);
        border-radius: var(--radius-full);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-semibold);
      ">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
        </svg>
        Phase 0 — Foundation Ready
      </div>

    </div>
  </div>
`;
