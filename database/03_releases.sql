-- ============================================================
-- SECTION 1: RELEASES TABLE
-- ============================================================
-- Tracks every distribution/release of commodities to barangays.
-- Serves as the stock-out ledger.

CREATE TABLE IF NOT EXISTS public.releases (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id         UUID        NOT NULL REFERENCES public.batches(id),
  quantity         INTEGER     NOT NULL CHECK (quantity > 0),
  barangay         TEXT        NOT NULL,
  released_by      UUID        NOT NULL REFERENCES public.profiles(id),
  released_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes            TEXT
);

-- Index for querying releases by batch or barangay
CREATE INDEX IF NOT EXISTS idx_releases_batch_id ON public.releases(batch_id);
CREATE INDEX IF NOT EXISTS idx_releases_barangay ON public.releases(barangay);
CREATE INDEX IF NOT EXISTS idx_releases_released_at ON public.releases(released_at DESC);

COMMENT ON TABLE public.releases IS
  'Ledger for all commodity distributions/stock-outs.';
COMMENT ON COLUMN public.releases.quantity IS
  'Amount of commodity released. Must be > 0. This amount is subtracted from batches.quantity.';
COMMENT ON COLUMN public.releases.barangay IS
  'The destination barangay in Manolo Fortich where the commodity was distributed.';

-- ============================================================
-- SECTION 2: ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
DROP POLICY IF EXISTS "Admins have full access to releases" ON public.releases;
CREATE POLICY "Admins have full access to releases"
  ON public.releases
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'administrator'
    )
  );

-- Regular personnel can view and insert releases
DROP POLICY IF EXISTS "Personnel can read releases" ON public.releases;
CREATE POLICY "Personnel can read releases"
  ON public.releases
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'nutrition_personnel'
    )
  );

DROP POLICY IF EXISTS "Personnel can insert releases" ON public.releases;
CREATE POLICY "Personnel can insert releases"
  ON public.releases
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'nutrition_personnel'
    )
  );
