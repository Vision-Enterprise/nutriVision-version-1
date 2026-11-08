-- ============================================================
-- NutriVision — Phase 11: Security Hardening & Profile Upgrade
--
-- Paste and run this in: Supabase Dashboard → SQL Editor → New query
-- Safe to run multiple times (idempotent).
--
-- What this migration does:
--   1. Adds first_name, last_name, and avatar_url columns to public.profiles
--      and backfills first_name / last_name from existing full_name values.
--   2. Upgrades public.handle_new_user() trigger to populate first_name,
--      last_name, and avatar_url when new staff accounts are created.
--   3. Adds public.is_active_user() SECURITY DEFINER helper function.
--   4. Adds BEFORE UPDATE trigger trg_protect_profile_privilege on
--      public.profiles so non-administrators cannot escalate their own
--      role or alter their own is_active status via client API calls,
--      and deactivated accounts cannot mutate their profile.
--   5. Hardens public.update_own_email(new_email) to enforce active
--      account status and valid email syntax.
-- ============================================================

-- 1. Profile Schema Upgrade (First Name, Last Name, Profile Photo)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name  TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Backfill first_name and last_name from full_name for existing rows
UPDATE public.profiles
SET
  first_name = SPLIT_PART(TRIM(full_name), ' ', 1),
  last_name  = NULLIF(
                 TRIM(
                   SUBSTRING(
                     TRIM(full_name)
                     FROM LENGTH(SPLIT_PART(TRIM(full_name), ' ', 1)) + 1
                   )
                 ),
                 ''
               )
WHERE first_name IS NULL AND full_name IS NOT NULL;

-- 2. Upgrade Signup Profile Provisioning Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_first TEXT;
  v_last  TEXT;
  v_full  TEXT;
BEGIN
  v_first := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'first_name', '')), '');
  v_last  := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'last_name', '')), '');
  v_full  := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '');

  IF v_full IS NULL THEN
    v_full := COALESCE(NULLIF(TRIM(CONCAT_WS(' ', v_first, v_last)), ''), 'Unknown');
  END IF;

  IF v_first IS NULL THEN
    v_first := SPLIT_PART(v_full, ' ', 1);
  END IF;

  IF v_last IS NULL THEN
    v_last := NULLIF(TRIM(SUBSTRING(v_full FROM LENGTH(v_first) + 1)), '');
  END IF;

  INSERT INTO public.profiles (id, full_name, first_name, last_name, avatar_url, role)
  VALUES (
    NEW.id,
    v_full,
    v_first,
    v_last,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')), ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'nutrition_personnel')
  );

  RETURN NEW;
END;
$$;

-- 3. Active Account Helper Function
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = TRUE
  );
END;
$$;

-- 4. Privilege Escalation & Deactivated-Account Tamper Guard on profiles
CREATE OR REPLACE FUNCTION public.protect_profile_privilege()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Allow superuser / SQL Editor / internal service operations where auth.uid() is NULL
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  caller_role := public.get_user_role();

  -- Deactivated accounts cannot modify profile records unless acted upon by an administrator
  IF OLD.is_active = FALSE AND caller_role IS DISTINCT FROM 'administrator' THEN
    RAISE EXCEPTION 'Account is deactivated. Profile modifications are not permitted.';
  END IF;

  -- Non-administrators can never change role or is_active columns
  IF caller_role IS DISTINCT FROM 'administrator' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Unauthorized: Only administrators can modify system roles.';
    END IF;
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'Unauthorized: Only administrators can modify account activation status.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_privilege ON public.profiles;
CREATE TRIGGER trg_protect_profile_privilege
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privilege();

-- 5. Harden Instant Email / Account ID RPC
CREATE OR REPLACE FUNCTION public.update_own_email(new_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  cleaned TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Unauthorized: Active authenticated session required.';
  END IF;

  cleaned := LOWER(TRIM(COALESCE(new_email, '')));
  IF cleaned = '' OR cleaned !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'Invalid email or Account ID format.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE LOWER(email) = cleaned
      AND id <> auth.uid()
  ) THEN
    RAISE EXCEPTION 'This Account ID / email is already in use by another account.';
  END IF;

  UPDATE auth.users
  SET
    email = cleaned,
    email_change = '',
    email_change_token_new = '',
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    updated_at = NOW()
  WHERE id = auth.uid();
END;
$$;
