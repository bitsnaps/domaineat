# CRM × Domain Intelligence Integration Design

> **Goal**: Bridge the gap between the intelligence tools (Lookup, Appraisal, Prospecting) and the CRM (Domains, Ledger, Prospects) so that every insight becomes an actionable next step — not a dead end.

---

## 1. The Problem Today

Right now the app has **two disconnected worlds**:

| Intelligence Side | CRM Side |
|---|---|
| Domain Lookup (multi-TLD search, deep validate) | Domain Directory (CRUD, CSV import) |
| Instant + Server-verified Appraisal | P&L Ledger (cost tracking, ROI) |
| Prospect Finder (alternative TLD owners) | Prospect CRM (outreach status tracking) |
| RDAP/DNS checks | Domain Detail (registration, DNS, prospects) |

**A user finds a great domain in Lookup → then what?** They have to:
1. Memorize or copy the domain name
2. Navigate to `/domains`
3. Click "Add Domain"
4. Manually fill in all fields they *already saw* in the lookup result
5. Navigate to `/prospects` to track outreach separately

**This is a conversion killer.** The entire value proposition of Domaineat — intelligence-driven domain management — breaks at the seam between "discovery" and "tracking."

---

## 2. Design Philosophy

**Every insight surface should be an action surface.** If a user can *see* data, they should be able to *act* on it in one click. The flow should be:

```
DISCOVER → EVALUATE → CAPTURE → TRACK → ACT
  Lookup    Appraise    Add to     CRM    AI Outreach
                       Portfolio
```

---

## 3. Feature Proposals

### 3.1 🎯 Quick-Add Action Menu (Domain Cards)

**Where**: `DomainLookupCard`, list view rows, validate result panel

**What**: A contextual `⋯` dropdown menu on every domain result card with smart actions:

| Action | Behavior | Requires Auth |
|---|---|---|
| **Add to Portfolio** | Pre-fills Domain creation modal with all known data (name, registrar, expiry from RDAP) | ✅ |
| **Add to Watchlist** | Adds domain to a lightweight "watching" list (see §3.4) | ✅ |
| **Add to Wishlist** | Adds domain to a "want to buy" list (see §3.5) | ✅ |
| **Find Prospects** | Runs Prospect Finder on this domain → navigates to `/prospects` with results | ✅ |
| **Generate Outreach** | Opens Outreach Draft modal pre-filled with domain info | ✅ |
| **Copy Domain** | Copies `domain.com` to clipboard | ❌ |
| **Deep Validate** | Switches to validate mode for this domain (current click behavior) | ❌ |

**UX**: The primary click on a card still does "Deep Validate" (existing behavior). The `⋯` menu appears on hover (desktop) or long-press (mobile) in the top-right corner of the card.

**Pre-fill logic for "Add to Portfolio"**:
```typescript
const prefill: DomainCreate = {
  user_id: auth.user.id,
  domain_name: result.domain,
  registrar: result.registrar || '',       // from RDAP
  acquisition_date: new Date().toISOString().split('T')[0],
  expiry_date: result.expiryDate || '',    // from RDAP
  acquisition_cost: 0,
  renewal_cost: 0,
  nameservers: null,
  status: result.available ? 'pending_delete' : 'active',
}
```

---

### 3.2 📊 Appraisal-Driven Decision Signals

**Where**: Domain detail view, lookup cards, portfolio list

**What**: Surface appraisal signals as **decision badges** that guide the user:

| Signal Combo | Badge | Meaning |
|---|---|---|
| Grade A+/A + Available | 🔥 **Hot Buy** | Premium domain available — act fast |
| Grade A+/A + Taken + Has Prospects | 💰 **High Value Target** | Premium taken domain with potential buyers |
| Grade B + Expiring Soon | ⏰ **Expiring Watch** | Decent domain about to drop — add to watchlist |
| Grade D/F | 🗑️ **Low Value** | Not worth tracking |

**Implementation**: Computed property on domain cards:
```typescript
function getDecisionSignal(result: ExtensionCheckResult, appraisal: DomainAppraisal): DecisionSignal {
  if (['A+', 'A'].includes(appraisal.grade) && result.available)
    return { icon: '🔥', label: 'Hot Buy', class: 'text-danger' }
  if (['A+', 'A'].includes(appraisal.grade) && !result.available)
    return { icon: '💰', label: 'High Value Target', class: 'text-warning' }
  // ...etc
}
```

This turns the appraisal from a "nice chart" into a **call to action**.

---

### 3.3 🔗 Unified Domain Detail (Merge Lookup + CRM)

**Where**: `/domains/:id` (DomainDetailView) — currently shows CRM data only

