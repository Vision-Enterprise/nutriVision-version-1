/**
 * Supabase Client — Single Instance
 *
 * WHY a single exported instance?
 * ─────────────────────────────────
 * If you call createClient() in multiple files, each call creates a
 * separate client object with its own internal session management.
 * Two clients can end up in conflicting auth states — one thinks the
 * user is logged in, the other doesn't. This causes confusing bugs.
 *
 * The fix: create ONE client here and import { supabase } from this
 * file everywhere else. JavaScript's ES module system guarantees this
 * file is only evaluated once, no matter how many files import it.
 *
 * HOW Vite environment variables work:
 * ─────────────────────────────────────
 * Vite reads your .env.local file at build time.
 * Any variable starting with VITE_ is injected into import.meta.env
 * and becomes available in your browser JavaScript.
 * Variables WITHOUT the VITE_ prefix are never sent to the browser
 * (important security feature — keep server secrets without VITE_).
 *
 * YOUR SUPABASE KEYS:
 * ─────────────────────────────────────
 * The ANON key used here is safe to be in browser code. It is
 * designed to be public — Supabase's Row Level Security (RLS)
 * policies control what an anonymous or authenticated user can
 * actually read or write. The anon key alone cannot bypass RLS.
 *
 * The SERVICE ROLE key is different — it bypasses RLS entirely.
 * NEVER put the service role key in this file or anywhere in the
 * frontend. It belongs only in server-side code (Edge Functions).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Guard: if .env.local is missing or incomplete, fail immediately with
// a clear, actionable message instead of a confusing downstream error.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[NutriVision] Supabase configuration is missing.\n\n' +
    'Create a .env.local file in the project root with:\n' +
    '  VITE_SUPABASE_URL=https://your-project-id.supabase.co\n' +
    '  VITE_SUPABASE_ANON_KEY=your-anon-key-here\n\n' +
    'Get these values from: Supabase Dashboard → Settings → API'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
