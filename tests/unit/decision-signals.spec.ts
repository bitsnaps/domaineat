/**
 * Tests for decision signals — badges that indicate domain state at a glance.
 * TDD RED phase: defines expected behavior before implementation.
 */
import { describe, it, expect } from 'vitest'
import { getDecisionSignals, type DecisionSignal } from '@/lib/decision-signals'
import { appraise } from '@/lib/appraise'
import type { Domain, AppraisalGrade } from '@/types'

// ─── Helpers ────────────────────────────────────────────────────────

function makeDomain(overrides: Partial<Domain> = {}): Domain {
	return {
		id: 1,
		user_id: 1,
		domain_name: 'example.com',
		registrar: 'GoDaddy',
		acquisition_date: '2025-01-01',
		expiry_date: '2026-06-15',
		acquisition_cost: 100,
		renewal_cost: 15,
		nameservers: null,
		status: 'active',
		appraisal_grade: null,
		tags: [],
		created_at: '2025-01-01T00:00:00Z',
		updated_at: '2025-01-01T00:00:00Z',
		...overrides,
	}
}

// Fixed "now" for deterministic expiry tests: 2026-01-01
const NOW = new Date('2026-01-01T00:00:00Z')

function daysFromNow(days: number): string {
	const d = new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000)
	return d.toISOString().slice(0, 10)
}

// ─── Hot Buy ────────────────────────────────────────────────────────

describe('getDecisionSignals — Hot Buy', () => {
	it('flags Hot Buy for high-grade available domain (via lookup context)', () => {
		// Hot Buy: available + grade not F + low range >= $500
		const appraisal = appraise('bank.com') // A+ grade
		const signals = getDecisionSignals({
			domain: makeDomain({ domain_name: 'bank.com' }),
			appraisal,
			available: true,
			now: NOW,
		})
		expect(signals).toContainEqual(
			expect.objectContaining({ key: 'hot_buy', label: 'Hot Buy' })
		)
	})

	it('does NOT flag Hot Buy for taken domains', () => {
		const appraisal = appraise('bank.com')
		const signals = getDecisionSignals({
			domain: makeDomain({ domain_name: 'bank.com' }),
			appraisal,
			available: false,
			now: NOW,
		})
		expect(signals.find(s => s.key === 'hot_buy')).toBeUndefined()
	})

	it('does NOT flag Hot Buy for F-graded available domains', () => {
		const appraisal = appraise('xkqz123xyz.net') // F/D grade
		const signals = getDecisionSignals({
			domain: makeDomain({ domain_name: 'xkqz123xyz.net' }),
			appraisal,
			available: true,
			now: NOW,
		})
		expect(signals.find(s => s.key === 'hot_buy')).toBeUndefined()
	})
})

// ─── Expiring Watch ─────────────────────────────────────────────────

describe('getDecisionSignals — Expiring Watch', () => {
	it('flags Expiring Watch when domain expires within 30 days', () => {
		const signals = getDecisionSignals({
			domain: makeDomain({ expiry_date: daysFromNow(15) }),
			appraisal: appraise('example.com'),
			now: NOW,
		})
		expect(signals).toContainEqual(
			expect.objectContaining({ key: 'expiring_watch', label: 'Expiring Watch' })
		)
	})

	it('flags Expiring Watch when domain expires within 30 days (boundary: 30)', () => {
		const signals = getDecisionSignals({
			domain: makeDomain({ expiry_date: daysFromNow(30) }),
			appraisal: appraise('example.com'),
			now: NOW,
		})
		expect(signals).toContainEqual(
			expect.objectContaining({ key: 'expiring_watch', label: 'Expiring Watch' })
		)
	})

	it('does NOT flag Expiring Watch when domain expires in 31+ days', () => {
		const signals = getDecisionSignals({
			domain: makeDomain({ expiry_date: daysFromNow(31) }),
			appraisal: appraise('example.com'),
			now: NOW,
		})
		expect(signals.find(s => s.key === 'expiring_watch')).toBeUndefined()
	})

	it('flags Expiring Watch for already expired domains', () => {
		const signals = getDecisionSignals({
			domain: makeDomain({ expiry_date: daysFromNow(-5) }),
			appraisal: appraise('example.com'),
			now: NOW,
		})
		expect(signals).toContainEqual(
			expect.objectContaining({ key: 'expiring_watch', label: 'Expiring Watch' })
		)
	})
})

// ─── Undervalued ────────────────────────────────────────────────────

