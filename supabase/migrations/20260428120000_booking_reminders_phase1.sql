-- Phase 1: rebook cadence + optional appointment reminder + WhatsApp + optional email.

ALTER TABLE public.booking_reminders
  ADD COLUMN IF NOT EXISTS reminder_kind TEXT NOT NULL DEFAULT 'rebook',
  ADD COLUMN IF NOT EXISTS offset_days INT,
  ADD COLUMN IF NOT EXISTS notify_whatsapp BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_email TEXT,
  ADD COLUMN IF NOT EXISTS appointment_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS remind_before_hours INT,
  ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 0;

ALTER TABLE public.booking_reminders DROP CONSTRAINT IF EXISTS booking_reminders_reminder_kind_check;
ALTER TABLE public.booking_reminders
  ADD CONSTRAINT booking_reminders_reminder_kind_check
  CHECK (reminder_kind IN ('rebook', 'appointment'));

COMMENT ON COLUMN public.booking_reminders.reminder_kind IS 'rebook: remind after offset_days from schedule time; appointment: remind remind_before_hours before appointment_at.';
COMMENT ON COLUMN public.booking_reminders.offset_days IS 'For rebook: days after user scheduled the reminder.';
COMMENT ON COLUMN public.booking_reminders.delivery_email IS 'Optional copy when notify_email is true (users may be phone-only).';

-- Legacy rows that used channel = email
UPDATE public.booking_reminders
SET notify_whatsapp = false, notify_email = true
WHERE channel = 'email';

ALTER TABLE public.booking_reminders DROP CONSTRAINT IF EXISTS booking_reminders_status_check;
ALTER TABLE public.booking_reminders
  ADD CONSTRAINT booking_reminders_status_check
  CHECK (status IN ('pending', 'sent', 'dismissed', 'failed'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_reminders_one_pending_per_kind
  ON public.booking_reminders (booking_id, buyer_id, reminder_kind)
  WHERE status = 'pending';
