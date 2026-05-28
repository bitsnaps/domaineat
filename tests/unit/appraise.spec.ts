/**
 * Tests for the domain appraisal scoring engine.
 * TDD RED phase: defines expected behavior before implementation.
 */
import { describe, it, expect } from 'vitest'

// These imports will fail until the modules are created
import { appraise } from '@/lib/appraise'
import { getTldPrestige } from '@/lib/tld-prestige'

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

	it('gives D or F for long random string with numbers', () => {
		const result = appraise('xkqz123xyz.net')
		expect(['D', 'F']).toContain(result.grade)
		expect(result.signals.clean.score).toBeLessThanOrEqual(3) // has numbers
		expect(result.signals.dictionary.score).toBeLessThanOrEqual(1) // not a word
	})

	// ─── Length signal ────────────────────────────────────────────────

	it('scores 2-char SLD as premium (10)', () => {
		expect(appraise('go.com').signals.length.score).toBe(10)
	})

	it('scores 3-char SLD as excellent (9)', () => {
		expect(appraise('pay.com').signals.length.score).toBe(9)
	})

	it('scores 6-char SLD as fair (6)', () => {
		expect(appraise('domain.com').signals.length.score).toBe(6)
	})

	it('scores 15+ char SLD as very long (1)', () => {
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

	it('returns all 5 signals with valid scores', () => {
		const result = appraise('shop.com')
		expect(result.signals.length.score).toBeGreaterThanOrEqual(0)
		expect(result.signals.length.score).toBeLessThanOrEqual(10)
		expect(result.signals.tld.score).toBeGreaterThanOrEqual(0)
		expect(result.signals.tld.score).toBeLessThanOrEqual(10)
		expect(result.signals.dictionary.score).toBeGreaterThanOrEqual(0)
		expect(result.signals.dictionary.score).toBeLessThanOrEqual(10)
		expect(result.signals.brandable.score).toBeGreaterThanOrEqual(0)
		expect(result.signals.brandable.score).toBeLessThanOrEqual(10)
		expect(result.signals.clean.score).toBeGreaterThanOrEqual(0)
		expect(result.signals.clean.score).toBeLessThanOrEqual(10)
	})
})

describe('getTldPrestige', () => {
	it('returns 10 for .com', () => {
		expect(getTldPrestige('com')).toBe(10)
	})

	it('returns 8 for .ai', () => {
		expect(getTldPrestige('ai')).toBe(8)
	})

	it('returns default 2 for unknown TLD', () => {
		expect(getTldPrestige('zz')).toBe(2)
	})

	it('is case-insensitive', () => {
		expect(getTldPrestige('COM')).toBe(10)
		expect(getTldPrestige('Ai')).toBe(8)
	})
})
