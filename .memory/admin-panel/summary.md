# Admin Panel — Implementation Summary

**Date:** 2026-06-13
**Status:** Complete (Phase 6 — replace hardcoded `TIER_LIMITS` with DB-backed `Plan.getLimits()` — deferred)

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
- **Plans storage:** New `plans` table replaces hardcoded `TIER_LIMITS` (deferred migration of existing code)
- **Admin routes:** All `/api/admin/*` behind `adminGuard` middleware that checks `role === 'admin'`
- **Frontend:** Nested routes under `/admin` with `AdminLayout.vue` (tab navigation), guarded by `requiresAdmin` meta + `beforeEach` nav guard

---

## Files Created

| File | Purpose |
|------|---------|
| `api/migrations/20260613000001-add-role-to-users.js` | Adds `role` column to users table, sets first user as admin |
| `api/migrations/20260613000002-create-plans.js` | Creates plans table with seeded Free/Premium/Enterprise tiers |
| `api/models/Plan.ts` | Plan Sequelize model with `toLimits()` helper |
| `src/stores/admin.ts` | Pinia store for admin users, plans, domains, stats |
| `src/layouts/AdminLayout.vue` | Tab-based admin layout (Users | Plans | Stats | Domains) |
| `src/views/admin/AdminUsersView.vue` | User table with search, edit, delete (cascade option) |
| `src/views/admin/AdminUserDetailView.vue` | Full user profile with edit and reset usage |
| `src/views/admin/AdminPlansView.vue` | Plan cards with inline editing |
| `src/views/admin/AdminStatsView.vue` | Platform stats dashboard (users, domains, tier distribution) |
| `src/views/admin/AdminDomainsView.vue` | All domains across users with search |
| `tests/api/admin-routes.spec.ts` | 15 TDD tests for admin API routes |

## Files Modified

| File | Changes |
|------|---------|
| `api/models/User.ts` | Added `role` field declaration + model init |
| `api/models/index.ts` | Registered Plan model, added to exports |
| `api/auth.ts` | Added `role` to `signJwt()` and `verifyJwt()` return types |
| `api/app.ts` | Added `role` to Variables type, auth middleware sets role, register assigns admin to first user, login returns role, added admin routes (guard + 10 endpoints) |
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
| `/api/admin/users/:id/reset-usage` | POST | Reset daily_ai_calls and daily_rdap_calls |
| `/api/admin/plans` | GET | List all plans |
| `/api/admin/plans/:tier` | PUT | Update plan limits/pricing/features |
| `/api/admin/domains` | GET | List all domains across users |

---

## Test Results

- **Total tests:** 409 (up from 394)
- **Test files:** 30 (up from 29)
- **All passing:** ✅

---

## TODO / Remaining Work

1. **Replace hardcoded `TIER_LIMITS`** — Migrate existing `TIER_LIMITS` references in `api/app.ts` (domains, watchlist, wishlist, AI) to use `Plan.getLimits(tier)` from DB. Cache in memory with TTL to avoid DB hits on every request.
2. **Admin delete endpoint** — Currently uses `?cascade=true` query param. Could add a dedicated `POST /api/admin/users/:id/delete` with body `{ cascade: boolean }` for cleaner API.
3. **Plans update cache** — When admin updates a plan, the new limits should invalidate any cached plan data in `TIER_LIMITS`.
