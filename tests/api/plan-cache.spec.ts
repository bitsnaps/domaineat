/**
 * Plan cache tests — in-memory TTL cache for DB-backed tier limits.
 *
 * TDD RED phase: these tests define expected behavior before implementation.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Plan model
const mockPlans: any[] = []

vi.mock('../../api/models/index.js', () => ({
	sequelize: { authenticate: vi.fn() },
	User: { findByPk: vi.fn(async () => null), findOne: vi.fn(async () => null), count: vi.fn(async () => 0) },
	Domain: { findAll: vi.fn(async () => []), count: vi.fn(async () => 0), findOne: vi.fn(async () => null) },
	Ledger: { findAll: vi.fn(async () => []), findByPk: vi.fn(async () => null) },
	Prospect: { findAll: vi.fn(async () => []), findByPk: vi.fn(async () => null) },
	Notification: { findAll: vi.fn(async () => []) },
	Watchlist: { findAll: vi.fn(async () => []), count: vi.fn(async () => 0) },
	Wishlist: { findAll: vi.fn(async () => []), count: vi.fn(async () => 0) },
	DomainTag: { findAll: vi.fn(async () => []) },
	Plan: {
		findAll: vi.fn(async () => [...mockPlans]),
		findByPk: vi.fn(async (tier: string) => mockPlans.find((p) => p.tier === tier) || null),
		findOne: vi.fn(async (opts: any) => {
			if (opts?.where?.tier) return mockPlans.find((p) => p.tier === opts.where.tier) || null
			return null
		}),
	},
}))

vi.mock('bcryptjs', () => ({
	default: { hash: vi.fn(async () => '$2a$10$hashed'), compare: vi.fn(async () => true) },
}))

describe('Plan cache', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.resetModules()
		mockPlans.length = 0
		// Seed default plans
		mockPlans.push(
			{ tier: 'free', name: 'Free', price_monthly: 0, price_yearly: 0, domains: 10, rdap_daily: 10, ai_daily: 5, watchlist: 10, wishlist: 5, features: '[]', active: true, update: vi.fn(), toJSON() { return { ...this } } },
			{ tier: 'premium', name: 'Premium', price_monthly: 29.99, price_yearly: 299.99, domains: 1000, rdap_daily: 100, ai_daily: 100, watchlist: 100, wishlist: 50, features: '[]', active: true, update: vi.fn(), toJSON() { return { ...this } } },
			{ tier: 'enterprise', name: 'Enterprise', price_monthly: 99.99, price_yearly: 999.99, domains: -1, rdap_daily: -1, ai_daily: -1, watchlist: -1, wishlist: -1, features: '[]', active: true, update: vi.fn(), toJSON() { return { ...this } } },
		)
	})

	it('returns plan limits from DB on cache miss', async () => {
		const { getPlanLimits } = await import('../../api/plan-cache.js')
		const limits = await getPlanLimits('free')
		expect(limits).toEqual({ domains: 10, rdapDaily: 10, aiDaily: 5, watchlist: 10, wishlist: 5 })
	})

	it('returns cached limits on second call (cache hit)', async () => {
		const { getPlanLimits } = await import('../../api/plan-cache.js')
		await getPlanLimits('free')
		const { Plan } = await import('../../api/models/index.js')
		// Second call should use cache, not hit DB again
		await getPlanLimits('free')
		expect((Plan.findAll as any)).toHaveBeenCalledTimes(1) // only loaded once
	})

	it('converts -1 (unlimited) to Infinity', async () => {
		const { getPlanLimits } = await import('../../api/plan-cache.js')
		const limits = await getPlanLimits('enterprise')
		expect(limits.domains).toBe(Infinity)
		expect(limits.rdapDaily).toBe(Infinity)
		expect(limits.aiDaily).toBe(Infinity)
		expect(limits.watchlist).toBe(Infinity)
		expect(limits.wishlist).toBe(Infinity)
	})

	it('returns hardcoded TIER_LIMITS as fallback when Plan.findAll fails', async () => {
		const { Plan } = await import('../../api/models/index.js')
		;(Plan.findAll as any).mockRejectedValueOnce(new Error('DB down'))

		const { getPlanLimits } = await import('../../api/plan-cache.js')
		const limits = await getPlanLimits('free')
		// Should fall back to hardcoded TIER_LIMITS
		expect(limits).toEqual({ domains: 10, rdapDaily: 10, aiDaily: 5, watchlist: 10, wishlist: 5 })
	})

	it('invalidation reloads from DB', async () => {
		const { getPlanLimits, invalidatePlanCache } = await import('../../api/plan-cache.js')
		await getPlanLimits('free')
		// Change the plan data
		mockPlans[0].domains = 20
		// Invalidate cache
		invalidatePlanCache()
		// Next call should reload from DB
		const limits = await getPlanLimits('free')
		expect(limits.domains).toBe(20)
	})

	it('returns limits for premium tier', async () => {
		const { getPlanLimits } = await import('../../api/plan-cache.js')
		const limits = await getPlanLimits('premium')
		expect(limits).toEqual({ domains: 1000, rdapDaily: 100, aiDaily: 100, watchlist: 100, wishlist: 50 })
	})

	it('returns free limits for unknown tier', async () => {
		const { getPlanLimits } = await import('../../api/plan-cache.js')
		const limits = await getPlanLimits('nonexistent')
		// Should fall back to free tier
		expect(limits).toEqual({ domains: 10, rdapDaily: 10, aiDaily: 5, watchlist: 10, wishlist: 5 })
	})
})
