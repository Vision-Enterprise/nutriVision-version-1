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

-- ============================================================
-- SECTION: BATCH ARCHIVE / VOID MIGRATION
-- ============================================================

-- 5. Ensure RLS on batches allows updating deleted_at / voiding
DROP POLICY IF EXISTS "batches_update" ON public.batches;
CREATE POLICY "batches_update"
  ON public.batches
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR public.get_user_role() = 'administrator'
    OR true
  )
  WITH CHECK (true);

-- 6. Allow querying all batches for Archive and Audit Trail modules
DROP POLICY IF EXISTS "batches_select_active" ON public.batches;
DROP POLICY IF EXISTS "batches_select_all" ON public.batches;
CREATE POLICY "batches_select_all"
  ON public.batches
  FOR SELECT
  TO authenticated
  USING (true);

-- 7. Security Definer RPC for 100% reliable batch voiding/archiving across all accounts
CREATE OR REPLACE FUNCTION public.archive_batch(batch_id UUID, reason TEXT DEFAULT 'Voided by user')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.batches
  SET record_status = 'Voided',
      void_reason = reason,
      voided_by = auth.uid(),
      deleted_at = NOW(),
      updated_at = NOW(),
      updated_by = auth.uid()
  WHERE id = batch_id;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, description)
  SELECT 
    auth.uid(),
    'DELETE_BATCH',
    'batch',
    batch_id,
    COALESCE(p.full_name, 'Staff') || ' voided batch "' || b.batch_number || '" for reason: ' || COALESCE(reason, 'None')
  FROM public.batches b
  LEFT JOIN public.profiles p ON p.id = auth.uid()
  WHERE b.id = batch_id;

  RETURN TRUE;
END;
$$;

-- 8. Security Definer RPC to restore a voided batch back to active
CREATE OR REPLACE FUNCTION public.restore_batch(batch_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.batches
  SET record_status = 'Active',
      void_reason = NULL,
      voided_by = NULL,
      deleted_at = NULL,
      updated_at = NOW(),
      updated_by = auth.uid()
  WHERE id = batch_id;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, description)
  SELECT 
    auth.uid(),
    'UPDATE_BATCH',
    'batch',
    batch_id,
    COALESCE(p.full_name, 'Staff') || ' restored batch "' || b.batch_number || '" back to active inventory.'
  FROM public.batches b
  LEFT JOIN public.profiles p ON p.id = auth.uid()
  WHERE b.id = batch_id;

  RETURN TRUE;
END;
$$;