describe('getDecisionSignals — Undervalued', () => {
	it('flags Undervalued when appraisal low > 2× acquisition cost', () => {
		// 'pay.com' is A+ grade, low range $10K
		const signals = getDecisionSignals({
			domain: makeDomain({
				domain_name: 'pay.com',
				acquisition_cost: 500, // acquired for $500, worth $10K+
			}),
			appraisal: appraise('pay.com'),
			now: NOW,
		})
		expect(signals).toContainEqual(
			expect.objectContaining({ key: 'undervalued', label: 'Undervalued' })
		)
	})

	it('does NOT flag Undervalued when acquisition cost >= appraisal low', () => {
		const signals = getDecisionSignals({
			domain: makeDomain({
				domain_name: 'pay.com',
				acquisition_cost: 50000, // acquired for $50K, worth $10K–$1M
			}),
			appraisal: appraise('pay.com'),
			now: NOW,
		})
		expect(signals.find(s => s.key === 'undervalued')).toBeUndefined()
	})

	it('does NOT flag Undervalued when appraisal low <= 2× acquisition cost', () => {
		// Use a domain where acquisition_cost is high enough that
		// appraisal.range.low <= 2 * acquisition_cost
		const appraisal = appraise('example.com')
		// Set acquisition_cost to more than half the appraisal low
		const acquisitionCost = Math.ceil(appraisal.range.low / 2) + 1
		const signals = getDecisionSignals({
			domain: makeDomain({
				domain_name: 'example.com',
				acquisition_cost: acquisitionCost,
			}),
			appraisal,
			now: NOW,
		})
		expect(signals.find(s => s.key === 'undervalued')).toBeUndefined()
	})
})

// ─── Prospect Ready ─────────────────────────────────────────────────

describe('getDecisionSignals — Prospect Ready', () => {
	it('flags Prospect Ready when domain has prospects', () => {
		const signals = getDecisionSignals({
			domain: makeDomain(),
			appraisal: appraise('example.com'),
			prospectCount: 3,
			now: NOW,
		})
		expect(signals).toContainEqual(
			expect.objectContaining({ key: 'prospect_ready', label: 'Prospect Ready' })
		)
	})

	it('does NOT flag Prospect Ready when domain has 0 prospects', () => {
		const signals = getDecisionSignals({
			domain: makeDomain(),
			appraisal: appraise('example.com'),
			prospectCount: 0,
			now: NOW,
		})
		expect(signals.find(s => s.key === 'prospect_ready')).toBeUndefined()
	})
})

// ─── Sold ───────────────────────────────────────────────────────────

describe('getDecisionSignals — Sold', () => {
	it('flags Sold when domain status is sold', () => {
		const signals = getDecisionSignals({
			domain: makeDomain({ status: 'sold' }),
			appraisal: appraise('example.com'),
			now: NOW,
		})
		expect(signals).toContainEqual(
			expect.objectContaining({ key: 'sold', label: 'Sold' })
		)
	})

	it('does NOT flag Sold for active domains', () => {
		const signals = getDecisionSignals({
			domain: makeDomain({ status: 'active' }),
			appraisal: appraise('example.com'),
			now: NOW,
		})
		expect(signals.find(s => s.key === 'sold')).toBeUndefined()
	})
})

// ─── Multiple signals ───────────────────────────────────────────────

describe('getDecisionSignals — combinations', () => {
	it('can return multiple signals simultaneously', () => {
		// Expiring + Undervalued + Prospect Ready
		const signals = getDecisionSignals({
			domain: makeDomain({
				domain_name: 'pay.com',
				acquisition_cost: 500,
				expiry_date: daysFromNow(10),
			}),
			appraisal: appraise('pay.com'),
			prospectCount: 2,
			now: NOW,
		})
		const keys = signals.map(s => s.key)
		expect(keys).toContain('expiring_watch')
		expect(keys).toContain('undervalued')
		expect(keys).toContain('prospect_ready')
	})

	it('returns empty array for boring domain with no signals', () => {
		const signals = getDecisionSignals({
			domain: makeDomain({
				domain_name: 'mylongboringdomain123.net',
				acquisition_cost: 50,
				expiry_date: daysFromNow(365),
			}),
			appraisal: appraise('mylongboringdomain123.net'),
			prospectCount: 0,
			now: NOW,
		})
		expect(signals).toEqual([])
	})
})

// ─── Signal structure ───────────────────────────────────────────────

describe('getDecisionSignals — signal structure', () => {
	it('each signal has key, label, icon, and variant', () => {
		const signals = getDecisionSignals({
			domain: makeDomain({ status: 'sold' }),
			appraisal: appraise('example.com'),
			now: NOW,
		})
		for (const signal of signals) {
			expect(signal).toHaveProperty('key')
			expect(signal).toHaveProperty('label')
			expect(signal).toHaveProperty('icon')
			expect(signal).toHaveProperty('variant')
			expect(typeof signal.key).toBe('string')
			expect(typeof signal.label).toBe('string')
			expect(typeof signal.icon).toBe('string')
			expect(typeof signal.variant).toBe('string')
		}
	})
})
