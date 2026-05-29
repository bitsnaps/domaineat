/**
 * appraise.ts — Client-side domain appraisal scoring engine.
 *
 * Tier 1: instant, zero API cost. Produces a letter grade (A+–F)
 * and a dollar range from 5 intrinsic signals.
 *
 * Signals: length, TLD prestige, dictionary match, brandability, cleanliness.
 */
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
	const labels = [
		'(lowest)', '(low)', '(below avg)', '(fair)', '(average)',
		'(good)', '(strong)', '(very good)', '(excellent)', '(premium)', '(top tier)',
	]
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
	'crypto', 'cyber', 'digital', 'smart', 'logic', 'mesh', 'grid',
	// Lifestyle & social
	'fit', 'fun', 'food', 'love', 'care', 'home', 'life', 'play', 'art', 'style',
	'chat', 'meet', 'date', 'club', 'team', 'group', 'social', 'live', 'real', 'true',
	// Action words
	'go', 'get', 'try', 'use', 'run', 'fly', 'do', 'make', 'send', 'keep',
	'find', 'help', 'save', 'grow', 'start', 'open', 'move', 'work', 'plan', 'build',
	'day', 'time', 'way', 'out', 'now', 'one', 'two', 'set', 'put', 'let',
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
			result.push(remaining[0] ?? '')
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

	// Vowel/consonant ratio — pronounceable names have ~30-70% vowels
	// 'y' counts as vowel, so 3-letter words like "pay" (p,a,y → 2/3=0.67) are still pronounceable
	const vowels = (lower.match(/[aeiouy]/g) || []).length
	const vowelRatio = len > 0 ? vowels / len : 0
	if (len >= 3 && vowelRatio >= 0.25 && vowelRatio <= 0.7) {
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
	const sld = (parts.length > 1 ? parts.slice(0, -1).join('.') : parts[0]) ?? domain
	const tld = (parts.length > 1 ? parts[parts.length - 1] : 'com') ?? 'com'

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