**What**: Merge the intelligence panel INTO the domain detail page, so a tracked domain shows everything in one place:

```
┌─────────────────────────────────────────────────────┐
│  mybrand.com                         [Edit] [Delete] │
│  🔥 Hot Buy · active · 47d to expiry                 │
├────────────────────┬────────────────────────────────┤
│  REGISTRATION      │  APPRAISAL                      │
│  Registrar: CF     │  Grade: A  │  $2K–$8K          │
│  Acquired: Jan '26 │  ✅ Length ✅ TLD ⚠️ Dictionary │
│  Expires: Mar '27  │  [Get Market Appraisal]         │
│  Cost: $12.00      │                                 │
├────────────────────┼────────────────────────────────┤
│  DNS & NAMESERVERS │  PROSPECTS (3)                  │
│  ✅ Resolves       │  mybrand.net → uncontacted      │
│  IP: 104.21.x.x   │  mybrand.org → responded        │
│  SSL: Mar '27     │  mybrand.io → negotiating       │
│  [Check DNS]       │  [Find More Prospects]          │
├────────────────────┴────────────────────────────────┤
│  LIVE RDAP DATA              [Fetch Live]            │
│  Available: No · Registrar: Cloudflare · ...         │
├──────────────────────────────────────────────────────┤
│  LEDGER ENTRIES (4)           [+ Add Entry]          │
│  Purchase  -$12.00  Jan '26                          │
│  Renewal    -$12.00  Jan '27                          │
├──────────────────────────────────────────────────────┤
│  AI OUTREACH                 [Draft Outreach]        │
│  [Generate email to mybrand.net owner]               │
└──────────────────────────────────────────────────────┘
```

**Key changes**:
- Add **Appraisal** section (always visible, with one-click "Get Market Appraisal")
- Add **AI Outreach** CTA button that drafts an email to a selected prospect
- "Find More Prospects" button runs the prospect finder inline (no page navigation)
- Decision signal badge in the header

---

### 3.4 👁️ Watchlist (Lightweight Domain Monitoring)

**Why**: Not every domain is worth adding to your portfolio (too early, still evaluating, waiting for a drop). But you still want to keep an eye on it.

**Model**:
```sql
CREATE TABLE watchlist (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  domain_name   VARCHAR(255) NOT NULL,
  tld           VARCHAR(50) NOT NULL,
  available     BOOLEAN,               -- last known status
  appraisal_grade VARCHAR(5),          -- cached at add time
  notes         TEXT,
  notify_on     VARCHAR(50) DEFAULT 'status_change',
  -- notify_on: 'status_change' | 'expiry' | 'price_drop' | 'never'
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, domain_name)
);
```

**UI**: A new sidebar nav item `/watchlist` with:
- Card/list view of watched domains
- One-click "Refresh Status" (re-runs RDAP check)
- Badge showing status changes since last check (🟢 became available, 🔴 now taken)
- Bulk "Move to Portfolio" action (select multiple → add to domains)
- "Add to Watchlist" action in lookup cards (§3.1)

**Tier limits**:
| Free | Premium | Enterprise |
|---|---|---|
| 10 watches | 100 watches | Unlimited |

**Scheduler integration**: The midnight scheduler already runs expiration checks. Extend it to:
1. Re-check watchlist domains' RDAP status
2. If status changed (available ↔ taken), record a `WatchlistEvent`
3. Show notification badge in sidebar

---

### 3.5 ⭐ Wishlist (Acquisition Targets)

**Why**: Different from the watchlist. Watchlist = "keeping an eye on it." Wishlist = "I want to buy this — help me get it."

**Model**:
```sql
CREATE TABLE wishlist (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  domain_name   VARCHAR(255) NOT NULL,
  tld           VARCHAR(50) NOT NULL,
  max_budget    DECIMAL(10,2),         -- what the user is willing to pay
  available     BOOLEAN,               -- last known status
  appraisal_grade VARCHAR(5),
  auto_prospect BOOLEAN DEFAULT FALSE, -- auto-find prospects when taken
  ai_agent      BOOLEAN DEFAULT FALSE, -- enable AI tracking agent
  priority      VARCHAR(10) DEFAULT 'medium',  -- low | medium | high | critical
  notes         TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, domain_name)
);
```

**UI**: A new sidebar nav item `/wishlist` with:
- Priority-sorted list (critical → low)
- Budget vs. Appraisal comparison column (are you over/under market?)
- "Find Prospects" bulk action on taken domains
- "Register Now" link on available domains (opens registrar search)
- "Convert to Domain" button (moves from wishlist → portfolio when acquired)
- Integration with AI Agent (§3.6)

