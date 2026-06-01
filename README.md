# Domaineat

[![CI](https://github.com/user/domaineat/actions/workflows/ci.yml/badge.svg)](https://github.com/user/domaineat/actions/workflows/ci.yml)
[![Deploy](https://github.com/user/domaineat/actions/workflows/deploy.yml/badge.svg)](https://github.com/user/domaineat/actions/workflows/deploy.yml)
[![Tests](https://img.shields.io/badge/tests-161%20passing-brightgreen)](./tests)
[![Node](https://img.shields.io/badge/node-20%2B-339933?logo=node.js)](https://nodejs.org/)

**Domaineat** is a SaaS platform for domain portfolio management with AI-powered outreach drafting, financial tracking, and prospect management.

## Features

- 🌐 **Domain Portfolio** — Track domains across registrars with status, expiry, and cost management
- 💰 **Financial Ledger** — Record purchases, renewals, sales; view ROI, NAV, and burn rate
- 🔍 **Prospect Management** — Track potential buyers with lead scoring and outreach status
- 🤖 **AI Outreach Drafting** — Generate personalized outreach emails using configurable LLM providers
- 🌙 **Dark Mode** — System-aware theme with manual toggle and localStorage persistence
- 📱 **Responsive Design** — Mobile-first layout with collapsible sidebar and card-based mobile tables
- 🔐 **Auth & Security** — JWT authentication, tier-based rate limiting, HTTPS enforcement, CSP headers
- 🔔 **Toast Notifications** — Success/error feedback on all CRUD operations

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3 + TypeScript + Pinia + Vue Router + Bootstrap 5 |
| Backend | Hono (Node.js) |
| Database | PostgreSQL (production) / SQLite (development) |
| AI | Configurable LLM providers (OpenAI, Anthropic, Google, Ollama, Groq, etc.) |
| Deployment | Netlify (static + serverless functions) |
| CI/CD | GitHub Actions |

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL (for production) or SQLite (for development)

### Setup

```bash
# Clone the repo
git clone https://github.com/user/domaineat.git
cd domaineat

# Install dependencies
pnpm ci

# Copy environment variables
cp .env.sample .env
# Edit .env with your values (see Environment Variables below)
```

### Development

```bash
# Frontend dev server (Vite)
pnpm run dev

# API dev server (Hono)
pnpm run dev:api

# Both simultaneously
pnpm run dev:all
```

### Build & Preview

```bash
# Type-check and build frontend
pnpm run build

# Build API (TypeScript → JavaScript)
pnpm run build:api

# Preview production build
pnpm run preview
```

### Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm run test:coverage

# Run specific test suite
npx vitest run tests/api/
npx vitest run tests/unit/
```

## Environment Variables

Copy `.env.sample` to `.env` and fill in the values:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string: `postgres://user:pass@host:5432/db?sslmode=require` |
| `JWT_SECRET` | ✅ | Secret key for signing JWT tokens (min 32 chars in production) |
| `ENCRYPTION_KEY` | ✅ | AES-256 key for encrypting stored LLM API keys (32-byte hex string) |
| `NODE_ENV` | — | `development` (default) or `production` |

Generate secrets:
```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## User Tiers

| Tier | Daily AI Calls | Features |
|------|---------------|----------|
| Free | 5 | Basic domain management, limited AI |
| Premium | 100 | Full analytics, priority AI |
| Enterprise | Unlimited | All features, no limits |

Users configure their own LLM provider, model, and API key in Settings.

## Deployment (Netlify)

The project is configured for Netlify deployment:

1. **Connect repo** — In Netlify UI → Sites → Add new site → Import from Git
2. **Build settings** — Auto-detected from `netlify.toml`:
   - Build command: `pnpm ci && pnpm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
3. **Environment variables** — Add `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY` in Netlify UI → Site settings → Environment variables
4. **Auto-deploy** — Pushes to `master` trigger automatic builds

### Scheduled Functions

The scheduler function runs every 10 minutes for:
- Expiry notifications (7/30/60 day warnings)
- Daily AI call counter resets
- Stale prospect detection

### GitHub Actions CI/CD

- **CI** (`ci.yml`) — Runs on every push/PR to master: tests + build + artifact upload
- **Deploy** (`deploy.yml`) — Runs on push to master: build + verify (Netlify auto-deploys)

## Project Structure

```
├── api/                  # Hono backend
│   ├── app.ts           # Main app with routes & middleware
│   ├── auth.ts          # JWT auth middleware
│   ├── scheduler.ts     # Background task scheduler
│   ├── env.validation.ts # Environment variable validation
│   └── models/          # Sequelize models
├── src/                  # Vue 3 frontend
│   ├── components/      # Reusable components (LoadingSkeleton, EmptyState, Toast, etc.)
│   ├── layouts/         # DefaultLayout with sidebar + navbar
│   ├── views/           # Page views (Home, Domains, Ledger, Prospects, Settings)
│   ├── stores/          # Pinia stores (domains, ledger, prospects, auth, toast, appState)
│   ├── router/          # Vue Router config
│   └── style.css        # Global styles + dark mode CSS variables
├── netlify/
│   └── functions/       # Netlify serverless functions
├── tests/
│   ├── api/             # API route & middleware tests
│   └── unit/            # Component & store unit tests
├── .github/workflows/   # CI/CD pipelines
├── netlify.toml         # Netlify build config
└── AGENTS.md            # AI agent guidelines
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/domains` | List user's domains |
| POST | `/api/domains` | Add a domain |
| PUT | `/api/domains/:id` | Update a domain |
| DELETE | `/api/domains/:id` | Delete a domain |
| GET | `/api/ledger` | List ledger entries |
| POST | `/api/ledger` | Create ledger entry |
| PUT | `/api/ledger/:id` | Update entry |
| DELETE | `/api/ledger/:id` | Delete entry |
| GET | `/api/prospects` | List prospects |
| POST | `/api/prospects` | Add prospect |
| PUT | `/api/prospects/:id` | Update prospect |
| DELETE | `/api/prospects/:id` | Delete prospect |
| POST | `/api/ai/draft-outreach` | Generate AI outreach email |
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/notifications` | Get user notifications |
| GET | `/api/domains/:id/lookup` | Single WHOIS lookup |
| POST | `/api/domains/bulk-lookup` | Bulk WHOIS lookup |

## Security

- **HTTPS enforcement** — Redirects HTTP → HTTPS in production (X-Forwarded-Proto)
- **Security headers** — HSTS, X-Content-Type-Options, X-Frame-Options, CSP, Referrer-Policy
- **JWT authentication** — Token-based auth with tier-based access control
- **Rate limiting** — Auth routes: 10 req/min per IP; AI routes: tier-based daily limits
- **Data masking** — API keys shown as `••••last4`; passwords never returned
- **Request size limit** — Max 1MB request body
- **Encrypted storage** — LLM API keys encrypted at rest with AES-256

## License

Private — All rights reserved.
