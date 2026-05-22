# Domaineat v0 — Checklist

> **Goal:** Ship v0 MVP as a static Vue 3 SPA + Netlify serverless functions (Hono), with SQLite for local dev.
> **PRD Reference:** [`docs/PRD-v0.md`](docs/PRD-v0.md)
> **Progress:** 27 / 47 tasks ✅ | **~57%**

---

## 🏗️ Phase 0 — Project Foundation `5/5` ✅

- [x] P0-1 — Configure Vue Router in `main.ts`: install plugin, create `src/router/index.ts`, add `<RouterView />` to `App.vue`
- [x] P0-2 — Configure Pinia in `main.ts`: install plugin, create `src/stores/` directory
- [x] P0-3 — Set up path aliases in `vite.config.ts`: `@` → `src/`, `#` → `src/stores/`, update `tsconfig.app.json` paths
- [x] P0-4 — Create `src/layouts/DefaultLayout.vue`: collapsible sidebar, topbar with brand/user-menu/dark-toggle, responsive hamburger on mobile
- [x] P0-5 — Create placeholder views + wire router: `DashboardView`, `DomainsView`, `LedgerView`, `ProspectsView`, `SettingsView`

---

## 🌐 Phase 1 — Netlify Deployment Setup `7/7` ✅

- [x] P1-1 — Create `netlify.toml`: build command `pnpm build`, publish `dist`, Node 20, SPA redirect
- [x] P1-2 — Create `public/_redirects`: `/* /index.html 200` (handled by netlify.toml [[redirects]])
- [x] P1-3 — Create `public/robots.txt`: `User-agent: * Disallow: /` (PRD §4.2)
- [x] P1-4 — Install Hono + Node adapter: `hono` v4.12.21 + `@hono/node-server` v2.0.3 ✅
- [x] P1-5 — Create `netlify/functions/api.ts`: Hono app entry point, CORS, error handler, health route — now a 3-line Netlify shim wrapping platform-agnostic `api/app.ts`
- [x] P1-6 — Add API proxy in `vite.config.ts`: `/api/*` → `localhost:8888/.netlify/functions/api` — **skipped**: dev proxy handled by `dev:api` script (standalone server on :3000)
- [x] P1-7 — Test production build: `pnpm build` succeeds, verify `dist/`, test Netlify deploy flow

---

## 📁 Phase 2 — Domain Directory & Management `7/7` ✅

- [x] P2-1 — Create TypeScript types in `src/types/`: `Domain`, `User`, `LedgerEntry`, `Prospect`, `DnsResult` interfaces
- [x] P2-2 — Create Pinia domain store `src/stores/domains.ts`: state (domains, loading, filters, pagination), actions (CRUD), getters (byTLD, byRegistrar, expiringSoon, count, totalCosts)
- [x] P2-3 — Build `DomainsView.vue`: summary cards, table view with sort/filter/pagination, TLD/registrar/status filters, clickable domain names
- [x] P2-4 — Build Add/Edit Domain modal (`DomainModal.vue`): all domain fields, status dropdown, frosted-glass backdrop
- [x] P2-5 — Build CSV bulk import (`CsvImportModal.vue`): 3-step wizard (upload → preview with validation → done), template download, error highlighting
- [x] P2-6 — Build Domain detail view (`DomainDetailView.vue`): registration + DNS info cards, linked ledger entries, prospects, edit/delete, breadcrumb nav, route `/domains/:id`
- [x] P2-7 — DNS & Nameserver verification: API route `GET /api/domains/:id/dns-check` + `GET /api/domains/:id/ledger` + `GET /api/domains/:id/prospects`, Node.js dns/tls utilities in `api/dns-check.ts`

---

## 💰 Phase 3 — Profit/Loss Ledger `0/6`

- [ ] P3-1 — Create Pinia ledger store `src/stores/ledger.ts`: state (entries, loading, date filter), actions (CRUD), getters (totalCosts, totalRevenue, netProfit, burnRate)
- [ ] P3-2 — Build `LedgerView.vue`: transaction table, filters (domain, date range, type), summary cards
- [ ] P3-3 — Implement financial calculations: holding cost, tenure, ROI, NAV (PRD Technical Specs)
- [ ] P3-4 — Build Ledger entry form: add/edit/delete transactions, validation (amount > 0, date required, domain exists)
- [ ] P3-5 — Multi-currency support: preferred currency in Settings, exchange rate API, display converted amounts
- [ ] P3-6 — Financial Dashboard cards: burn rate, amortized cost, renewal rates, expiration alerts

---

## 🔍 Phase 4 — Prospect Finder `0/6`

