# Domaineat v0 — Checklist

> **Goal:** Ship v0 MVP as a static Vue 3 SPA + Netlify serverless functions (Hono), with SQLite for local dev.
> **PRD Reference:** [`docs/PRD-v0.md`](docs/PRD-v0.md)
> **Progress:** 47 / 47 tasks ✅ | **100%**

---

## 🏗️ Phase 0 — Project Foundation `5/5` ✅

- [x] P0-1 — Configure Vue Router in `main.ts`: install plugin, create `src/router/index.ts`, add `<RouterView />` to `App.vue`
- [x] P0-2 — Configure Pinia in `main.ts`: install plugin, create `src/stores/` directory
- [x] P0-3 — Set up path aliases in `vite.config.ts`: `@` → `src/`, `#` → `src/stores/`, update `tsconfig.app.json` paths
- [x] P0-4 — Create `src/layouts/DefaultLayout.vue`: collapsible sidebar, topbar with brand/user-menu/dark-toggle, responsive hamburger on mobile
- [x] P0-5 — Create placeholder views + wire router: `DashboardView`, `DomainsView`, `LedgerView`, `ProspectsView`, `SettingsView`

---

## 🌐 Phase 1 — Netlify Deployment Setup `7/7` ✅

- [x] P1-1 — Create `netlify.toml`: build command `npm ci && npm run build`, publish `dist`, Node 20, SPA redirect
- [x] P1-2 — Create `public/_redirects`: `/* /index.html 200` (handled by netlify.toml [[redirects]])
- [x] P1-3 — Create `public/robots.txt`: `User-agent: * Disallow: /` (PRD §4.2)
- [x] P1-4 — Install Hono + Node adapter: `hono` v4.12.21 + `@hono/node-server` v2.0.3 ✅
- [x] P1-5 — Create `netlify/functions/api.ts`: Hono app entry point, CORS, error handler, health route — 3-line Netlify shim wrapping `api/app.ts`
- [x] P1-6 — Dev proxy: handled by `dev:api` script (standalone server on :3000)
- [x] P1-7 — Test production build: `npm run build` succeeds, verify `dist/`, test Netlify deploy flow

---

## 📁 Phase 2 — Domain Directory & Management `7/7` ✅

- [x] P2-1 — Create TypeScript types in `src/types/`: `Domain`, `User`, `LedgerEntry`, `Prospect`, `DnsResult` interfaces
- [x] P2-2 — Create Pinia domain store `src/stores/domains.ts`: state (domains, loading, filters, pagination), actions (CRUD), getters (byTLD, byRegistrar, expiringSoon, count, totalCosts)
- [x] P2-3 — Build `DomainsView.vue`: summary cards, table view with sort/filter/pagination, TLD/registrar/status filters
- [x] P2-4 — Build Add/Edit Domain modal (`DomainModal.vue`): all domain fields, status dropdown, frosted-glass backdrop
- [x] P2-5 — Build CSV bulk import (`CsvImportModal.vue`): 3-step wizard (upload → preview → done), template download
- [x] P2-6 — Build Domain detail view (`DomainDetailView.vue`): registration + DNS info cards, linked ledger/prospects, edit/delete
- [x] P2-7 — DNS & Nameserver verification: API routes + Node.js dns/tls utilities in `api/dns-check.ts`

---

## 💰 Phase 3 — Profit/Loss Ledger `6/6` ✅

- [x] P3-1 — Create Pinia ledger store `src/stores/ledger.ts`: entries, CRUD actions, financial getters
- [x] P3-2 — Build `LedgerView.vue`: summary cards, transaction table with type/date/domain filters, pagination
- [x] P3-3 — Financial calculations: holding cost, tenure, ROI, NAV, amortized monthly cost, renewal rate
- [x] P3-4 — Ledger entry form (`LedgerEntryModal.vue`): add/edit/delete transactions, domain selector, validation
- [x] P3-5 — Multi-currency support: `useCurrency` composable, `GET /api/exchange-rates`, currency selector
- [x] P3-6 — Financial Dashboard cards (`FinancialDashboard.vue`): burn rate, amortized cost, renewal rates, NAV, ROI

---

## 🔍 Phase 4 — Prospect Finder `6/6` ✅

