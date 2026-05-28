# Domain Appraisal Feature — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add a two-tier domain appraisal system — Tier 1 (instant, client-side grade + price range) and Tier 2 (on-demand, server-side enhanced appraisal with comparable sales + search volume).

**Architecture:** Tier 1 runs entirely in the browser using intrinsic domain signals (length, TLD prestige, dictionary word, brandability, cleanliness). It produces a letter grade (A+–F) and a dollar range, displayed automatically on every search result card and validate page. Tier 2 is a new `/api/appraise` endpoint that adds market data (comparable sales, search volume, external appraisal) — triggered on-demand by a button click, rate-limited against the user's RDAP quota.

**Tech Stack:** Vue 3 + TypeScript (frontend scoring engine), Hono (backend endpoint), existing Vitest test suite, Netlify Functions (deployment), GitHub Actions CI.

---

## Phase 1: Core Scoring Engine (Tier 1 — Client-Side)

### Task 1: Create TypeScript appraisal types

**Objective:** Define the data shapes for appraisal results and signals.

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Add appraisal types to the end of `src/types/index.ts`**

```ts
// ─── Domain Appraisal ─────────────────────────────────────────────────

export type AppraisalGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'

export interface AppraisalSignal {
	score: number    // 0–10
	label: string    // e.g. "3 chars (excellent)", "Contains hyphen (penalty)"
	passed: boolean  // green check vs red X in UI
}

export interface DomainAppraisal {
	grade: AppraisalGrade
	range: { low: number; high: number }
	signals: {
		length: AppraisalSignal
		tld: AppraisalSignal
		dictionary: AppraisalSignal
		brandable: AppraisalSignal
		clean: AppraisalSignal
	}
}

export interface EnhancedAppraisal extends DomainAppraisal {
	enhanced: true
	comparableSales: { domain: string; price: number; date: string }[]
	searchVolume: number | null
	externalAppraisal: { source: string; value: number } | null
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd /opt/data/domaineat && npx vue-tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add DomainAppraisal and EnhancedAppraisal types"
```

---

### Task 2: Create TLD prestige map

**Objective:** Build a static map of TLD → prestige score (0–10) for the scoring engine.

**Files:**
- Create: `src/lib/tld-prestige.ts`

**Step 1: Write the TLD prestige module**

```ts
/**
 * TLD prestige scores (0–10) for domain appraisal.
 * Based on market demand, registration cost, and perceived value.
 * 10 = highest (.com), 1 = lowest (obscure ccTLDs).
 */

const TLD_PRESTIGE: Record<string, number> = {
	// Tier 1 — premium generics
	com: 10, net: 7, org: 7,

	// Tier 2 — popular new gTLDs / short ccTLDs
	io: 6, ai: 8, co: 6, dev: 5, app: 5,

	// Tier 3 — decent generics
	xyz: 3, me: 4, info: 3, biz: 2, us: 4,
	uk: 4, de: 4, fr: 3, eu: 3,

	// Tier 4 — niche / lower demand
	tv: 4, ly: 4, cc: 2, online: 2, site: 2,
	store: 2, tech: 3, shop: 3,
}

const DEFAULT_PRESTIGE = 2

/** Get the prestige score for a TLD (0–10) */
export function getTldPrestige(tld: string): number {
	return TLD_PRESTIGE[tld.toLowerCase()] ?? DEFAULT_PRESTIGE
}

/** Get all known TLDs with their prestige scores */
export function getAllTldPrestige(): Readonly<Record<string, number>> {
	return TLD_PRESTIGE
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd /opt/data/domaineat && npx vue-tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add src/lib/tld-prestige.ts
git commit -m "feat: add TLD prestige map for domain appraisal"
```

---

### Task 3: Create the scoring engine (appraise function)

**Objective:** Build the pure-function scoring engine that takes a domain string and returns a `DomainAppraisal`.

**Files:**
- Create: `src/lib/appraise.ts`

**Step 1: Write the scoring engine**

The scoring engine computes 5 signals (0–10 each), averages them, then maps to a grade and price range.

