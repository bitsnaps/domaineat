# Local Dev Database Connection Fix

## Problem
Three cascading issues prevented local development from connecting to PostgreSQL:

1. **SSL forced everywhere** — `dialectOptions.ssl.require: true` was hardcoded in all environments including `development`
2. **ENOENT migrations directory** — `tsc` compiles `.ts` to `dist-api/api/` but doesn't copy `.js` migration files
3. **ESM/CJS conflict** — Migration files use `module.exports` (CommonJS) but `package.json` has `"type": "module"`

Additionally, after fixing the above, **schema mismatches** existed between models and migrations (missing columns in `users`, `domains`, `notifications`).

## Root Causes & Fixes

### 1. SSL in development (4 files)

| File | Issue | Fix |
|------|-------|-----|
| `api/config/database.ts` | SSL hardcoded in `development` block | Removed `dialectOptions` from `development` |
| `api/config/database.js` → `.cjs` | Same + CJS in ESM project | Renamed to `.cjs`, removed SSL from `development` |
| `api/models/index.ts` | App Sequelize instance had SSL hardcoded | Made SSL conditional: `env !== 'development' ? { ssl } : {}` |
| `api/migrate.ts` | Migration runner had SSL hardcoded | Same conditional approach |

### 2. ENOENT migrations directory

`tsc` only compiles `.ts` files. The migration `.js`/`.cjs` files in `api/migrations/` were never copied to `dist-api/api/migrations/`.

**Fix:** Added `cp -r api/migrations dist-api/api/migrations` to the `build:api` script in `package.json`.

### 3. ESM/CJS conflict

All migration files and `database.js` use `module.exports` (CommonJS), but `package.json` has `"type": "module"`.

**Fix:**
- Renamed `api/migrations/*.js` → `*.cjs`
- Renamed `api/config/database.js` → `database.cjs`
- Updated `api/migrate.ts` to filter `.cjs` instead of `.js`
- Updated `.sequelizerc` to reference `database.cjs`

### 4. Schema mismatches (missing migration)

Created `api/migrations/20260614000001-align-models-with-migrations.cjs` to add missing columns:

| Table | Columns added |
|-------|--------------|
| `users` | `llm_provider`, `llm_model`, `llm_api_key_encrypted`, `preferred_registrar` |
| `domains` | `acquisition_cost`, `renewal_cost`, `nameservers`, `appraisal_grade` |
| `notifications` | `updated_at` |

Uses `describeTable()` guards for idempotency.

## Key Design Decisions

- SSL is only enabled for `production` and `test` — local PostgreSQL doesn't support SSL
- The `migrate.ts` custom runner was chosen over `sequelize-cli` because the project is ESM (`"type": "module"`)
- Migration files are `.cjs` (not `.mjs`) because they use `module.exports` syntax

## Files Modified

- `api/config/database.ts` — Removed SSL from development
- `api/config/database.js` → `api/config/database.cjs` — Renamed + removed SSL from development
- `api/models/index.ts` — Conditional SSL based on NODE_ENV
- `api/migrate.ts` — Conditional SSL + filter `.cjs` files
- `.sequelizerc` — Updated config path to `database.cjs`
- `package.json` — Added migration copy to `build:api` script
- `api/migrations/*.js` → `*.cjs` — All 11 migration files renamed
- `api/migrations/20260614000001-align-models-with-migrations.cjs` — New migration

## Verification

- `pnpm migrate` runs successfully (all 12 migrations applied)
- User registration works locally without SSL errors
- All model columns exist in the database schema
