-- ============================================================
-- NutriVision — Database Schema
-- Phase: Milk Bank Module (Freezer, Intake, & BM-XXX Batches)
--
-- Based directly on:
-- 1. Official Log of Milk Received (Form MH.MNAO.FM.002.00)
-- 2. BM-XXX Pasteurization Notebook
-- 3. Upright Freezer Shelf Organization (Shelves 1-6 + Bottom Bin)
--
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================


-- ============================================================
-- SECTION 1: RAW MILK DONATION INTAKE (Form MH.MNAO.FM.002.00)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.milk_donations (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_code                TEXT        NOT NULL, -- e.g. '25-1-32', '25-185-236'
  bags_count                INT         NOT NULL CHECK (bags_count > 0),
  volume_ml                 INT,                  -- optional volume in ml
  expression_date_notes     TEXT        DEFAULT '@see donor log',
  transport_date            TEXT,                 -- e.g. '10/03-11/22/24' or specific date
  transport_time            TEXT        DEFAULT '12:00 PM',
  condition_at_collection   TEXT        NOT NULL DEFAULT 'ok',
  arrival_date              DATE        NOT NULL DEFAULT CURRENT_DATE,
  arrival_time              TEXT        DEFAULT '12:30 PM',
  condition_at_arrival      TEXT        NOT NULL DEFAULT 'ok',
  transport_condition       TEXT,
  status                    TEXT        NOT NULL DEFAULT 'stored_raw'
                                        CHECK (status IN ('stored_raw', 'pasteurized', 'discarded')),
  received_by               UUID        REFERENCES public.profiles(id),
  received_by_name          TEXT,                 -- fallback/signature display name
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milk_donations_donor_code ON public.milk_donations(donor_code);
CREATE INDEX IF NOT EXISTS idx_milk_donations_status ON public.milk_donations(status);
CREATE INDEX IF NOT EXISTS idx_milk_donations_arrival_date ON public.milk_donations(arrival_date);


-- ============================================================
-- SECTION 2: PASTEURIZED BATCHES (BM-XXX Notebook)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.milk_batches (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number              TEXT        UNIQUE NOT NULL, -- e.g. 'BM-095'
  date_pasteurized          DATE        NOT NULL DEFAULT CURRENT_DATE,
  expiry_date               DATE        NOT NULL,        -- typically 3-6 months from pasteurization
  total_bags                INT         NOT NULL CHECK (total_bags > 0),
  remaining_bags            INT         NOT NULL CHECK (remaining_bags >= 0),
  freezer_shelf             TEXT        NOT NULL DEFAULT 'Shelf 1'
                                        CHECK (freezer_shelf IN (
                                          'Shelf 1', 'Shelf 2', 'Shelf 3',
                                          'Shelf 4', 'Shelf 5', 'Shelf 6',
                                          'Bottom Bin'
                                        )),
  status                    TEXT        NOT NULL DEFAULT 'available'
                                        CHECK (status IN ('available', 'low_stock', 'depleted', 'expired', 'quarantined')),
  remarks                   TEXT,
  created_by                UUID        REFERENCES public.profiles(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milk_batches_batch_number ON public.milk_batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_milk_batches_status ON public.milk_batches(status);
CREATE INDEX IF NOT EXISTS idx_milk_batches_freezer_shelf ON public.milk_batches(freezer_shelf);
CREATE INDEX IF NOT EXISTS idx_milk_batches_expiry_date ON public.milk_batches(expiry_date);


-- ============================================================
-- SECTION 3: DISPENSE & RECIPIENT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.milk_dispatches (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id                  UUID        NOT NULL REFERENCES public.milk_batches(id) ON DELETE RESTRICT,
  recipient_name            TEXT        NOT NULL, -- Infant / Mother's name
  barangay                  TEXT        NOT NULL,
  bags_dispensed            INT         NOT NULL CHECK (bags_dispensed > 0),
  indication                TEXT        NOT NULL DEFAULT 'Preterm / Low Birth Weight'
                                        CHECK (indication IN (
                                          'Preterm / Low Birth Weight',
                                          'Maternal Illness',
                                          'Infant Malnutrition',
                                          'Orphaned / Abandoned',
                                          'Other'
                                        )),
  dispensed_date            DATE        NOT NULL DEFAULT CURRENT_DATE,
  dispensed_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_by               UUID        REFERENCES public.profiles(id),
  released_by_name          TEXT,
  remarks                   TEXT
);

CREATE INDEX IF NOT EXISTS idx_milk_dispatches_batch_id ON public.milk_dispatches(batch_id);
CREATE INDEX IF NOT EXISTS idx_milk_dispatches_barangay ON public.milk_dispatches(barangay);
CREATE INDEX IF NOT EXISTS idx_milk_dispatches_date ON public.milk_dispatches(dispensed_date);


-- ============================================================
-- SECTION 4: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================
ALTER TABLE public.milk_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milk_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milk_dispatches ENABLE ROW LEVEL SECURITY;

-- 1. Donations Policies
CREATE POLICY "auth_select_milk_donations" ON public.milk_donations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "auth_insert_milk_donations" ON public.milk_donations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_update_milk_donations" ON public.milk_donations
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 2. Batches Policies
CREATE POLICY "auth_select_milk_batches" ON public.milk_batches
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "auth_insert_milk_batches" ON public.milk_batches
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_update_milk_batches" ON public.milk_batches
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 3. Dispatches Policies
CREATE POLICY "auth_select_milk_dispatches" ON public.milk_dispatches
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "auth_insert_milk_dispatches" ON public.milk_dispatches
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_update_milk_dispatches" ON public.milk_dispatches
  FOR UPDATE USING (auth.role() = 'authenticated');
