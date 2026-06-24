# Rides Phase 1.5 (no dispatch)

Menu + quote + deposit + seller lifecycle + balance/tip — **not** Uber-style live dispatch.

## What shipped

| Item | Location |
|------|----------|
| NJ starter menu (EWR, JFK, LGA, Edison–NB, hospital) | `lib/listing-service-menu.ts` → `taxiRideShareStarterMenu()` |
| 8 verified demo drivers (Middlesex) | `supabase/seed-middlesex-taxi-drivers.sql` |
| Driver landing + community marketing | `/ride-share` |

## Seed demo drivers

1. Supabase SQL Editor → run `supabase/seed-middlesex-taxi-drivers.sql`
2. Browse: `/?category=services&q=Transporte%20%2F%20Taxi&colonia=middlesex`
3. Demo seller phones: `15555550201`–`15555550208` (public.users only)

## E2E checklist (Stripe test mode)

**Accounts:** buyer + seller (two phones). Seller needs Stripe Connect onboarded for balance payout.

### 1. Discovery

- [ ] Open seeded listing (e.g. Edison Express Car)
- [ ] Menu shows NJ routes in USD
- [ ] Share listing link works (community-group flow)

### 2. Quote → deposit

- [ ] Buyer opens chat, selects menu items (e.g. EWR airport)
- [ ] Seller sends quote from menu builder
- [ ] Buyer accepts quote (quote-gated vertical)
- [ ] Buyer pays deposit — card `4242 4242 4242 4242`
- [ ] Webhook: `stripe listen --forward-to localhost:3006/api/webhooks/stripe`

### 3. Seller lifecycle (`/seller-bookings`)

- [ ] Booking appears as paid
- [ ] Mark **scheduled** (optional appointment datetime)
- [ ] Mark **in progress**
- [ ] Mark **completed**

### 4. Balance + tip

- [ ] Buyer sees balance/tip block on listing after completion (`transporte_app` supports supplement payments)
- [ ] Buyer pays remaining balance
- [ ] Seller receives payout via Connect

### 5. Regression

- [ ] `/ride-share` — no `/viaje` link; Middlesex copy; lang toggle stays on `/ride-share`
- [ ] `npx tsc --noEmit` clean

## Not in Phase 1.5

- Live map dispatch (`/viaje`, `lib/rides/*`) — Phase 2
- Instant “nearest driver” matching

## Marketing angle

Drivers share **listing URL** in WhatsApp / Facebook community groups. Riders book from that page — not “download our app like Uber.”