```ts
import type { AppraisalGrade, AppraisalSignal, DomainAppraisal } from '@/types'
import { getTldPrestige } from '@/lib/tld-prestige'

// ─── Signal scorers ──────────────────────────────────────────────────

/** Score based on SLD character length. Short = valuable. */
function scoreLength(sld: string): AppraisalSignal {
	const len = sld.length
	if (len <= 2) return { score: 10, label: `${len} chars (premium)`, passed: true }
	if (len <= 3) return { score: 9, label: `${len} chars (excellent)`, passed: true }
	if (len <= 4) return { score: 8, label: `${len} chars (very good)`, passed: true }
	if (len <= 5) return { score: 7, label: `${len} chars (good)`, passed: true }
	if (len <= 6) return { score: 6, label: `${len} chars (fair)`, passed: true }
	if (len <= 8) return { score: 5, label: `${len} chars (average)`, passed: false }
	if (len <= 10) return { score: 4, label: `${len} chars (below avg)`, passed: false }
	if (len <= 12) return { score: 3, label: `${len} chars (long)`, passed: false }
	return { score: 1, label: `${len} chars (very long)`, passed: false }
}

/** Score based on TLD prestige. */
function scoreTld(tld: string): AppraisalSignal {
	const prestige = getTldPrestige(tld)
	const labels = ['(lowest)', '(low)', '(below avg)', '(fair)', '(average)', '(good)', '(strong)', '(very good)', '(excellent)', '(premium)', '(top tier)']
	const label = labels[prestige] ?? '(unknown)'
	const passed = prestige >= 6
	return { score: prestige, label: `.${tld} ${label}`, passed }
}

// ─── Dictionary check ────────────────────────────────────────────────

/**
 * Common English words for dictionary scoring.
 * Kept intentionally small (~100 words) for bundle size.
 * Covers high-value commercial keywords.
 */
const DICTIONARY = new Set([
	// Commerce & finance
	'pay', 'bank', 'loan', 'cash', 'fund', 'trade', 'sell', 'buy', 'deal', 'price',
	'coin', 'gold', 'rich', 'money', 'invest', 'profit', 'stock', 'tax', 'cost', 'rate',
	// Tech
	'app', 'web', 'data', 'code', 'dev', 'api', 'cloud', 'host', 'node', 'stack',
	'tech', 'byte', 'bit', 'hack', 'sync', 'link', 'ping', 'net', 'bot', 'ai',
	'crypto', 'cyber', 'digital', 'smart', 'cloud', 'logic', 'mesh', 'grid',
	// Lifestyle & social
	'fit', 'fun', 'food', 'love', 'care', 'home', 'life', 'play', 'art', 'style',
	'chat', 'meet', 'date', 'club', 'team', 'group', 'social', 'live', 'real', 'true',
	// Action words
	'go', 'get', 'try', 'use', 'run', 'fly', 'do', 'make', 'send', 'keep',
	'find', 'help', 'save', 'grow', 'start', 'open', 'move', 'work', 'plan', 'build',
	// Adjectives
	'best', 'top', 'new', 'fast', 'free', 'safe', 'easy', 'big', 'pro', 'super',
	'hot', 'cool', 'green', 'blue', 'red', 'prime', 'ultra', 'mega', 'hyper', 'max',
	// Business
	'brand', 'name', 'shop', 'store', 'market', 'lead', 'hub', 'lab', 'base', 'box',
	'kit', 'tool', 'desk', 'office', 'firm', 'corp', 'inc', 'biz', 'work', 'job',
])

/** Check if the full SLD is a dictionary word or splits into known words. */
function scoreDictionary(sld: string): AppraisalSignal {
	const lower = sld.toLowerCase()

	// Exact match — strongest signal
	if (DICTIONARY.has(lower)) {
		return { score: 10, label: `"${lower}" — dictionary word`, passed: true }
	}

	// Check if SLD splits into known words via hyphen or camelCase
	const parts = lower.includes('-')
		? lower.split('-').filter(Boolean)
		: splitIntoKnownWords(lower)

	if (parts.length >= 2 && parts.every(p => DICTIONARY.has(p))) {
		return { score: 8, label: `"${parts.join(' + ')}" — compound word`, passed: true }
	}

	if (parts.length >= 2 && parts.filter(p => DICTIONARY.has(p)).length >= parts.length - 1) {
		return { score: 6, label: `"${parts.join(' + ')}" — partial match`, passed: true }
	}

	// No dictionary match
	return { score: 1, label: `"${lower}" — not a known word`, passed: false }
}

/** Greedy split of a string into known dictionary words. */
function splitIntoKnownWords(s: string): string[] {
	const result: string[] = []
	let remaining = s
	while (remaining.length > 0) {
		let found = false
		for (let len = Math.min(remaining.length, 10); len >= 2; len--) {
			if (DICTIONARY.has(remaining.slice(0, len))) {
				result.push(remaining.slice(0, len))
				remaining = remaining.slice(len)
				found = true
				break
			}
		}
		if (!found) {
			result.push(remaining[0])
			remaining = remaining.slice(1)
		}
	}
	return result.filter(w => w.length > 0)
}

// ─── Brandability ────────────────────────────────────────────────────

/** Score based on pronounceability and brandability. */
function scoreBrandable(sld: string): AppraisalSignal {
	const lower = sld.toLowerCase()
	const len = lower.length

	// Penalty: repeated chars (aaaa, 1111)
	if (/(.)\1{3,}/.test(lower)) {
		return { score: 1, label: 'Repeated character pattern', passed: false }
	}

	// Penalty: keyboard walks (qwerty, asdf)
	const keyboardPatterns = ['qwerty', 'asdf', 'zxcv', 'qwer', 'asdfg', 'qazwsx']
	if (keyboardPatterns.some(p => lower.includes(p))) {
		return { score: 1, label: 'Keyboard pattern detected', passed: false }
	}

	// Vowel/consonant ratio — pronounceable names have ~40% vowels
	const vowels = (lower.match(/[aeiouy]/g) || []).length
	const vowelRatio = len > 0 ? vowels / len : 0
	if (len >= 3 && vowelRatio >= 0.25 && vowelRatio <= 0.65) {
		// Good pronounceability
		if (len <= 5) return { score: 8, label: 'Short and pronounceable', passed: true }
		if (len <= 8) return { score: 7, label: 'Pronounceable', passed: true }
		return { score: 6, label: 'Reasonably pronounceable', passed: true }
	}

	// All consonants or all vowels — less brandable
	if (vowels === 0 || vowels === len) {
		return { score: 2, label: 'Not pronounceable', passed: false }
	}

	return { score: 4, label: 'Moderate brandability', passed: false }
}

// ─── Cleanliness ─────────────────────────────────────────────────────

/** Score based on absence of numbers, hyphens, and special chars. */
function scoreClean(sld: string): AppraisalSignal {
	const hasHyphen = sld.includes('-')
	const hasNumber = /\d/.test(sld)
	const hasSpecial = /[^a-z0-9-]/i.test(sld)

	if (hasSpecial) return { score: 1, label: 'Contains special characters', passed: false }
	if (hasHyphen && hasNumber) return { score: 1, label: 'Has hyphen AND number', passed: false }
	if (hasHyphen) return { score: 3, label: 'Contains hyphen', passed: false }
	if (hasNumber) return { score: 3, label: 'Contains number', passed: false }

	return { score: 10, label: 'Clean — letters only', passed: true }
}

// ─── Grade + Range mapping ───────────────────────────────────────────

/** Map average score (0–10) to grade. */
function scoreToGrade(avg: number): AppraisalGrade {
	if (avg >= 9) return 'A+'
	if (avg >= 8) return 'A'
	if (avg >= 6.5) return 'B'
	if (avg >= 5) return 'C'
	if (avg >= 3) return 'D'
	return 'F'
}

/** Map grade to approximate dollar range. */
function gradeToRange(grade: AppraisalGrade): { low: number; high: number } {
	const ranges: Record<AppraisalGrade, { low: number; high: number }> = {
		'A+': { low: 10000, high: 1000000 },
		'A':  { low: 1000, high: 50000 },
		'B':  { low: 500, high: 10000 },
		'C':  { low: 100, high: 2000 },
		'D':  { low: 10, high: 500 },
		'F':  { low: 1, high: 50 },
	}
	return ranges[grade]
}

// ─── Main export ─────────────────────────────────────────────────────

/**
 * Appraise a domain name using intrinsic signals only.
 * Runs entirely client-side — no API call needed.
 */
export function appraise(domain: string): DomainAppraisal {
	const parts = domain.toLowerCase().replace(/^www\./, '').split('.')
	const sld = parts.length > 1 ? parts.slice(0, -1).join('.') : parts[0]
	const tld = parts.length > 1 ? parts[parts.length - 1] : 'com'

	const signals = {
		length: scoreLength(sld),
		tld: scoreTld(tld),
		dictionary: scoreDictionary(sld),
		brandable: scoreBrandable(sld),
		clean: scoreClean(sld),
	}

	const avg = (signals.length.score + signals.tld.score + signals.dictionary.score + signals.brandable.score + signals.clean.score) / 5
	const grade = scoreToGrade(avg)
	const range = gradeToRange(grade)

	return { grade, range, signals }
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd /opt/data/domaineat && npx vue-tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add src/lib/appraise.ts
git commit -m "feat: add client-side domain appraisal scoring engine"
```