**Key difference from Watchlist**:
| Watchlist | Wishlist |
|---|---|
| "I'm curious about this" | "I want to own this" |
| No budget, no priority | Has budget, priority level |
| Passive monitoring | Active acquisition strategy |
| Status change alerts | Prospect + outreach alerts |

---

### 3.6 🤖 AI Domain Agent (Automated Tracking)

**Why**: The PRD v3 vision mentions "Recursive AI Agents that analyze market trends, find undervalued domains, submit auction bids, and negotiate sales autonomously." We can start with a **v0 agent** that automates the most time-consuming manual tasks.

**What the agent does** (v0 scope):
1. **Monitor**: Periodically re-check RDAP for wishlisted domains with `ai_agent = TRUE`
2. **Alert**: Notify the user when a domain becomes available, drops in status, or nears expiry
3. **Draft**: Auto-generate outreach emails for new prospects on tracked domains
4. **Score**: Re-appraise domains periodically and flag significant value changes

**Architecture**:
```
┌──────────────────┐     ┌─────────────────┐     ┌──────────────┐
│  Scheduler       │────>│  Agent Worker    │────>│  LLM API     │
│  (midnight cron) │     │  (per-domain)    │     │  (user key)  │
└──────────────────┘     └────────┬─────────┘     └──────────────┘
                                  │
                         ┌────────▼─────────┐
                         │  Notification     │
                         │  Queue            │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┼──────────────┐
                    ▼             ▼               ▼
              [In-app badge]  [Email digest]  [Webhook]
```

**Agent tasks** (added to scheduler):
| Task | Schedule | Description |
|---|---|---|
| `agent_check` | Daily | Re-check RDAP for all wishlisted `ai_agent=TRUE` domains |
| `agent_appraise` | Weekly | Re-appraise and flag value changes >20% |
| `agent_prospect` | On status change | Auto-find prospects when a domain becomes taken |
| `agent_draft` | On new prospect | Auto-generate outreach draft |

**Tier limits**:
| Free | Premium | Enterprise |
|---|---|---|
| No agent | 5 agent domains | Unlimited agent domains |

**UI**: 
- Toggle "🤖 AI Agent" on each wishlist entry
- Agent activity log in `/settings` showing recent automated actions
- Notification center (bell icon in navbar) showing agent alerts

---

### 3.7 🔔 Notification Center

**Why**: With watchlists, wishlist agents, prospect status changes, and expiry alerts — the user needs a single place to see "what's new."

**Model**:
```sql
CREATE TABLE notifications (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  type          VARCHAR(50) NOT NULL,
  -- types: 'status_change' | 'expiry_warning' | 'appraisal_shift'
  --      | 'new_prospect' | 'agent_action' | 'outreach_reply'
  domain_name   VARCHAR(255),
  message       TEXT NOT NULL,
  read          BOOLEAN DEFAULT FALSE,
  action_url    VARCHAR(255),   -- deep link to relevant page
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**UI**:
- Bell icon 🔔 in navbar with unread count badge
- Dropdown panel showing recent notifications
- Click notification → navigate to relevant domain/prospect page
- "Mark all read" / "Clear all" actions
- Connected to scheduler (expiry warnings, status changes, agent actions)

---

### 3.8 📋 Bulk Actions & Smart Folders

**Where**: Domains list, Watchlist, Wishlist

**What**: Allow multi-select with checkbox column, then batch actions:

| Bulk Action | Applies To |
|---|---|
| Add to Watchlist | Portfolio domains |
| Add to Wishlist | Watchlist, Lookup results |
| Find Prospects | Any multi-selected domain |
| Generate Outreach | Domains with prospects |
| Move to Portfolio | Watchlist, Wishlist |
| Export CSV | Any list |
| Check RDAP | Watchlist, Wishlist |
| Tag | Portfolio domains |

**Smart Folders** (auto-filtered views):
- 🔥 **Hot Domains** — Grade A+/A in portfolio
- ⏰ **Expiring Soon** — <30 days to expiry
- 💰 **Undervalued** — Appraisal > 2× acquisition cost
- 🎯 **Active Outreach** — Domains with prospects in `contacted`/`negotiating` status
- 🆕 **Recently Added** — <7 days old
- 🤖 **Agent Managed** — AI-agent-tracked domains

---

### 3.9 🌐 Lookup → Prospects Pipeline (Seamless)

**Current flow** (broken):
```
Lookup → see taken domain → ??? → manually navigate to Prospects → ???
```

**Proposed flow**:
```
Lookup → see taken domain → click "Find Prospects" → 
  → inline prospect panel appears below the card
  → shows alternative TLD owners
  → click prospect → "Add to CRM" or "Draft Outreach"
  → prospect is linked to the domain in your portfolio
