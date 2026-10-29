-- ============================================================
-- NutriVision — Instant Account ID / Email Update RPC
-- Run in Supabase SQL Editor so users can directly update their
-- auth.users email (e.g. to 20260001@mnao.ph) without email confirmation links.
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_own_email(new_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  cleaned TEXT;
BEGIN
  cleaned := LOWER(TRIM(new_email));
  IF cleaned IS NULL OR cleaned = '' THEN
    RAISE EXCEPTION 'Email cannot be empty';
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
