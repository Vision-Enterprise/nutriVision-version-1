-- ============================================================
-- NutriVision — Database Schema
-- Phase: Persistent User Reports & Defect PDF Archive
--
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- Persists generated reports & defect PDFs per user account
-- ============================================================

-- ============================================================
-- SECTION 1: USER REPORT ARCHIVE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_report_archive (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_name   TEXT        NOT NULL,
  file_name     TEXT        NOT NULL,
  model_id      TEXT        NOT NULL,
  parameters    TEXT,
  filters       JSONB,
  format        TEXT        NOT NULL DEFAULT 'PDF',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_report_archive_user ON public.user_report_archive(user_id, created_at DESC);

-- ============================================================
-- SECTION 2: USER DEFECT PDF ARCHIVE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_defect_archive (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  incident_id   UUID        REFERENCES public.defect_incidents(id) ON DELETE SET NULL,
  file_name     TEXT        NOT NULL,
  batch_number  TEXT        NOT NULL,
  action_taken  TEXT        NOT NULL,
  incident_data JSONB,
  batch_data    JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_defect_archive_user ON public.user_defect_archive(user_id, created_at DESC);

-- ============================================================
-- SECTION 3: RLS POLICIES
-- ============================================================
ALTER TABLE public.user_report_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_defect_archive ENABLE ROW LEVEL SECURITY;

-- Report Archive Policies: users see and manage their own archives (Admin can see all)
DROP POLICY IF EXISTS "Users can view own report archives" ON public.user_report_archive;
CREATE POLICY "Users can view own report archives"
  ON public.user_report_archive FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'
  ));

DROP POLICY IF EXISTS "Users can insert own report archives" ON public.user_report_archive;
CREATE POLICY "Users can insert own report archives"
  ON public.user_report_archive FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own report archives" ON public.user_report_archive;
CREATE POLICY "Users can delete own report archives"
  ON public.user_report_archive FOR DELETE
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'
  ));

-- Defect Archive Policies
DROP POLICY IF EXISTS "Users can view own defect archives" ON public.user_defect_archive;
CREATE POLICY "Users can view own defect archives"
  ON public.user_defect_archive FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'
  ));

DROP POLICY IF EXISTS "Users can insert own defect archives" ON public.user_defect_archive;
CREATE POLICY "Users can insert own defect archives"
  ON public.user_defect_archive FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own defect archives" ON public.user_defect_archive;
CREATE POLICY "Users can delete own defect archives"
  ON public.user_defect_archive FOR DELETE
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'
  ));