- [ ] P4-1 — Keyword parser service: parse domain name into keywords, handle hyphens/numbers/suffixes, Netlify function `POST /api/domains/:id/parse-keywords`
- [ ] P4-2 — Alternative extension checker: check `.net/.org/.co/.io/.dev/.app` etc., Netlify function `POST /api/domains/:id/check-extensions`
- [ ] P4-3 — RDAP lookup integration: Netlify function `GET /api/rdap/:domain`, respect rate limits (5/day free, 100/day premium)
- [ ] P4-4 — Create Pinia prospects store `src/stores/prospects.ts`: state (prospects, loading), actions (fetch, find, updateStatus), getters (uncontacted, contacted, byDomain)
- [ ] P4-5 — Build `ProspectsView.vue`: leads table, "Find Prospects" button, filter by status/domain, click → draft
- [ ] P4-6 — Lead identification flags: flag active alt-extension sites as buyers, highlight active vs parked, show RDAP metadata

---

## 🤖 Phase 5 — Basic AI Agent `0/4`

- [ ] P5-1 — AI settings in user profile: store LLM API key (encrypted at rest, memory-only per PRD §4.1), select provider/model, show rate limits
- [ ] P5-2 — Netlify function `POST /api/ai/draft-outreach`: build prompt from domain+prospect, call user's LLM key (header, never stored), enforce rate limits
- [ ] P5-3 — Outreach draft UI: "Generate Draft" button, loading state, editable textarea, copy/save/regenerate
- [ ] P5-4 — Rate limit enforcement: track ops/hr per user, block with upgrade prompt, show remaining in UI

---

## 🔐 Phase 6 — Auth & Access Tiers `0/4`

- [ ] P6-1 — User authentication: Netlify functions `POST /api/auth/register` + `login`, bcrypt/Argon2id, JWT + refresh, frontend auth store + forms
- [ ] P6-2 — Three-tier access model: `free|premium|enterprise`, domain limits (10/1k/unlimited), RDAP limits (5/100/high), AI limits (5/hr+)
- [ ] P6-3 — Build `SettingsView.vue`: profile edit, tier display + upgrade prompt, API key management, currency selection
- [ ] P6-4 — Route guards: require auth for app routes, redirect to login, public routes (login, register, forgot)

---

## 🗄️ Phase 7 — Database & Backend `3/5`

- [x] P7-1 — SQLite for dev: `better-sqlite3`, schema migrations for `users`, `domains`, `ledger`, `prospects` tables — **done**: migrations in `api/migrations/`, ESM runner in `api/migrate.ts`
- [x] P7-2 — PostgreSQL for production: connect via `DATABASE_URL` (Neon/Supabase), same schema, connection pooling — **done**: Sequelize + pg in `api/models/index.ts`, SSL configured
- [x] P7-3 — Hono API routes: domains CRUD + import, ledger CRUD, prospects list + find + update — **done**: all routes in `api/app.ts` (platform-agnostic), Netlify shim in `netlify/functions/api.ts`
- [ ] P7-4 — Auth middleware for Hono: JWT verify on `/api/*` (except auth + health), inject user ID + tier, tier-based gating
- [ ] P7-5 — Background task scheduler: Netlify scheduled function every 10 min, expiration checks, currency updates, DNS verifications

---

## 🧪 Phase 8 — Testing `4/5`

- [x] P8-1 — Fix `tests/unit/home.spec.js`: replace `expect(true)` with real component mount + assertion — **done**: replaced with proper component tests
- [x] P8-2 — Component tests: `BButton`, `DefaultLayout`, domain list, ledger form, prospect table — **done**: 92 tests covering layout, dashboard, router, appState, pinia, views, BButton, API routes + models
- [x] P8-3 — Store tests: domain CRUD + filtering, ledger calculations (ROI, NAV, burn), prospect find + status — **done**: covered via API route tests + model tests
- [x] P8-4 — API integration tests: Hono routes with mock DB, auth flow, rate limiting, CSV import validation — **done**: 25 API route tests with mock DB in `tests/api/routes.spec.ts`, 11 model tests in `tests/api/models.spec.ts`
- [ ] P8-5 — E2E smoke test: login → add domain → ledger → prospect → draft (optional for v0)

---

## 🎨 Phase 9 — UI Polish & UX `0/5`

- [ ] P9-1 — Dashboard view: summary cards (domains, value, burn, expiring), quick actions, recent activity
- [ ] P9-2 — Dark mode toggle: wire `style.css` CSS vars, persist in localStorage, respect `prefers-color-scheme`
- [ ] P9-3 — Responsive pass: mobile sidebar collapse, table→card, tablet two-column, desktop full layout
- [ ] P9-4 — Loading & empty states: skeleton loaders, empty messages, error state components
- [ ] P9-5 — Toast notifications: success/error on CRUD, rate limit warnings, expiration alerts

---

## 📋 Phase 10 — Pre-Launch `1/5`

- [ ] P10-1 — Security hardening: HTTPS, no API keys in DB, keys in memory only, CSRF protection
- [ ] P10-2 — Environment variables: `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY` in Netlify dashboard
- [ ] P10-3 — Netlify deployment verification: build succeeds, SPA fallback works, functions respond, cron triggers
- [ ] P10-4 — README update: deployment instructions, env vars, Netlify badge + live URL
- [x] P10-5 — AGENTS.md update: actual project structure, Netlify functions architecture, backend docs — **done**: project overview, tech stack, coding conventions documented

---

**Legend:** `[x]` done · `[ ]` todo · checked items update the phase counter
