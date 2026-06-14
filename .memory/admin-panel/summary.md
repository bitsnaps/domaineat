# Admin Panel — Implementation Summary

**Date:** 2026-06-13 (updated 2026-06-14)
**Status:** ✅ Complete

---

## Problem

Domaineat needed a full admin panel for managing users, plans/pricing, and platform statistics. The admin should be accessible only to the first registered user (`role: admin`), mounted at `/admin` with a sidebar menu item visible only to admins.

## Design Decisions (Approved by user)

| Decision | Choice |
|----------|--------|
| Admin identification | `role` column (`user`/`admin`) in `users` table; first user auto-assigned admin |
| Plans storage | DB table (`plans`) — fully editable by admin |
| Page structure | Nested routes: `/admin/users`, `/admin/users/:id`, `/admin/plans`, `/admin/stats`, `/admin/domains` |
| User deletion | Both options: cascade delete (user + all data) and user-only delete (keep orphaned records) |

## Architecture

- **Admin identification:** `role` column added to `users` table; `signJwt()` includes `role` claim; auth middleware sets `c.set('role', payload.role)`
- **Plans storage:** New `plans` table with DB-backed tier limits, replacing hardcoded `TIER_LIMITS`
- **Plan cache:** In-memory TTL cache (`api/plan-cache.ts`) with 5-min expiry, fallback to hardcoded `TIER_LIMITS` on DB failure
- **Admin routes:** All `/api/admin/*` behind `adminGuard` middleware that checks `role === 'admin'`
- **Frontend:** Nested routes under `/admin` with `AdminLayout.vue` (tab navigation), guarded by `requiresAdmin` meta + `beforeEach` nav guard

---

## Files Created

| File | Purpose |
|------|---------|
| `api/migrations/20260613000001-add-role-to-users.js` | Adds `role` column to users table, sets first user as admin |
| `api/migrations/20260613000002-create-plans.js` | Creates plans table with seeded Free/Premium/Enterprise tiers |
| `api/models/Plan.ts` | Plan Sequelize model with `toLimits()` helper |
| `api/plan-cache.ts` | In-memory TTL cache for DB-backed tier limits |
| `src/stores/admin.ts` | Pinia store for admin users, plans, domains, stats |
| `src/layouts/AdminLayout.vue` | Tab-based admin layout (Users | Plans | Stats | Domains) |
| `src/views/admin/AdminUsersView.vue` | User table with search, edit, delete (cascade option) |
| `src/views/admin/AdminUserDetailView.vue` | Full user profile with edit and reset usage |
| `src/views/admin/AdminPlansView.vue` | Plan cards with inline editing |
| `src/views/admin/AdminStatsView.vue` | Platform stats dashboard (users, domains, tier distribution) |
| `src/views/admin/AdminDomainsView.vue` | All domains across users with search |
| `tests/api/admin-routes.spec.ts` | 18 TDD tests for admin API routes |
| `tests/api/plan-cache.spec.ts` | 7 TDD tests for plan cache |

## Files Modified

| File | Changes |
|------|---------|
| `api/models/User.ts` | Added `role` field declaration + model init |
| `api/models/index.ts` | Registered Plan model, added to exports |
| `api/auth.ts` | Added `role` to `signJwt()` and `verifyJwt()` return types; kept `TIER_LIMITS` as fallback |
| `api/app.ts` | Added `role` to Variables type, auth middleware sets role, register assigns admin to first user, login returns role, added admin routes (guard + 11 endpoints including POST delete), replaced all `TIER_LIMITS` with `getPlanLimits()` |
| `api/rate-limit.ts` | Replaced `TIER_LIMITS` with `getPlanLimits()` from plan cache |
| `src/stores/auth.ts` | Added `isAdmin` computed property |
| `src/types/index.ts` | Added `UserRole` type, added `role` to `User` interface |
| `src/router/index.ts` | Added admin lazy imports, nested `/admin/*` routes with `requiresAdmin`, guard checks admin role |
| `src/components/Sidebar.vue` | Added admin menu item with `v-if="auth.isAdmin"` |
| `tests/api/auth-middleware.spec.ts` | Added `User.count` mock for registration endpoint |
| `tests/unit/router-module.spec.ts` | Updated route count from 12 to 17 |

---

## API Endpoints

| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/stats` | GET | Platform stats (total users, domains, tier distribution) |
| `/api/admin/users` | GET | List all users |
| `/api/admin/users/:id` | GET | Get user details (no password_hash) |
| `/api/admin/users/:id` | PATCH | Update user (tier, role, email) — prevents self-demotion |
| `/api/admin/users/:id` | DELETE | Delete user (`?cascade=true` for full cascade) |
| `/api/admin/users/:id/delete` | POST | Delete user with `{ cascade: boolean }` body |
| `/api/admin/users/:id/reset-usage` | POST | Reset daily_ai_calls and daily_rdap_calls |
| `/api/admin/plans` | GET | List all plans |
| `/api/admin/plans/:tier` | PUT | Update plan limits/pricing/features (invalidates cache) |
| `/api/admin/domains` | GET | List all domains across users |

---

## Test Results

- **Total tests:** 454 (up from 394)
- **Test files:** 34 (up from 29)
- **Passing:** 453/454 (1 pre-existing timeout on external RDAP API)
- **New test coverage:** Plan cache (7 tests), admin delete endpoint (3 tests), cache invalidation (1 test)

---

## Key Implementation Details

### Plan Cache (`api/plan-cache.ts`)
- In-memory `Map<string, PlanLimits>` with 5-minute TTL
- `getPlanLimits(tier)` — loads from DB on cache miss, falls back to hardcoded `TIER_LIMITS` on DB failure
- `invalidatePlanCache()` — called when admin updates a plan via PUT endpoint
- `-1` values from DB are converted to `Infinity` for unlimited limits

### Replaced Hardcoded Limits
All 6 locations using `TIER_LIMITS` in `api/app.ts` and `api/rate-limit.ts` now use `await getPlanLimits(tier)`:
1. POST `/api/domains` — domain limit check
2. POST `/api/watchlist` — watchlist limit check
3. POST `/api/wishlist` — wishlist limit check
4. GET `/api/users/:id/ai-status` — AI daily limit display
5. POST `/api/ai/draft-outreach` — AI daily limit enforcement
6. RDAP rate limiter — RDAP daily limit check