```

**If domain is NOT in portfolio yet**:
```
Lookup → see taken domain → click "Find Prospects" →
  → "Add to Portfolio & Find Prospects" combined action
  → creates domain entry + runs prospect finder in one step
  → navigates to domain detail with prospects populated
```

This is the **key integration point** — the PRD's "Workflow 1: Outbound Prospecting Campaign" but made frictionless.

---

### 3.10 📱 Contextual Smart CTAs (Progressive Disclosure)

**Not every action makes sense for every domain state.** Show contextual CTAs based on the domain's current data:

| Domain State | Primary CTA | Secondary CTA |
|---|---|---|
| Available + High Grade | "Add to Wishlist" | "Register Now →" |
| Available + Low Grade | "Add to Watchlist" | — |
| Taken + Has Prospects | "Draft Outreach" | "View Prospects" |
| Taken + No Prospects | "Find Prospects" | "Add to Watchlist" |
| In Portfolio + Expiring | "Renew" | "Check RDAP" |
| In Portfolio + High Appraisal | "List for Sale" | "Find Buyers" |
| In Watchlist + Now Available | "Move to Wishlist" | "Register Now →" |

**Implementation**: A `getSmartCta()` function that considers domain state, appraisal, and user's existing data:

```typescript
function getSmartCta(domain: DomainContext): SmartCta {
  if (domain.inPortfolio) {
    if (domain.daysToExpiry <= 30) return { label: 'Renew', icon: 'bi-arrow-repeat', ... }
    if (domain.appraisalGrade >= 'B') return { label: 'List for Sale', icon: 'bi-tag', ... }
    return { label: 'Check RDAP', icon: 'bi-broadcast', ... }
  }
  if (domain.available && domain.appraisalGrade >= 'B') 
    return { label: 'Add to Wishlist', icon: 'bi-star', ... }
  if (domain.available) 
    return { label: 'Add to Watchlist', icon: 'bi-eye', ... }
  if (domain.hasProspects) 
    return { label: 'Draft Outreach', icon: 'bi-envelope', ... }
  return { label: 'Find Prospects', icon: 'bi-people', ... }
}
```

---

## 4. Data Model Additions

### New Tables

```sql
-- Watchlist (lightweight monitoring)
CREATE TABLE watchlist (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL,
  domain_name     VARCHAR(255) NOT NULL,
  tld             VARCHAR(50) NOT NULL,
  available       BOOLEAN,
  appraisal_grade VARCHAR(5),
  notes           TEXT,
  notify_on       VARCHAR(50) DEFAULT 'status_change',
  last_checked_at TIMESTAMP,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, domain_name)
);

-- Wishlist (active acquisition targets)
CREATE TABLE wishlist (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL,
  domain_name     VARCHAR(255) NOT NULL,
  tld             VARCHAR(50) NOT NULL,
  max_budget      DECIMAL(10,2),
  available       BOOLEAN,
  appraisal_grade VARCHAR(5),
  auto_prospect   BOOLEAN DEFAULT FALSE,
  ai_agent        BOOLEAN DEFAULT FALSE,
  priority        VARCHAR(10) DEFAULT 'medium',
  notes           TEXT,
  last_checked_at TIMESTAMP,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, domain_name)
);

