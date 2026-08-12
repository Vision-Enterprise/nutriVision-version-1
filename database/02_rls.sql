-- ============================================================
-- NutriVision — Row Level Security Policies
-- Phase 1: Database Foundation
--
-- Run this AFTER 01_schema.sql
-- Run in: Supabase Dashboard → SQL Editor → New query
--
-- WHY Row Level Security (RLS)?
-- RLS moves authorization INTO the database.
-- Without RLS, any authenticated user with the anon key can read/write
-- ANY row in ANY table — even data that belongs to other users.
--
-- With RLS enabled on a table:
-- - All access is DENIED by default
-- - Only rows that pass the policy condition are accessible
-- - Policies use auth.uid() to identify the current user
-- - This runs at the database level — cannot be bypassed by frontend code
--
-- IMPORTANT: Enabling RLS without creating policies = table is completely
-- inaccessible to all users. Always create policies after enabling RLS.
-- ============================================================


-- ============================================================
-- PROFILES — RLS
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: Any authenticated user can read all profiles.
--
-- WHY allow all authenticated users to see all profiles?
-- The audit log displays the name of whoever performed an action.
-- Commodity records show who created them.
-- These lookups require reading other users' profiles.
-- Profile data here is not sensitive (no passwords, no private data).
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- UPDATE: Users can update their own profile.
--         Administrators can update any profile.
--
-- WHY use get_user_role() instead of a direct subquery?
-- Querying profiles inside a policy ON profiles causes infinite recursion.
-- get_user_role() uses SECURITY DEFINER to bypass RLS and break the loop.
--
-- WITH CHECK mirrors USING to validate the new row values too.
CREATE POLICY "profiles_update"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR public.get_user_role() = 'administrator'
  )
  WITH CHECK (
    auth.uid() = id
    OR public.get_user_role() = 'administrator'
  );

-- INSERT: No policy for authenticated users.
-- Profiles are created only by the handle_new_user() trigger,
-- which runs as SECURITY DEFINER (postgres role, bypasses RLS).
-- In Phase 7, the admin Edge Function uses the service role key
-- which also bypasses RLS. Normal users cannot insert profiles directly.

-- DELETE: No policy.
-- Profiles are never hard-deleted. Deactivation is done via is_active = FALSE.


-- ============================================================
-- COMMODITIES — RLS
-- ============================================================

ALTER TABLE public.commodities ENABLE ROW LEVEL SECURITY;

-- SELECT: Any authenticated user can view active commodities.
-- Active = deleted_at IS NULL.
-- Soft-deleted commodities are invisible to all users.
CREATE POLICY "commodities_select_active"
  ON public.commodities
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- INSERT: Any authenticated user can add a new commodity.
-- The created_by column must match the inserting user.
-- This prevents a user from creating a commodity attributed to someone else.
CREATE POLICY "commodities_insert"
  ON public.commodities
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- UPDATE: The creator can update their own commodity.
--         Administrators can update any commodity.
-- Used for both editing fields AND soft-deleting (setting deleted_at).
CREATE POLICY "commodities_update"
  ON public.commodities
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR public.get_user_role() = 'administrator'
  )
  WITH CHECK (
    auth.uid() = created_by
    OR public.get_user_role() = 'administrator'
  );

-- DELETE: No policy.
-- Hard deletes are not permitted. Use soft delete (set deleted_at via UPDATE).


-- ============================================================
-- BATCHES — RLS
-- ============================================================

ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

-- SELECT: Any authenticated user can view active batches.
CREATE POLICY "batches_select_active"
  ON public.batches
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- INSERT: Any authenticated user can add a batch.
-- created_by must match the inserting user.
CREATE POLICY "batches_insert"
  ON public.batches
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- UPDATE: Creator or administrator.
CREATE POLICY "batches_update"
  ON public.batches
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR public.get_user_role() = 'administrator'
  )
  WITH CHECK (
    auth.uid() = created_by
    OR public.get_user_role() = 'administrator'
  );

-- DELETE: No policy. Soft delete only.


-- ============================================================
-- AUDIT LOGS — RLS
-- ============================================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: Administrators see all logs.
--         Nutrition personnel see only their own.
--
-- WHY restrict personnel to their own logs?
-- System-wide audit history is an admin-only feature.
-- Personnel should only see their own actions (for account transparency).
CREATE POLICY "audit_logs_select"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.get_user_role() = 'administrator'
  );

-- INSERT: Any authenticated user can insert a log entry.
-- The user_id must match the inserting user —
-- prevents inserting logs attributed to someone else.
CREATE POLICY "audit_logs_insert"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: No policy. Audit logs are append-only and immutable.
-- DELETE: No policy. Audit logs are never deleted.
