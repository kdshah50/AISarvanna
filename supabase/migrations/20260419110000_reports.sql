-- Fraud / abuse reports: any user can flag a listing or seller.

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id TEXT NOT NULL,
  listing_id UUID REFERENCES public.listings (id) ON DELETE SET NULL,
  seller_id TEXT,
  reason TEXT NOT NULL CHECK (reason IN (
    'fraud', 'fake_listing', 'misleading', 'inappropriate', 'spam', 'other'
  )),
  details TEXT CHECK (details IS NULL OR char_length(details) <= 2000),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewed', 'action_taken', 'dismissed')),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reports_listing ON public.reports (listing_id);
CREATE INDEX IF NOT EXISTS idx_reports_seller ON public.reports (seller_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON public.reports (reporter_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reports publicly insertable"
  ON public.reports FOR INSERT WITH CHECK (true);

CREATE POLICY "Reports service role full access"
  ON public.reports FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE public.reports IS 'User-submitted fraud and abuse reports for listings and sellers.';