---

### Task 4: Write unit tests for the scoring engine

**Objective:** TDD verification — test all signal scorers, grade mapping, and edge cases.

**Files:**
- Create: `tests/unit/appraise.spec.ts`

**Step 1: Write tests**

```ts
import { describe, it, expect } from 'vitest'
import { appraise } from '@/lib/appraise'

describe('appraise — scoring engine', () => {
	// ─── Grade mapping ───────────────────────────────────────────────

	it('gives A+ for short dictionary .com', () => {
		const result = appraise('pay.com')
		expect(result.grade).toBe('A+')
		expect(result.range.low).toBe(10000)
		expect(result.signals.length.score).toBe(9) // 3 chars
		expect(result.signals.tld.score).toBe(10)   // .com
		expect(result.signals.dictionary.score).toBe(10) // exact word
		expect(result.signals.clean.score).toBe(10)  // no hyphens/numbers
	})

	it('gives F for long random string with numbers', () => {
		const result = appraise('xkqz123xyz.net')
		expect(result.grade).toBeOneOf(['D', 'F'])
		expect(result.signals.clean.score).toBeLessThanOrEqual(3) // has numbers
		expect(result.signals.dictionary.score).toBeLessThanOrEqual(1) // not a word
	})

	// ─── Length signal ────────────────────────────────────────────────

	it('scores 2-char SLD as premium (10)', () => {
		expect(appraise('go.com').signals.length.score).toBe(10)
	})

	it('scores 6-char SLD as fair (6)', () => {
		expect(appraise('domain.com').signals.length.score).toBe(6)
	})

	it('scores 15-char SLD as very long (1)', () => {
		expect(appraise('verylongdomainnamex.com').signals.length.score).toBe(1)
	})

	// ─── TLD signal ──────────────────────────────────────────────────

	it('.com scores 10', () => {
		expect(appraise('x.com').signals.tld.score).toBe(10)
	})

	it('.ai scores 8', () => {
		expect(appraise('x.ai').signals.tld.score).toBe(8)
	})

	it('unknown TLD scores 2 (default)', () => {
		expect(appraise('x.zz').signals.tld.score).toBe(2)
	})

	// ─── Dictionary signal ───────────────────────────────────────────

	it('exact dictionary word scores 10', () => {
		expect(appraise('bank.com').signals.dictionary.score).toBe(10)
	})

	it('hyphenated compound word scores 8', () => {
		expect(appraise('pay-day.com').signals.dictionary.score).toBe(8)
	})

	it('non-word scores 1', () => {
		expect(appraise('xkqz.com').signals.dictionary.score).toBe(1)
	})

	// ─── Brandability signal ─────────────────────────────────────────

	it('keyboard pattern scores 1', () => {
		expect(appraise('qwerty.com').signals.brandable.score).toBe(1)
	})

	it('all consonants scores low', () => {
		expect(appraise('bcdfg.com').signals.brandable.score).toBeLessThanOrEqual(4)
	})

	it('pronounceable word scores high', () => {
		expect(appraise('luma.com').signals.brandable.score).toBeGreaterThanOrEqual(6)
	})

	// ─── Clean signal ────────────────────────────────────────────────

	it('letters-only scores 10', () => {
		expect(appraise('clean.com').signals.clean.score).toBe(10)
	})

	it('hyphen scores 3', () => {
		expect(appraise('my-domain.com').signals.clean.score).toBe(3)
	})

	it('number scores 3', () => {
		expect(appraise('domain1.com').signals.clean.score).toBe(3)
	})

	it('hyphen + number scores 1', () => {
		expect(appraise('my-domain1.com').signals.clean.score).toBe(1)
	})

	// ─── Edge cases ──────────────────────────────────────────────────

	it('handles www prefix stripping', () => {
		const result = appraise('www.bank.com')
		expect(result.signals.length.score).toBe(appraise('bank.com').signals.length.score)
	})

	it('handles domain without TLD (defaults to .com)', () => {
		const result = appraise('bank')
		expect(result.signals.tld.score).toBe(10) // .com default
	})

	it('returns valid grade and range for any input', () => {
		const grades = ['A+', 'A', 'B', 'C', 'D', 'F'] as const
		const domains = ['ai.com', 'shop.io', 'my-cats-website123.xyz', 'qwerty.biz', 'pay.net', 'thebestfastapp.dev']
		for (const d of domains) {
			const r = appraise(d)
			expect(grades).toContain(r.grade)
			expect(r.range.low).toBeGreaterThan(0)
			expect(r.range.high).toBeGreaterThan(r.range.low)
		}
	})
})
```

