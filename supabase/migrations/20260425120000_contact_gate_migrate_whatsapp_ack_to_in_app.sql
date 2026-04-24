-- Backfill: promote legacy whatsapp_ack rows to contacted_in_app = true.
-- If listing_service_contact_gate does not exist yet, this is a no-op (e.g. remote
-- DB never applied 20260416100000_service_booking_contact_gate.sql). Apply that
-- migration (or the full history) so the table exists, then re-run or patch data manually.

DO $m$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'listing_service_contact_gate'
  ) THEN
    UPDATE public.listing_service_contact_gate
    SET
      contacted_in_app = true,
      updated_at = now()
    WHERE whatsapp_ack_at IS NOT NULL
      AND (contacted_in_app IS NOT TRUE);

    COMMENT ON COLUMN public.listing_service_contact_gate.whatsapp_ack_at IS
      'Deprecated: no longer written by the app. Contact gate uses contacted_in_app and listing_messages.';
  END IF;
END
$m$;
