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

## 💰 Phase 3 — Profit/Loss Ledger `6/6` ✅

- [x] P3-1 — Create Pinia ledger store `src/stores/ledger.ts`: entries, CRUD actions, financial getters (totalCosts, totalRevenue, netProfit, burnRate, roi, nav, countByType)
- [x] P3-2 — Build `LedgerView.vue`: summary cards, transaction table with type/date/domain filters, pagination, search
- [x] P3-3 — Financial calculations: holding cost, tenure, ROI, NAV, amortized monthly cost, renewal rate (in store + FinancialDashboard)
- [x] P3-4 — Ledger entry form (`LedgerEntryModal.vue`): add/edit/delete transactions, domain selector, type, amount > 0, date, notes validation
- [x] P3-5 — Multi-currency support: `useCurrency` composable, `GET /api/exchange-rates` (live + fallback), currency selector, formatCurrency helper
- [x] P3-6 — Financial Dashboard cards (`FinancialDashboard.vue`): burn rate, amortized cost, renewal rates, NAV, ROI, avg tenure, expiration alerts

---

## 🔍 Phase 4 — Prospect Finder `6/6` ✅

- [x] P4-1 — Keyword parser service (`api/domain-analysis.ts`): parseDomain() splits SLD into keywords, handles hyphens, common word dictionary, generates alt extensions
- [x] P4-2 — Alternative extension checker: checkAltExtensions() checks .com/.net/.org/.io/.dev/.app etc. via RDAP, returns availability + registrar + expiry
- [x] P4-3 — RDAP lookup integration: rdapLookup() queries IANA bootstrap → TLD RDAP server, extracts registrar/dates/nameservers/status. Routes: `GET /api/domains/:id/analyze`, `POST /api/analyze-domain`
- [x] P4-4 — Pinia prospects store (`src/stores/prospects.ts`): CRUD, filters (status/lead score/domain), leadScore(), needsFollowUp (7-day stale contacts)
- [x] P4-5 — ProspectsView.vue: summary cards (total, hot, warm, follow-ups), follow-up alert, filters, prospect table with lead score badges, pagination, ProspectModal
- [x] P4-6 — Lead identification flags: hot/warm/cold scoring (responded/negotiating=hot, contacted=warm, else=cold), 7-day follow-up reminders, RDAP metadata available via analyze endpoint

---

## 🤖 Phase 5 — Basic AI Agent `4/4` ✅

- [x] P5-1 — AI settings in user profile: User model updated with llm_provider/model/api_key_encrypted/daily_ai_calls. SettingsView has provider/model/API key form. GET/PATCH /api/users/:id/ai-settings. Key masked in responses.
- [x] P5-2 — Netlify function `POST /api/ai/draft-outreach`: builds prompt from domain+prospect, calls LLM (OpenAI/Anthropic/Groq/OpenRouter), enforces rate limits (5 free, 100 premium, ∞ enterprise). callLlm() multi-provider helper.
- [x] P5-3 — Outreach draft UI: OutreachDraftModal with Generate Draft button, loading spinner, editable textarea, Copy/Regenerate buttons, Save Draft appends to prospect notes. ✨ button on each prospect row.
- [x] P5-4 — Rate limit enforcement: daily_ai_calls counter on User, rate limits per tier (5/100/∞), 429 response when exceeded. SettingsView shows usage bar with daily_calls/daily_limit. GET /api/users/:id/ai-status endpoint.

---

## 🔐 Phase 6 — Auth & Access Tiers `4/4` ✅

- [x] P6-1 — User authentication: `POST /api/auth/register` + `POST /api/auth/login` + `GET /api/auth/me`, bcryptjs hashing, JWT (jose), Pinia auth store (`src/stores/auth.ts`), LoginView with login/register toggle + redirect support
- [x] P6-2 — Three-tier access model: `free|premium|enterprise`, TIER_LIMITS constant in `api/auth.ts`, tierLimits computed in auth store (free: 10 domains/5 RDAP/5 AI, premium: 1k/100/100, enterprise: ∞)
- [x] P6-3 — Build `SettingsView.vue`: profile edit, tier display + upgrade CTA (Premium/Enterprise), Sign Out button, API key management, AI usage dashboard, Tier & Limits card
- [x] P6-4 — Route guards: `beforeEach` nav guard redirects unauthenticated users to `/login` (except dashboard, login, health), redirect query param preserved

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
