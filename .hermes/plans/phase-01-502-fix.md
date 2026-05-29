# Phase 01: Fix 502 Error — Robust Error Handling & Resilient Client

## Problem
Users get "Request failed with status code 502" on API calls (validate, search, login).
The 502 means the serverless function crashed or returned an invalid response. The
frontend currently has **no retry logic** and shows raw Axios error messages.

## Root Causes
1. **Server-side**: `/api/validate` and `/api/search` call external RDAP/DNS services
   that can timeout or fail. `Promise.allSettled` catches individual failures, but
   the outer `try/catch` still returns 502 for unexpected errors.
2. **Server-side**: `/api/auth/login` throws on DB/ bcrypt failures → 500 response.
3. **Client-side**: `api.ts` has **no retry** on 5xx, no timeout, no friendly error
   mapping. The store error handlers show raw strings like "Request failed with
   status code 502".
4. **Client-side**: `auth.ts` store shows raw `err.message` for non-API errors
   (e.g., network timeouts).

## Changes

### 1. API Client — Retry + Timeout + Friendly Errors (`src/lib/api.ts`)
- Add 10s request timeout
- Add automatic retry on 502/503/504 (max 2 retries, 1s backoff)
- Transform 5xx/network errors into friendly messages
- On 502 specifically: suggest "upstream service unavailable, retry later"

### 2. Auth Store — Friendly Error Messages (`src/stores/auth.ts`)
- Map known error patterns to user-friendly messages:
  - 502/503 → "Service temporarily unavailable. Please try again."
  - Network error → "Unable to connect to server. Check your connection."
  - 401 login → "Invalid email or password"
  - 409 register → "Email already registered"
  - Default → "Something went wrong. Please try again."

### 3. Lookup Store — Friendly Error Messages (`src/stores/lookup.ts`)
- Same friendly error mapping as auth store
- 429 already handled — keep as-is

### 4. Server-Side — Safer Error Returns (`api/app.ts`)
- Add a `safeJson` helper that catches JSON parse failures on request body
- Ensure `/api/validate` and `/api/search` never return 502 for RDAP/DNS
  failures (they already use `Promise.allSettled` — verify edge cases)
- Add request timeout (30s) for upstream RDAP/DNS calls

### 5. Unit Tests (TDD)
- `tests/unit/api-client.spec.ts` — retry logic, timeout, error mapping
- `tests/unit/auth-store.spec.ts` — friendly error messages
- `tests/unit/lookup-store-errors.spec.ts` — friendly error messages for lookup

## Test Plan
1. RED: Write tests defining expected behavior
2. GREEN: Implement changes to pass all tests
3. REFACTOR: Clean up, ensure all 256+ existing tests still pass
