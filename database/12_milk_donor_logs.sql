-- ============================================================
-- NutriVision Migration: Milk Bank Confidential Donor Log
-- Run in Supabase SQL Editor so Donor Log syncs across all devices & accounts.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.milk_donor_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_code      TEXT        NOT NULL,
  donor_name      TEXT        NOT NULL,
  barangay        TEXT        NOT NULL,
  contact         TEXT,
  donation_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  donation_time   TEXT        NOT NULL DEFAULT '09:00',
  expression_date DATE        NOT NULL DEFAULT CURRENT_DATE,
  expression_time TEXT        NOT NULL DEFAULT '08:00',
  volume_ml       INT         NOT NULL CHECK (volume_ml > 0),
  staff_name      TEXT        NOT NULL DEFAULT 'Nutrition Staff',
  created_by      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milk_donor_logs_donor_code ON public.milk_donor_logs(donor_code);
CREATE INDEX IF NOT EXISTS idx_milk_donor_logs_created_at ON public.milk_donor_logs(created_at DESC);

ALTER TABLE public.milk_donor_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_milk_donor_logs" ON public.milk_donor_logs;
CREATE POLICY "auth_select_milk_donor_logs" ON public.milk_donor_logs
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_insert_milk_donor_logs" ON public.milk_donor_logs;
CREATE POLICY "auth_insert_milk_donor_logs" ON public.milk_donor_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_update_milk_donor_logs" ON public.milk_donor_logs;
CREATE POLICY "auth_update_milk_donor_logs" ON public.milk_donor_logs
  FOR UPDATE USING (auth.role() = 'authenticated');