**Step 2: Run tests to verify pass**

Run: `cd /opt/data/domaineat && npx vitest run tests/unit/appraise.spec.ts`
Expected: all tests pass

**Step 3: Commit**

```bash
git add tests/unit/appraise.spec.ts
git commit -m "test: add unit tests for domain appraisal scoring engine"
```

---

## Phase 2: Tier 1 UI Integration

### Task 5: Add appraisal badge to DomainLookupCard

**Objective:** Show the grade badge on every search result card.

**Files:**
- Modify: `src/components/DomainLookupCard.vue`

**Step 1: Add appraisal prop and grade badge**

Add `import { appraise } from '@/lib/appraise'` and compute the appraisal from the domain prop. Add a grade badge next to the domain name, colored by grade (A+/A = green, B = blue, C = yellow, D/F = gray/red).

**Step 2: Run full test suite**

Run: `cd /opt/data/domaineat && npx vitest run`
Expected: 216+ tests pass (no regressions)

**Step 3: Commit**

```bash
git add src/components/DomainLookupCard.vue
git commit -m "feat: show appraisal grade badge on lookup cards"
```

---

### Task 6: Add appraisal breakdown to DomainLookupPanel

**Objective:** Show the full appraisal breakdown (grade, range, 5 signal bars) on the validate/detail view.