-- Notifications
CREATE TABLE notifications (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  type          VARCHAR(50) NOT NULL,
  domain_name   VARCHAR(255),
  message       TEXT NOT NULL,
  read          BOOLEAN DEFAULT FALSE,
  action_url    VARCHAR(255),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Domain Tags (for smart folders / filtering)
CREATE TABLE domain_tags (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  domain_id     INTEGER NOT NULL,
  tag           VARCHAR(50) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
  UNIQUE(domain_id, tag)
);
```

### New API Endpoints

```
# Watchlist
GET    /api/watchlist              — list user's watched domains
POST   /api/watchlist              — add domain to watchlist
DELETE /api/watchlist/:id           — remove from watchlist
POST   /api/watchlist/check        — bulk RDAP refresh
POST   /api/watchlist/to-portfolio — convert selected → portfolio

# Wishlist
GET    /api/wishlist               — list user's wishlist
POST   /api/wishlist               — add domain to wishlist
PUT    /api/wishlist/:id           — update (budget, priority, ai_agent)
DELETE /api/wishlist/:id           — remove from wishlist
POST   /api/wishlist/to-portfolio  — convert selected → portfolio
POST   /api/wishlist/prospect-all  — bulk find prospects for taken domains

# Notifications
GET    /api/notifications           — list (paginated, unread-first)
PUT    /api/notifications/:id/read  — mark as read
PUT    /api/notifications/read-all  — mark all as read
DELETE /api/notifications/:id       — dismiss

# Domain Tags
POST   /api/domains/:id/tags       — add tag
DELETE /api/domains/:id/tags/:tag  — remove tag

# Smart actions (existing endpoints, new integration)
POST   /api/domains/from-lookup    — create domain from lookup result (pre-filled)
POST   /api/prospects/find         — find prospects for a domain (inline)
```

---

## 5. Updated Navigation

```
SIDEBAR:
├── 🏠 Dashboard
├── 🌐 Domains (Portfolio)
├── 🔍 Lookup
├── 👁️ Watchlist          ← NEW
├── ⭐ Wishlist           ← NEW  
├── 💰 Ledger
├── 👥 Prospects
├── ⚙️ Settings
```

---

## 6. Implementation Priority & Phasing

### Phase 1 — Quick Wins (Highest Impact, Lowest Effort)
1. **Quick-Add Action Menu** (§3.1) — contextual menu on lookup cards
2. **"Add to Portfolio from Lookup"** — pre-filled domain creation from RDAP data  
3. **Appraisal Decision Signals** (§3.2) — badges on cards
4. **Smart CTAs** (§3.10) — contextual primary actions

**Effort**: ~2-3 days | **Impact**: Eliminates the biggest friction point (lookup → portfolio gap)

### Phase 2 — Watchlist & Wishlist
5. **Watchlist** (§3.4) — model + API + UI
6. **Wishlist** (§3.5) — model + API + UI + budget tracking
7. **Bulk Actions** (§3.8) — multi-select + batch operations
8. **Smart Folders** (§3.8) — auto-filtered views

**Effort**: ~5-7 days | **Impact**: Gives users a proper acquisition pipeline instead of "all or nothing" portfolio tracking

### Phase 3 — Notifications & Agent
9. **Notification Center** (§3.7) — bell icon + model + scheduler integration
10. **AI Domain Agent v0** (§3.6) — scheduler tasks + auto-prospect + auto-draft
11. **Domain Tags** (§3.8) — tagging system for smart folders

**Effort**: ~5-7 days | **Impact**: Transforms the app from "tool you check" to "tool that works for you"

### Phase 4 — Unified Domain Detail
12. **Merged Domain Detail** (§3.3) — appraisal + AI outreach + prospects inline
13. **Lookup → Prospects Pipeline** (§3.9) — seamless inline prospect finding
14. **Registrar Deep Links** — "Register Now →" opens registrar affiliate links

**Effort**: ~3-4 days | **Impact**: Completes the unified experience, no more siloed pages

---

## 7. Tier Strategy

| Feature | Free | Premium | Enterprise |
|---|---|---|---|
| Quick-Add from Lookup | ✅ | ✅ | ✅ |
| Appraisal Decision Signals | ✅ | ✅ | ✅ |
| Watchlist | 10 domains | 100 domains | Unlimited |
| Wishlist | 5 domains | 50 domains | Unlimited |
| AI Agent | ❌ | 5 domains | Unlimited |
| Notifications | In-app only | In-app + Email digest | In-app + Email + Webhooks |
| Bulk Actions | Up to 10 | Up to 100 | Unlimited |
| Smart Folders | 3 built-in | Custom smart folders | Custom + API access |
| Domain Tags | 3 tags/domain | 10 tags/domain | Unlimited |

---

## 8. Key Design Decisions

1. **Watchlist ≠ Wishlist** — Separating "curious about" from "want to buy" prevents the portfolio from becoming a dumping ground and gives clearer intent signals for the AI agent.

2. **Pre-fill, don't auto-create** — "Add to Portfolio" always opens a confirmation modal (pre-filled), not a silent create. Users must confirm because the portfolio is their financial ledger.

3. **Agent is opt-in per domain** — Not a global toggle. Users choose which domains the AI agent tracks, keeping costs predictable and giving users control.

4. **Notifications are append-only** — Never auto-delete. Users dismiss explicitly. This prevents missing critical alerts (domain just became available!).

5. **Decision signals are client-side** — The appraisal algorithm already runs client-side for instant feedback. Decision badges are computed from the same data — no new API needed for Phase 1.

6. **"from-lookup" is a first-class API endpoint** — Rather than making the frontend construct a Domain payload, the backend `/api/domains/from-lookup` endpoint accepts a domain name, fetches the latest RDAP data server-side, and creates the domain with verified info. This avoids stale data issues.
