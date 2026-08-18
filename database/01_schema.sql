-- ============================================================
-- NutriVision — Database Schema
-- Phase 1: Database Foundation
--
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- Run BEFORE 02_rls.sql
--
-- Tables created:
--   1. profiles
--   2. commodities
--   3. batches
--   4. audit_logs
--
-- Also creates:
--   - Helper functions (get_user_role, set_updated_at)
--   - Triggers (auto-create profile on signup, auto-update updated_at)
--   - Indexes for performance
-- ============================================================


-- ============================================================
-- SECTION 1: HELPER FUNCTIONS
-- ============================================================

-- get_user_role()
-- Returns the role of the currently authenticated user.
--
-- WHY a separate function?
-- RLS policies on profiles need to check the user's role.
-- If we query the profiles table directly inside an RLS policy ON profiles,
-- it causes infinite recursion (policy calls itself).
-- SECURITY DEFINER means this function runs as its owner (postgres),
-- bypassing RLS — breaking the recursion safely.
--
-- STABLE means the result is the same within a single query —
-- PostgreSQL can cache the result and avoid repeated lookups.

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN (
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$;


-- set_updated_at()
-- Automatically sets updated_at to NOW() before any UPDATE.
--
-- WHY a trigger instead of doing it in application code?
-- If updated_at is only set by application code, a direct database
-- update (migration, admin fix, etc.) will leave updated_at stale.
-- A trigger guarantees it is always accurate, regardless of how the
-- row was updated.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ============================================================
-- SECTION 2: PROFILES TABLE
-- ============================================================
--
-- Represents an authenticated application user.
-- One profile per auth.users entry.
--
-- WHY profiles is separate from auth.users?
-- Supabase Auth manages auth.users for authentication only
-- (email, password, tokens). Our profiles table stores
-- application-specific data: role, name, active status.
-- We never store passwords here.
--
-- WHY ON DELETE CASCADE?
-- If a user is deleted from auth.users, their profile is also
-- removed. Prevents orphaned profile records.

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT        NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'nutrition_personnel'
                          CHECK (role IN ('administrator', 'nutrition_personnel')),
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on any change to profiles
CREATE OR REPLACE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.profiles IS
  'Application user profiles. Linked 1:1 to auth.users. Stores role and active status.';
COMMENT ON COLUMN public.profiles.id IS
  'Matches auth.users.id exactly. Foreign key with CASCADE delete.';
COMMENT ON COLUMN public.profiles.role IS
  'Either administrator or nutrition_personnel. Enforced by CHECK constraint.';
COMMENT ON COLUMN public.profiles.is_active IS
  'FALSE means the account is deactivated. User cannot log in if handled at application level.';


-- ============================================================
-- SECTION 3: AUTO-CREATE PROFILE ON SIGNUP TRIGGER
-- ============================================================
--
-- When Supabase Auth creates a new user in auth.users,
-- this trigger automatically inserts a matching row in public.profiles.
--
-- WHY SECURITY DEFINER?
-- The trigger needs to INSERT into profiles even though RLS is enabled.
-- SECURITY DEFINER runs as the function owner (postgres), which bypasses RLS.
--
-- HOW the role gets set:
-- When creating a user via Supabase Edge Function (Phase 7), the Edge Function
-- passes { role: 'administrator' } in raw_user_meta_data.
-- The trigger reads it and stores it in profiles.role.
-- Default is nutrition_personnel if not provided.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'nutrition_personnel')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- SECTION 4: COMMODITIES TABLE
-- ============================================================
--
-- Master record for each commodity type.
-- Example: "Vitamin A Capsule" is ONE commodity record.
-- Its individual deliveries are stored as BATCHES.
--
-- WHY commodity_code is UNIQUE?
-- Prevents duplicate registrations of the same commodity.
-- Example: you cannot have two records both named "VA-CAP" in the system.
--
-- WHY deleted_at instead of a boolean is_deleted?
-- deleted_at stores WHEN it was deleted — useful for audit purposes.
-- NULL = active. Any timestamp = soft-deleted.
-- Query active records with: WHERE deleted_at IS NULL

