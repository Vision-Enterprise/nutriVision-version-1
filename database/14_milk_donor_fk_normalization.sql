-- ============================================================================
-- Migration 14: 3NF Foreign Key Normalization for Milk Donations -> Donor Logs
-- Safe, non-breaking additive migration:
--   1. Adds nullable FK donor_log_id on public.milk_donations -> public.milk_donor_logs(id)
--   2. Backfills existing rows matching donor_code
--   3. Auto-links donor_log_id via trigger on INSERT/UPDATE (requires zero JS changes)
-- ============================================================================

ALTER TABLE public.milk_donations
  ADD COLUMN IF NOT EXISTS donor_log_id UUID REFERENCES public.milk_donor_logs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_milk_donations_donor_log_id
  ON public.milk_donations (donor_log_id);

-- Backfill existing milk_donations rows that match a milk_donor_logs.donor_code
UPDATE public.milk_donations d
SET donor_log_id = (
  SELECT l.id
  FROM public.milk_donor_logs l
  WHERE LOWER(TRIM(l.donor_code)) = LOWER(TRIM(d.donor_code))
  ORDER BY l.created_at DESC
  LIMIT 1
)
WHERE d.donor_log_id IS NULL
  AND d.donor_code IS NOT NULL;

-- Trigger function to auto-populate donor_log_id without modifying frontend code
CREATE OR REPLACE FUNCTION public.sync_milk_donation_donor_log_fk()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.donor_log_id IS NULL AND NEW.donor_code IS NOT NULL THEN
    SELECT l.id INTO NEW.donor_log_id
    FROM public.milk_donor_logs l
    WHERE LOWER(TRIM(l.donor_code)) = LOWER(TRIM(NEW.donor_code))
    ORDER BY l.created_at DESC
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_milk_donations_sync_donor_log_fk ON public.milk_donations;

CREATE TRIGGER trg_milk_donations_sync_donor_log_fk
  BEFORE INSERT OR UPDATE ON public.milk_donations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_milk_donation_donor_log_fk();
