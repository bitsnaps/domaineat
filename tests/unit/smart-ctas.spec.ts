/**
 * Tests for smart CTAs — contextual primary actions per domain state.
 * TDD RED phase: defines expected behavior before implementation.
 */
import { describe, it, expect } from 'vitest'
import { getSmartCta, type SmartCta } from '@/lib/smart-ctas'
import { appraise } from '@/lib/appraise'
import type { Domain } from '@/types'

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

const NOW = new Date('2026-01-01T00:00:00Z')

function daysFromNow(days: number): string {
	const d = new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000)
	return d.toISOString().slice(0, 10)
}

// ─── Register Now (wishlist + available) ────────────────────────────

describe('getSmartCta — Register Now', () => {
	it('returns Register Now for available wishlist domain', () => {
		const cta = getSmartCta({
			domain: makeDomain(),
			appraisal: appraise('example.com'),
			available: true,
			isWishlist: true,
			now: NOW,
		})
		expect(cta.key).toBe('register_now')
		expect(cta.label).toBe('Register Now')
		expect(cta.icon).toBe('bi-cart-check')
		expect(cta.variant).toBe('success')
	})
})

// ─── Renew (expiring) ───────────────────────────────────────────────

describe('getSmartCta — Renew', () => {
	it('returns Renew for domain expiring within 30 days', () => {
		const cta = getSmartCta({
			domain: makeDomain({ expiry_date: daysFromNow(10) }),
			appraisal: appraise('example.com'),
			now: NOW,
		})
		expect(cta.key).toBe('renew')
		expect(cta.label).toBe('Renew')
		expect(cta.icon).toBe('bi-arrow-repeat')
		expect(cta.variant).toBe('warning')
	})

	it('returns Renew for already expired domain', () => {
		const cta = getSmartCta({
			domain: makeDomain({ expiry_date: daysFromNow(-5) }),
			appraisal: appraise('example.com'),
			now: NOW,
		})
		expect(cta.key).toBe('renew')
	})
})

// ─── Find Prospects (high value, no prospects) ──────────────────────

describe('getSmartCta — Find Prospects', () => {
	it('returns Find Prospects for high-value domain with no prospects', () => {
		const cta = getSmartCta({
			domain: makeDomain({ domain_name: 'bank.com' }),
			appraisal: appraise('bank.com'), // A+ grade
			prospectCount: 0,
			now: NOW,
		})
		expect(cta.key).toBe('find_prospects')
		expect(cta.label).toBe('Find Prospects')
		expect(cta.icon).toBe('bi-search')
		expect(cta.variant).toBe('primary')
	})

	it('does NOT return Find Prospects if domain already has prospects', () => {
		const cta = getSmartCta({
			domain: makeDomain({ domain_name: 'bank.com' }),
			appraisal: appraise('bank.com'),
			prospectCount: 3,
			now: NOW,
		})
		expect(cta.key).not.toBe('find_prospects')
	})
})

// ─── Start Outreach (has prospects, none contacted) ─────────────────

describe('getSmartCta — Start Outreach', () => {
	it('returns Start Outreach for domain with uncontacted prospects', () => {
		const cta = getSmartCta({
			domain: makeDomain({ domain_name: 'bank.com' }),
			appraisal: appraise('bank.com'),
			prospectCount: 3,
			uncontactedProspects: true,
			now: NOW,
		})
		expect(cta.key).toBe('start_outreach')
		expect(cta.label).toBe('Start Outreach')
		expect(cta.icon).toBe('bi-send')
		expect(cta.variant).toBe('primary')
	})

	it('returns Start Outreach even for non-high-value domain with prospects', () => {
		const cta = getSmartCta({
			domain: makeDomain(),
			appraisal: appraise('example.com'),
			prospectCount: 2,
			uncontactedProspects: true,
			now: NOW,
		})
		expect(cta.key).toBe('start_outreach')
	})
})

// ─── View Prospects (has prospects, some contacted) ─────────────────

describe('getSmartCta — View Prospects', () => {
	it('returns View Prospects when all prospects are contacted', () => {
		const cta = getSmartCta({
			domain: makeDomain({ domain_name: 'bank.com' }),
			appraisal: appraise('bank.com'),
			prospectCount: 3,
			uncontactedProspects: false,
			now: NOW,
		})
		expect(cta.key).toBe('view_prospects')
		expect(cta.label).toBe('View Prospects')
		expect(cta.icon).toBe('bi-people')
		expect(cta.variant).toBe('info')
	})
})

// ─── List for Sale (sold status) ────────────────────────────────────

describe('getSmartCta — List for Sale', () => {
	it('returns List for Sale for sold domain', () => {
		const cta = getSmartCta({
			domain: makeDomain({ status: 'sold' }),
			appraisal: appraise('example.com'),
			now: NOW,
		})
		expect(cta.key).toBe('list_for_sale')
		expect(cta.label).toBe('List for Sale')
	})
})

// ─── Manage (default fallback) ──────────────────────────────────────

describe('getSmartCta — Manage (fallback)', () => {
	it('returns Manage for a boring active domain with no special signals', () => {
		const cta = getSmartCta({
			domain: makeDomain({
				domain_name: 'mylongboringdomain123.net',
				acquisition_cost: 50,
				expiry_date: daysFromNow(365),
			}),
			appraisal: appraise('mylongboringdomain123.net'),
			prospectCount: 0,
			now: NOW,
		})
		expect(cta.key).toBe('manage')
		expect(cta.label).toBe('Manage')
		expect(cta.variant).toBe('secondary')
	})
})

// ─── Priority ordering ──────────────────────────────────────────────

describe('getSmartCta — priority ordering', () => {
	it('Renew takes priority over Find Prospects (expiring + high-value)', () => {
		const cta = getSmartCta({
			domain: makeDomain({
				domain_name: 'bank.com',
				expiry_date: daysFromNow(5),
			}),
			appraisal: appraise('bank.com'),
			prospectCount: 0,
			now: NOW,
		})
		expect(cta.key).toBe('renew')
	})

	it('Register Now takes priority over Find Prospects (available wishlist + high-value)', () => {
		const cta = getSmartCta({
			domain: makeDomain({ domain_name: 'bank.com' }),
			appraisal: appraise('bank.com'),
			available: true,
			isWishlist: true,
			prospectCount: 0,
			now: NOW,
		})
		expect(cta.key).toBe('register_now')
	})

	it('Start Outreach takes priority over Find Prospects (high-value + has prospects)', () => {
		const cta = getSmartCta({
			domain: makeDomain({ domain_name: 'bank.com' }),
			appraisal: appraise('bank.com'),
			prospectCount: 3,
			uncontactedProspects: true,
			now: NOW,
		})
		expect(cta.key).toBe('start_outreach')
	})
})

// ─── CTA structure ──────────────────────────────────────────────────

describe('getSmartCta — structure', () => {
	it('returns an object with key, label, icon, variant, and description', () => {
		const cta = getSmartCta({
			domain: makeDomain(),
			appraisal: appraise('example.com'),
			now: NOW,
		})
		expect(cta).toHaveProperty('key')
		expect(cta).toHaveProperty('label')
		expect(cta).toHaveProperty('icon')
		expect(cta).toHaveProperty('variant')
		expect(cta).toHaveProperty('description')
		expect(typeof cta.description).toBe('string')
	})
})