CREATE TABLE IF NOT EXISTS public.commodities (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity_code   TEXT        NOT NULL UNIQUE,
  name             TEXT        NOT NULL,
  description      TEXT,
  category         TEXT        NOT NULL,
  unit             TEXT        NOT NULL,
  created_by       UUID        NOT NULL REFERENCES public.profiles(id),
  updated_by       UUID        REFERENCES public.profiles(id),
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on any change to commodities
CREATE OR REPLACE TRIGGER commodities_set_updated_at
  BEFORE UPDATE ON public.commodities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.commodities IS
  'Master commodity records. One row per commodity type. Batches are stored separately.';
COMMENT ON COLUMN public.commodities.commodity_code IS
  'Short unique code. Example: VA-CAP for Vitamin A Capsule. Must be unique system-wide.';
COMMENT ON COLUMN public.commodities.deleted_at IS
  'NULL = active. Set to NOW() to soft-delete. Hard deletes are not permitted.';
COMMENT ON COLUMN public.commodities.updated_by IS
  'Set to the profile ID of whoever last modified this record. NULL if never updated.';


-- ============================================================
-- SECTION 5: BATCHES TABLE
-- ============================================================
--
-- A batch represents one physical delivery of a commodity.
-- Each batch has its own batch number, quantity, and expiration date.
--
-- WHY UNIQUE (commodity_id, batch_number)?
-- Batch numbers are unique per commodity, not globally.
-- "VA-001" for Vitamin A and "VA-001" for Iron are two different batches.
-- This is the correct business rule. A global UNIQUE on batch_number
-- alone would be too restrictive.
--
-- WHY CHECK (quantity >= 0)?
-- Quantity cannot be negative. This is a database-level safety net.
-- Application validation should catch this first, but the constraint
-- ensures data integrity even if application code has a bug.
--
-- WHY expiration_date is DATE not TIMESTAMPTZ?
-- Expiration dates on commodity packaging show only the date (month/year),
-- not a specific time. Using DATE avoids false precision and
-- timezone confusion. The exact time of expiry within that day
-- is not meaningful for this use case.

CREATE TABLE IF NOT EXISTS public.batches (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity_id     UUID    NOT NULL REFERENCES public.commodities(id),
  batch_number     TEXT    NOT NULL,
  quantity         INTEGER NOT NULL CHECK (quantity >= 0),
  delivery_date    DATE,
  expiration_date  DATE    NOT NULL,
  supplier         TEXT,
  notes            TEXT,
  created_by       UUID    NOT NULL REFERENCES public.profiles(id),
  updated_by       UUID    REFERENCES public.profiles(id),
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Batch number is unique within a commodity, not globally
  CONSTRAINT batches_commodity_batch_unique UNIQUE (commodity_id, batch_number)
);

-- Auto-update updated_at on any change to batches
CREATE OR REPLACE TRIGGER batches_set_updated_at
  BEFORE UPDATE ON public.batches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.batches IS
  'Individual delivery batches for a commodity. One commodity can have many batches.';
COMMENT ON COLUMN public.batches.quantity IS
  'Current quantity in stock. Must be >= 0 (enforced by CHECK constraint).';
COMMENT ON COLUMN public.batches.expiration_date IS
  'Date type (no time component). Calculated at query time for expiration status.';
COMMENT ON COLUMN public.batches.deleted_at IS
  'NULL = active batch. Set to NOW() to soft-delete. Hard deletes not permitted.';


-- ============================================================
-- SECTION 6: AUDIT LOGS TABLE
-- ============================================================
--
-- Append-only record of important system activity.
-- Answers: WHO did WHAT to WHICH record and WHEN?
--
-- WHY no updated_at or deleted_at?
-- Audit logs are never modified or deleted. If a log entry could be
-- changed, the audit trail is untrustworthy. This table is write-once.
--
-- WHY entity_id is UUID and nullable?
-- Some actions (LOGIN, LOGOUT) don't reference a specific record.
-- Others (CREATE_COMMODITY) reference a specific commodity ID.
-- Nullable allows both cases cleanly.

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.profiles(id),
  action       TEXT        NOT NULL,
  entity_type  TEXT,
  entity_id    UUID,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.audit_logs IS
  'Append-only activity history. Records are never updated or deleted.';
COMMENT ON COLUMN public.audit_logs.action IS
  'Action type. Must match AUDIT_ACTIONS constants in app.constants.js.';
COMMENT ON COLUMN public.audit_logs.entity_type IS
  'The type of record affected. Example: commodity, batch, profile. NULL for session events.';
COMMENT ON COLUMN public.audit_logs.entity_id IS
  'UUID of the affected record. NULL for events not tied to a specific record (e.g. LOGIN).';


-- ============================================================
-- SECTION 7: INDEXES
-- ============================================================
--
-- WHY: Indexes speed up queries on frequently filtered columns.
-- Without them, PostgreSQL scans every row in the table.
-- With them, it jumps directly to matching rows.
--
-- We only create indexes that are actually needed for V1 queries.
-- Over-indexing slows down INSERT/UPDATE operations.

-- commodities: filter active records (most common query)
CREATE INDEX IF NOT EXISTS idx_commodities_deleted_at
  ON public.commodities(deleted_at)
  WHERE deleted_at IS NULL;

-- commodities: search/lookup by code
CREATE INDEX IF NOT EXISTS idx_commodities_code
  ON public.commodities(commodity_code);

-- batches: join to commodity (FK lookup)
CREATE INDEX IF NOT EXISTS idx_batches_commodity_id
  ON public.batches(commodity_id);

-- batches: expiration monitoring queries
CREATE INDEX IF NOT EXISTS idx_batches_expiration_date
  ON public.batches(expiration_date);

-- batches: filter active batches
CREATE INDEX IF NOT EXISTS idx_batches_deleted_at
  ON public.batches(deleted_at)
  WHERE deleted_at IS NULL;

-- audit_logs: user's own activity
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
  ON public.audit_logs(user_id);

-- audit_logs: chronological display (most recent first)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON public.audit_logs(created_at DESC);
