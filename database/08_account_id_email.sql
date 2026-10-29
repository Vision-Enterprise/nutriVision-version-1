-- ============================================================
-- NutriVision — Instant Account ID / Email Update & Migration
-- Paste and run this in: Supabase Dashboard → SQL Editor → New query
--
-- What this does:
-- 1. Creates public.update_own_email(new_email) so Account Settings
--    can instantly change a user's login ID/email in auth.users.
-- 2. Automatically migrates existing accounts in auth.users to
--    YYYY0001@mnao.ph, YYYY0002@mnao.ph, etc. (ordered by signup date).
-- ============================================================

-- 1. Function to allow logged-in user to change their own email/ID instantly
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

-- 2. Auto-convert all existing users to YYYY0001@mnao.ph, YYYY0002@mnao.ph, etc.
WITH numbered_users AS (
  SELECT
    p.id,
    EXTRACT(YEAR FROM COALESCE(p.created_at, NOW()))::INT::TEXT
      || LPAD(ROW_NUMBER() OVER (ORDER BY p.created_at ASC, p.id ASC)::TEXT, 4, '0')
      || '@mnao.ph' AS new_mnao_email
  FROM public.profiles p
)
UPDATE auth.users u
SET
  email = n.new_mnao_email,
  email_change = '',
  email_change_token_new = '',
  email_confirmed_at = COALESCE(u.email_confirmed_at, NOW()),
  updated_at = NOW()
FROM numbered_users n
WHERE u.id = n.id;
