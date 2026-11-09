-- ============================================================
-- NutriVision — Database Migration 13
-- Upgrade: Defects & Returns Module (LGU Turnover & In-House Spoilage)
--
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Update action_taken check constraint to accept 'Returned' and 'Spoiled'
ALTER TABLE public.defect_incidents 
  DROP CONSTRAINT IF EXISTS defect_incidents_action_taken_check;

ALTER TABLE public.defect_incidents 
  ADD CONSTRAINT defect_incidents_action_taken_check 
  CHECK (action_taken IN ('Quarantined', 'Disposed', 'Returned', 'Spoiled'));

-- 2. Add index for faster filtering by action_taken if missing
CREATE INDEX IF NOT EXISTS idx_defect_incidents_action_taken 
  ON public.defect_incidents(action_taken);

-- 3. Document comments
COMMENT ON TABLE public.defect_incidents IS 'Logs of damaged, returned to LGU/Supplier, or in-house spoiled commodities';
COMMENT ON COLUMN public.defect_incidents.action_taken IS 'Action: Returned (to LGU/Supplier), Spoiled (in-house Nutribun/kitchen waste), Quarantined (legacy hold), Disposed (legacy disposal)';
