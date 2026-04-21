-- Booking reminders: scheduled notifications to bring buyers back to the platform.
-- A cron job or edge function checks this table and sends reminders.

CREATE TABLE IF NOT EXISTS public.booking_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.service_bookings (id) ON DELETE CASCADE,
  buyer_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  listing_id UUID NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,

  remind_at TIMESTAMPTZ NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email', 'push')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'dismissed')),

  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_reminders_pending ON public.booking_reminders (status, remind_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_booking_reminders_buyer ON public.booking_reminders (buyer_id);
