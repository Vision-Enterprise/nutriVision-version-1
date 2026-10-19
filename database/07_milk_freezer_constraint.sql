-- ============================================================
-- Migration 07: Dynamic Multi-Freezer & Shelf Support
-- ============================================================
-- Removes the hardcoded check constraint on freezer_shelf so that
-- dynamic multi-freezers (e.g. 'Upright Freezer A / Shelf 1', 'Freezer B / Shelf 2')
-- and custom shelf names can be saved without violating PostgreSQL checks.

ALTER TABLE public.milk_batches 
  DROP CONSTRAINT IF EXISTS milk_batches_freezer_shelf_check;

-- Removes the check constraint on indication in milk_dispatches
-- so any clinical or standard indication can be recorded without check violations.
ALTER TABLE public.milk_dispatches 
  DROP CONSTRAINT IF EXISTS milk_dispatches_indication_check;