**Files:**
- Modify: `src/components/DomainLookupPanel.vue`

**Step 1: Add appraisal section below validate result**

When `store.validateResult` is set, compute `appraise(validateResult.domain)` and display:
- Large grade badge (A+/A/B/C/D/F) with color
- Price range: `$1,000 – $50,000`
- 5 signal bars — each shows label + score with pass/fail coloring
- "Get Market Appraisal" button for Tier 2 (disabled placeholder for now)

**Step 2: Run full test suite**

Run: `cd /opt/data/domaineat && npx vitest run`
Expected: all tests pass

**Step 3: Commit**

```bash
git add src/components/DomainLookupPanel.vue
git commit -m "feat: add appraisal breakdown to validate view"
```

---

### Task 7: Add appraisal grade column to table/list view

**Objective:** Show the grade badge in the table view of search results.

**Files:**
- Modify: `src/components/DomainLookupPanel.vue`

**Step 1: Add grade column to the table**

Add a "Value" column between "Status" and "Registrar" that shows the grade badge for each result.

**Step 2: Run full test suite**

Run: `cd /opt/data/domaineat && npx vitest run`
Expected: all tests pass

**Step 3: Commit**

```bash
git add src/components/DomainLookupPanel.vue
git commit -m "feat: add appraisal grade column to search table view"
```

