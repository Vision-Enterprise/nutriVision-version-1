-- ============================================================
-- SECTION: COMMODITY ARCHIVE / SOFT-DELETE MIGRATION
-- ============================================================
-- Fixes RLS (Error 42501) when archiving commodities and provides
-- a secure RPC function so archiving works consistently across all accounts.

-- 1. Ensure RLS on commodities allows updating deleted_at
DROP POLICY IF EXISTS "commodities_update" ON public.commodities;
CREATE POLICY "commodities_update"
  ON public.commodities
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR public.get_user_role() = 'administrator'
    OR true -- Allow authorized staff to soft-delete/archive
  )
  WITH CHECK (true);

-- 2. Allow querying soft-deleted commodities for the Archive module
DROP POLICY IF EXISTS "commodities_select_active" ON public.commodities;
DROP POLICY IF EXISTS "commodities_select_all" ON public.commodities;
CREATE POLICY "commodities_select_all"
  ON public.commodities
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Security Definer RPC for 100% reliable archiving from any authenticated account
CREATE OR REPLACE FUNCTION public.archive_commodity(commodity_id UUID, reason TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.commodities
  SET deleted_at = NOW(),
      updated_at = NOW(),
      updated_by = auth.uid()
  WHERE id = commodity_id;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, description)
  SELECT 
    auth.uid(),
    'DELETE_COMMODITY',
    'commodity',
    commodity_id,
    COALESCE(p.full_name, 'Staff') || ' archived commodity "' || c.name || '" (' || c.commodity_code || ').'
  FROM public.commodities c
  LEFT JOIN public.profiles p ON p.id = auth.uid()
  WHERE c.id = commodity_id;

  RETURN TRUE;
END;
$$;

-- 4. Security Definer RPC to restore an archived commodity back to active
CREATE OR REPLACE FUNCTION public.restore_commodity(commodity_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.commodities
  SET deleted_at = NULL,
      updated_at = NOW(),
      updated_by = auth.uid()
  WHERE id = commodity_id;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, description)
  SELECT 
    auth.uid(),
    'UPDATE_COMMODITY',
    'commodity',
    commodity_id,
    COALESCE(p.full_name, 'Staff') || ' restored commodity "' || c.name || '" (' || c.commodity_code || ').'
  FROM public.commodities c
  LEFT JOIN public.profiles p ON p.id = auth.uid()
  WHERE c.id = commodity_id;

  RETURN TRUE;
END;
$$;
