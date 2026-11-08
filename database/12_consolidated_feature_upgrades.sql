-- ============================================================
-- NutriVision — Consolidated Feature Upgrades (Items #87, #98, #99)
-- Phase 12: Consolidated Schema & Performance Upgrade
--
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- Safe to run multiple times (idempotent IF NOT EXISTS guards).
--
-- Bundled Features:
--   1. Item #87: Commodity Card Photos (commodities.image_url)
--   2. Item #98: Perishable Shelf-Life Policy (commodities.shelf_life_config)
--   3. Item #99: Program Calendar Person in Charge (calendar_events.person_in_charge)
-- ============================================================

-- 1. Commodity Photos (Item #87)
ALTER TABLE public.commodities
  ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;

COMMENT ON COLUMN public.commodities.image_url IS
  'High-performance data URL or asset URL for commodity photo card views and modal previews.';

-- 2. Perishable Shelf-Life & Traffic-Light Policy (Item #98)
ALTER TABLE public.commodities
  ADD COLUMN IF NOT EXISTS shelf_life_config JSONB DEFAULT NULL;

COMMENT ON COLUMN public.commodities.shelf_life_config IS
  'Custom shelf-life configuration (e.g. 7-day Nutribun weekly dispatch thresholds: nearExpiryDays, moderateDays).';

-- 3. Program Calendar Person in Charge (Item #99)
-- (Creates calendar_events table if not yet created, and adds person_in_charge column)
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT        NOT NULL,
  start_date       DATE        NOT NULL,
  start_time       TIME        DEFAULT NULL,
  end_date         DATE        DEFAULT NULL,
  description      TEXT        DEFAULT NULL,
  person_in_charge TEXT        DEFAULT NULL,
  created_by       UUID        REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS person_in_charge TEXT DEFAULT NULL;

COMMENT ON COLUMN public.calendar_events.person_in_charge IS
  'Assigned MNAO staff or external BNS/focal person responsible for scheduled nutrition program activity.';

-- 4. Calendar Events Indexes & RLS
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON public.calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_deleted_at ON public.calendar_events(deleted_at);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'calendar_events' AND policyname = 'calendar_events_select_authenticated'
  ) THEN
    CREATE POLICY "calendar_events_select_authenticated"
      ON public.calendar_events FOR SELECT TO authenticated
      USING (deleted_at IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'calendar_events' AND policyname = 'calendar_events_insert_authenticated'
  ) THEN
    CREATE POLICY "calendar_events_insert_authenticated"
      ON public.calendar_events FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = created_by);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'calendar_events' AND policyname = 'calendar_events_update_authenticated'
  ) THEN
    CREATE POLICY "calendar_events_update_authenticated"
      ON public.calendar_events FOR UPDATE TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;