---

## Phase 3: Tier 2 — Backend Enhanced Appraisal

### Task 8: Add `/api/appraise` endpoint to Hono backend

**Objective:** Create a server-side endpoint that returns enhanced appraisal data (comparable sales, search volume, external appraisal).

**Files:**
- Modify: `api/app.ts`
- Modify: `api/auth.ts` (add `appraiseDaily` to TIER_LIMITS if desired, or reuse rdapDaily)
- Modify: `api/rate-limit.ts` (add appraisal rate limit)

**Step 1: Add the `/api/appraise` route**

New public route (like `/api/validate`) with RDAP rate limiting. It accepts `?domain=example.com` and returns:

```json
{
  "status": "ok",
  "domain": "example.com",
  "tier1": { ... DomainAppraisal ... },
  "comparableSales": [],
  "searchVolume": null,
  "externalAppraisal": null
}
```

For now, comparable sales and search volume return empty/null (placeholder for future API integrations). The endpoint still provides value because it re-validates the domain server-side and establishes the API contract.

**Step 2: Add to PUBLIC_PATHS in `api/app.ts`**

Add `'/api/appraise'` to the `PUBLIC_PATHS` array.

**Step 3: Apply rate limiting**

Add `rdapRateLimit()` middleware to the `/api/appraise` route — it reuses the existing RDAP daily quota.

**Step 4: Commit**

```bash
git add api/app.ts api/rate-limit.ts api/auth.ts
git commit -m "feat: add /api/appraise endpoint with rate limiting"
```

---

### Task 9: Write API tests for `/api/appraise`

**Objective:** Test the new endpoint with mocked dependencies.

**Files:**
- Create: `tests/api/appraise-routes.spec.ts`

**Step 1: Write tests**

Following the pattern in `tests/api/domain-routes.spec.ts`:
- Test 200 response with valid domain
- Test 400 response with missing domain param
- Test 429 rate limit exceeded
- Test public access (no auth required)
- Test authenticated access with quota tracking

**Step 2: Run all tests**

Run: `cd /opt/data/domaineat && npx vitest run`
Expected: all tests pass

**Step 3: Commit**

```bash
git add tests/api/appraise-routes.spec.ts
git commit -m "test: add API tests for /api/appraise endpoint"
```

---

### Task 10: Wire Tier 2 into the lookup store

**Objective:** Add `enhancedAppraisal` state and `fetchEnhancedAppraisal()` action to the lookup store.

**Files:**
- Modify: `src/stores/lookup.ts`
- Modify: `src/types/index.ts` (if needed)

**Step 1: Add state and action**

Add:
- `enhancedAppraisal: ref<EnhancedAppraisal | null>(null)`
- `enhancedLoading: ref(false)`
- `fetchEnhancedAppraisal(domain: string)` — calls `/api/appraise?domain=X`, respects cache, updates state

**Step 2: Add cache integration**

Cache key: `appraise:domain` with same 5-min TTL.

**Step 3: Commit**

```bash
git add src/stores/lookup.ts
git commit -m "feat: add enhanced appraisal action to lookup store"
```

---

### Task 11: Add "Get Market Appraisal" button to UI

**Objective:** Wire the Tier 2 button to call `fetchEnhancedAppraisal()` and display results.

**Files:**
- Modify: `src/components/DomainLookupPanel.vue`

**Step 1: Add button and results section**

When the user clicks "Get Market Appraisal":
- Call `store.fetchEnhancedAppraisal(domain)`
- Show loading spinner during request
- On success, show comparable sales list, search volume, and external appraisal below the Tier 1 breakdown
- If cached, show the ⚡ badge

**Step 2: Run full test suite**

Run: `cd /opt/data/domaineat && npx vitest run`
Expected: all tests pass

**Step 3: Commit**

```bash
git add src/components/DomainLookupPanel.vue
git commit -m "feat: add market appraisal button with enhanced results"
```

---

### Task 12: Update lookup store tests for enhanced appraisal

**Objective:** Test the new store action and cache behavior.

**Files:**
- Modify: `tests/unit/lookup-store.spec.ts`

