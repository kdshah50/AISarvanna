# Internal: market strategy ↔ AISaravanna codebase

**Audience:** engineering and product working in this repo.  
**Not for:** external pitch decks without separating “shipped” vs “planned.”

The strategy deck (*AISarvanna Market Strategy*) describes a **two-lane** marketplace (Latino + South Asian) across **PA / NJ / MD / DE**, with trust, WhatsApp-native auth, services + goods, and phased revenue. This document maps that intent to **what exists in Git today** and what to build next.

## Naming

- **Product:** AISaravanna (see `.cursor/rules` / README).
- **GitHub folder name** may differ; env and Supabase must stay **AISaravanna-dedicated** (never Mexico marketplace Supabase).

## Strategy pillar → repo status

| Deck theme | In repo today (high level) | Gap / next build |
|------------|----------------------------|------------------|
| US-first, bilingual | EN default, ES via `?lang=` / toggle (`lib/i18n-lang`, header) | Hindi/Gujarati: extend i18n (deck mentions `next-intl`; repo uses custom `lang` — **pick one approach** and document) |
| Corridor (PA/NJ/MD/DE) | NJ counties (`lib/colonias`), US ZIP hints (`lib/us-zip`, geocode) | Full **US neighborhood picker**; browse/search coverage for MD/DE/PA as product requires |
| WhatsApp OTP | `send-otp` / `verify-otp`, Twilio, `tianguis_token` | Low gap for MVP narrative |
| Two “community lanes” | **Not first-class** (no lane on `users` / session) | **Lane selector** after auth or first open; persist `community_lane` (or similar); filter categories + copy |
| Goods marketplace | Listings, cart, Stripe Connect path, `MARKETPLACE_CONNECT_REQUIRED` | Align internal wording: “escrow” vs actual **checkout + Connect / platform** behavior |
| Services + providers | `/unete`, admin approval, services vertical, booking + commission (`ServiceBookingBlock`, `service_bookings`) | South Asian **taxonomy**; richer **provider profile** (portfolio, availability) per roadmap |
| Trust / verification | Admin PIN; listing `is_verified`; DL/EIN + legacy flags (`supabase/migrations/20260509130000_nj_provider_dl_ein.sql`); badges UI | **Stripe Identity** if automating; else **admin + DL upload** (`/api/upload-dl`) |
| In-app chat | `app/api/conversations`, inbox, listing threads | Push = separate epic |
| AI / ML | `ml-service/`, hybrid search when `OPENAI_API_KEY` + embeddings | Internal tickets: cite **env + deploy**; avoid “AI live everywhere” unless wired |
| listings-api FastAPI | Optional via `FASTAPI_*` | Mark **optional** on internal architecture slides |

## Deck Phase 1 (8–12 weeks) as internal epics

1. **Community lane** — model + onboarding + defaults (auth redirect, `users` column, home/search presets).
2. **Listing type** — deck suggests `goods | service`; today skews **category-driven**; either add column or document convention.
3. **South Asian vertical** — categories, seeds, admin, `/unete` service options.
4. **US geo UX** — multi-state city/ZIP consistent on `/unete`, browse, search.
5. **Trust** — run NJ DL/EIN migration on AISaravanna Supabase; keep manual verification until Stripe Identity is spec’d.
6. **Revenue** — internal **pricing spec**: `commission_pct`, bookings, cart fees vs deck subscriptions/boosts.

## Wording guardrails (internal tickets)

- **“Full escrow (all goods)”** — map to real Stripe flows (Connect, platform-only, disputes) in a short payments spec.
- **“AI fraud / price everywhere”** — require ml-service route + flag + env per feature.
- **“Hindi/Gujarati live”** — dedicated epic; not implied by current EN/ES.

## Maintenance

When the deck changes, update this file and verify against `README.md`, `app/` routes, and `supabase/migrations/`.

---

*Internal only — not a substitute for investor-facing materials.*
