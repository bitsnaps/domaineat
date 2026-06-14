# Domain Pricing Feature — Task Summary

## Overview

Implemented a multi-provider domain pricing comparison feature that lets users find registration prices across registrars, decide whether to buy, and choose the cheapest provider.

## Problem

Users had no way to compare domain registration prices across registrars. The only option was a single `preferred_registrar` URL redirect. For taken domains, there was no aftermarket pricing context.

## Solution

### Backend — Provider Adapter Pattern

Created a pluggable provider system with three registrar adapters:

| Provider | API | Key Feature |
|----------|-----|-------------|
| **Porkbun** | TLD pricing catalog | Full catalog, competitive prices |
| **Cloudflare** | Static + live API | At-cost pricing (cheapest for .com) |
| **GoDaddy** | Availability + TLD list | Largest registrar, already integrated |

All providers are queried in parallel. Results sorted by registration price (lowest first). TLD pricing catalogs cached 24h to minimize API calls.

### Frontend — PricingCard Component

- Shows availability status badge (Available/Taken/Unknown) — never hidden
- Price comparison table sorted low→high
- "Best Price" banner highlighting cheapest option
- "Register" buttons linking directly to each provider
- Integrated into Domain Lookup, Wishlist, and Settings

## Files Created

### Backend
- `api/pricing/providers.ts` — PricingProvider interface + types
- `api/pricing/cache.ts` — 24h in-memory TLD pricing cache
- `api/pricing/porkbun.ts` — Porkbun adapter
- `api/pricing/cloudflare.ts` — Cloudflare adapter
- `api/pricing/godaddy.ts` — GoDaddy adapter
- `api/pricing/index.ts` — Aggregator (parallel queries + sorting)

### Frontend
- `src/stores/pricing.ts` — Pinia store (fetchPricing, clearPricing)
- `src/components/PricingCard.vue` — Price comparison UI

### Tests
- `tests/api/pricing-routes.spec.ts` — 11 tests (API routes)
- `tests/unit/pricing-store.spec.ts` — 8 tests (Pinia store)
- `tests/unit/pricing-card.spec.ts` — 15 tests (Vue component)

### Config
- `.env.sample` — Added PORKBUN_API_KEY, PORKBUN_SECRET_KEY, CLOUDFLARE_API_KEY

## Files Modified

- `api/app.ts` — Added /api/pricing and /api/pricing/providers routes + PUBLIC_PATHS
- `src/types/index.ts` — Added DomainPricing, PricingResponse types
- `src/components/DomainLookupPanel.vue` — Auto-fetches pricing on validate, shows PricingCard
- `src/views/WishlistView.vue` — Added Price column with per-item "Get Price" button
- `src/views/SettingsView.vue` — Added Domain Pricing Providers status card

## API Routes

```
GET /api/pricing?domain=example.com       # Public — returns availability + sorted prices
GET /api/pricing/providers                # Public — returns provider configuration status
```

## Environment Variables

All three providers already configured in `.env`:
- `PORKBUN_API_KEY` + `PORKBUN_SECRET_KEY`
- `CLOUDFLARE_API_KEY`
- `GODADDY_API_KEY` + `GODADDY_SECRET_KEY` (existed before)

## Tests

**443 tests across 33 files — all pass, zero regressions.**

34 new tests added (11 API + 8 store + 15 component).

## Key Decisions

1. **TDD approach** — Tests written first for each component
2. **Provider adapter pattern** — Easy to add new registrars (just implement PricingProvider)
3. **24h cache** — TLD pricing catalogs change rarely, cache minimizes API calls
4. **Transparency** — Always show availability status, never hide taken/unknown states
5. **Public routes** — Pricing endpoints don't require auth (same as /validate, /search, /appraise)
6. **Static fallbacks** — Cloudflare has static TLD pricing even without live API access

## Plan Document

Full implementation plan: `plans/domain-pricing.md`

## TODOs / Future Work

- Aftermarket pricing integration (NameBio API for comparable sales)
- Price alerts when wishlisted domains drop below target
- Bulk pricing check for multiple domains
- Historical pricing tracking
- Transfer pricing for registrar switches