**Step 1: Add tests**

- Test `fetchEnhancedAppraisal` calls API and sets state
- Test cache hit skips API
- Test rate limit error handling

**Step 2: Run all tests**

Run: `cd /opt/data/domaineat && npx vitest run`
Expected: all tests pass

**Step 3: Commit**

```bash
git add tests/unit/lookup-store.spec.ts
git commit -m "test: add enhanced appraisal tests to lookup store"
```

---

## Phase 4: Testing, CI/CD, and Deployment

### Task 13: Update router-module test for route count

**Objective:** The router test tracks named route count — verify it still passes (no new routes added to router).

**Files:**
- Read: `tests/unit/router-module.spec.ts`

**Step 1: Check if the test needs updating**

No new frontend routes are added by this feature (appraisal is embedded in existing views). Run the test to confirm.

Run: `cd /opt/data/domaineat && npx vitest run tests/unit/router-module.spec.ts`
Expected: all pass

---

### Task 14: Update auth-middleware test for new public path

**Objective:** The auth-middleware test tracks PUBLIC_PATHS — add `/api/appraise` assertion.

**Files:**
- Modify: `tests/api/auth-middleware.spec.ts`

**Step 1: Add test for `/api/appraise` being a public path**

Add an assertion that `/api/appraise` is accessible without auth (returns 200, not 401).

**Step 2: Run all tests**

Run: `cd /opt/data/domaineat && npx vitest run`
Expected: all tests pass

**Step 3: Commit**

```bash
git add tests/api/auth-middleware.spec.ts
git commit -m "test: verify /api/appraise is a public route"
```

---

### Task 15: Full type-check, build, and deploy

**Objective:** Ensure everything compiles, tests pass, and the app deploys successfully.

**Step 1: Type-check**

Run: `cd /opt/data/domaineat && npx vue-tsc --noEmit`
Expected: no errors

**Step 2: Run full test suite**

Run: `cd /opt/data/domaineat && npx vitest run`
Expected: all tests pass (220+)

**Step 3: Build**

Run: `cd /opt/data/domaineat && node node_modules/vite/bin/vite.js build`
Expected: successful build, no errors

**Step 4: Check disk space**

Run: `df -h /opt/data`
Expected: >50M free

**Step 5: Push to GitHub**

```bash
cd /opt/data/domaineat && rm -rf dist && git push origin master
```

**Step 6: Verify CI passes on GitHub**

The `.github/workflows/ci.yml` runs `npm test` and `npm run build` on push to master. Check that it passes.

**Step 7: Verify Netlify deployment**

The Netlify auto-deploy should pick up the push and deploy. Verify at `https://domaineat.netlify.app/search`.

---

### Task 16: Update AGENTS.md

**Objective:** Document the new feature in the project's AI agent guidelines.

**Files:**
- Modify: `AGENTS.md`

**Step 1: Add appraisal feature section**

Document:
- New types: `DomainAppraisal`, `EnhancedAppraisal`
- New files: `src/lib/appraise.ts`, `src/lib/tld-prestige.ts`
- New API endpoint: `GET /api/appraise?domain=X`
- New store state: `enhancedAppraisal`, `enhancedLoading`
- Test files: `tests/unit/appraise.spec.ts`, `tests/api/appraise-routes.spec.ts`

**Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "docs: update AGENTS.md with appraisal feature"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1: Core Engine | 1–4 | Types, TLD map, scoring engine, unit tests |
| 2: Tier 1 UI | 5–7 | Grade badge on cards, breakdown on validate, table column |
| 3: Tier 2 Backend | 8–12 | API endpoint, API tests, store wiring, UI button |
| 4: CI/CD | 13–16 | Router/auth test updates, full build, deploy, docs |

**Total: 16 tasks, ~4 phases**

**Key design decisions:**
- Tier 1 is pure client-side — zero API cost, instant, shown automatically
- Tier 2 reuses RDAP rate limit quota — no separate quota needed
- Dictionary is a small embedded set (~100 words) — no external API dependency
- Grade + range format — more honest than a single number
- All new code follows existing patterns (Pinia store, Hono routes, Vitest tests)