- [x] P4-1 — Keyword parser service (`api/domain-analysis.ts`): parseDomain(), alt extensions
- [x] P4-2 — Alternative extension checker: checkAltExtensions() via RDAP
- [x] P4-3 — RDAP lookup integration: `GET /api/domains/:id/analyze`, `POST /api/analyze-domain`
- [x] P4-4 — Pinia prospects store (`src/stores/prospects.ts`): CRUD, filters, leadScore(), needsFollowUp
- [x] P4-5 — ProspectsView.vue: summary cards, follow-up alert, filters, prospect table, ProspectModal
- [x] P4-6 — Lead identification flags: hot/warm/cold scoring, 7-day follow-up reminders

---

## 🤖 Phase 5 — Basic AI Agent `4/4` ✅

- [x] P5-1 — AI settings in user profile: provider/model/API key form, GET/PATCH /api/users/:id/ai-settings
- [x] P5-2 — Netlify function `POST /api/ai/draft-outreach`: multi-provider LLM, rate limits per tier
- [x] P5-3 — Outreach draft UI: OutreachDraftModal with Generate/Copy/Regenerate/Save buttons
- [x] P5-4 — Rate limit enforcement: daily_ai_calls counter, 429 response, usage bar in SettingsView

---

## 🔐 Phase 6 — Auth & Access Tiers `4/4` ✅

- [x] P6-1 — User authentication: register/login/me endpoints, bcryptjs hashing, JWT (jose), Pinia auth store, LoginView
- [x] P6-2 — Three-tier access model: `free|premium|enterprise`, TIER_LIMITS, tier-gated API routes
- [x] P6-3 — Build `SettingsView.vue`: profile edit, tier display + upgrade CTA, AI usage dashboard
- [x] P6-4 — Route guards: `beforeEach` nav guard redirects unauthenticated users to `/login`

---

## 🗄️ Phase 7 — Database & Backend `5/5` ✅

- [x] P7-1 — SQLite for dev: `better-sqlite3`, schema migrations, ESM runner in `api/migrate.ts`
- [x] P7-2 — PostgreSQL for production: Sequelize + pg, SSL configured, connection pooling
- [x] P7-3 — Hono API routes: domains CRUD + import, ledger CRUD, prospects list + find + update
- [x] P7-4 — Auth middleware for Hono: JWT verify on `/api/*` (except auth + health), inject user ID + tier, tier-based gating + tests
- [x] P7-5 — Background task scheduler: Netlify scheduled function every 10 min, expiration checks, currency updates, DNS verifications + tests

---

## 🧪 Phase 8 — Testing `5/5` ✅

- [x] P8-1 — Fix `tests/unit/home.spec.js`: replaced with real component mount + assertions
- [x] P8-2 — Component tests: BButton, DefaultLayout, domain list, ledger form, prospect table
- [x] P8-3 — Store tests: domain CRUD + filtering, ledger calculations, prospect find + status
- [x] P8-4 — API integration tests: Hono routes with mock DB, auth flow, rate limiting, CSV import
- [x] P8-5 — E2E smoke tests: 13 tests — app shell, route resolution, view rendering, store integration

---

## 🎨 Phase 9 — UI Polish & UX `5/5` ✅

- [x] P9-1 — Dashboard view: summary cards, quick actions, recent activity
- [x] P9-2 — Dark mode toggle: CSS vars, localStorage, `prefers-color-scheme`
- [x] P9-3 — Responsive pass: mobile sidebar collapse, table→card, breakpoints
- [x] P9-4 — Loading & empty states: `LoadingSkeleton` + `EmptyState` components integrated in all views
- [x] P9-5 — Toast notifications: success/error on CRUD, `ToastNotification` component + toast store

---

## 📋 Phase 10 — Pre-Launch `5/5` ✅

- [x] P10-1 — Security hardening: HTTPS, HSTS, CSP, X-Frame-Options, rate limiting, data masking
- [x] P10-2 — Environment variables: `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY` in `.env.sample` with generation commands
- [x] P10-3 — CI/CD: npm-based CI workflow + deploy workflow, `netlify.toml` uses `npm ci`
- [x] P10-4 — README: badges, features, tech stack, setup, env vars, API docs, deployment guide, security
- [x] P10-5 — AGENTS.md update: project overview, tech stack, coding conventions documented

---

## 📊 Project Stats

| Metric | Value |
|--------|-------|
| **Test files** | 14 (unit + API + E2E) |
| **Tests passing** | 179 |
| **Build** | ✅ clean |
| **CI/CD** | GitHub Actions (ci.yml + deploy.yml) |
| **Deploy target** | Netlify |

**Legend:** `[x]` done · checked items update the phase counter
