-- ============================================================
-- NutriVision — Database Schema
-- Phase: Defects and Quarantine Logging
--
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- This creates the tables and policies for Defect Logging and Restoration
-- ============================================================

-- ============================================================
-- SECTION 1: DEFECT INCIDENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.defect_incidents (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id              UUID        NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  classification        TEXT        NOT NULL,
  quantity_affected     INT         NOT NULL CHECK (quantity_affected > 0),
  action_taken          TEXT        NOT NULL CHECK (action_taken IN ('Quarantined', 'Disposed')),
  scope                 TEXT        NOT NULL DEFAULT 'partial' CHECK (scope IN ('partial', 'entire_batch')),
  remaining_quarantined INT,
  evidence_url          TEXT,
  remarks               TEXT,
  reported_by           UUID        NOT NULL REFERENCES public.profiles(id),
  reported_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for querying incidents efficiently
CREATE INDEX IF NOT EXISTS idx_defect_incidents_batch_id ON public.defect_incidents(batch_id);
CREATE INDEX IF NOT EXISTS idx_defect_incidents_action_taken ON public.defect_incidents(action_taken);


-- ============================================================
-- SECTION 2: DEFECT RESTORES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.defect_restores (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id       UUID        NOT NULL REFERENCES public.defect_incidents(id) ON DELETE CASCADE,
  batch_id          UUID        NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  restored_quantity INT         NOT NULL CHECK (restored_quantity > 0),
  notes             TEXT,
  restored_by       UUID        NOT NULL REFERENCES public.profiles(id),
  restored_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_defect_restores_incident_id ON public.defect_restores(incident_id);


-- ============================================================
-- SECTION 3: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE public.defect_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defect_restores ENABLE ROW LEVEL SECURITY;

-- 1. Defect Incidents Policies
CREATE POLICY "auth_select" ON public.defect_incidents
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "auth_insert" ON public.defect_incidents
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_update" ON public.defect_incidents
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- 2. Defect Restores Policies
CREATE POLICY "auth_select" ON public.defect_restores
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "auth_insert" ON public.defect_restores
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
