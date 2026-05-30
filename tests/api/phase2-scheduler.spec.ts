/**
 * Phase 2A — Scheduler watchlist/wishlist auto-check tests (TDD)
 *
 * Tests for:
 * 1. runWatchlistCheck — checks all watchlist items, creates notifications on status change
 * 2. runWishlistCheck — checks all wishlist items, creates notifications on status change
 * 3. Integration with runAllTasks — can be triggered via 'watchlist_check' / 'wishlist_check' task names
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { signJwt } from '../../api/auth.js'

function authHeaders(extra?: Record<string, string>) {
	const token = signJwt({ userId: 1, email: 'admin@test.com', tier: 'enterprise' })
	return { Authorization: `Bearer ${token}`, ...extra }
}

// ─── Mock data helpers ──────────────────────────────────────────────

function makeWatchlistItem(data: Record<string, any>) {
	return {
		...data,
		update: data.update || vi.fn(),
		get(opts?: any) {
			const { update, get, destroy, ...rest } = this
			return rest
		},
	}
}

function makeWishlistItem(data: Record<string, any>) {
	return {
		...data,
		update: data.update || vi.fn(),
		get(opts?: any) {
			const { update, get, destroy, ...rest } = this
			return rest
		},
	}
}

// ─── Mock DB ──────────────────────────────────────────────────────────

const mockDomains: any[] = []
const mockNotifications: any[] = []
const mockWatchlist: any[] = []
const mockWishlist: any[] = []

vi.mock('../../api/models/index.js', () => ({
	sequelize: { authenticate: vi.fn() },
	User: {
		findByPk: vi.fn(async (id: number | string) => {
			if (String(id) === '1') return { id: 1, email: 'admin@test.com', tier: 'enterprise', daily_ai_calls: 5, update: vi.fn() }
			return null
		}),
		findOne: vi.fn(async () => null),
		update: vi.fn(async () => [1]),
	},
	Domain: {
		findAll: vi.fn(async (opts?: any) => {
			if (opts?.where?.status === 'active') return mockDomains.filter(d => d.status === 'active')
			return mockDomains
		}),
		count: vi.fn(async () => mockDomains.length),
		update: vi.fn(async () => [1]),
	},
	Ledger: { findAll: vi.fn(async () => []), create: vi.fn() },
	Prospect: { findAll: vi.fn(async () => []), findByPk: vi.fn(async () => null), create: vi.fn() },
	Notification: {
		findAll: vi.fn(async (opts?: any) => {
			return mockNotifications.filter(n => {
				if (opts?.where?.domain_id !== undefined && n.domain_id !== opts.where.domain_id) return false
				if (opts?.where?.type && n.type !== opts.where.type) return false
				if (opts?.where?.dismissed !== undefined && n.dismissed !== opts.where.dismissed) return false
				return true
			})
		}),
		findByPk: vi.fn(async (id: number) => mockNotifications.find(n => n.id === id) || null),
		create: vi.fn(async (data: any) => {
			const n = { id: mockNotifications.length + 1, ...data }
			mockNotifications.push(n)
			return n
		}),
	},
	Watchlist: {
		findAll: vi.fn(async (opts?: any) => {
			if (opts?.where?.user_id) return mockWatchlist.filter(w => w.user_id === opts.where.user_id)
			return mockWatchlist
		}),
		count: vi.fn(async () => mockWatchlist.length),
	},
	Wishlist: {
		findAll: vi.fn(async (opts?: any) => {
			if (opts?.where?.user_id) return mockWishlist.filter(w => w.user_id === opts.where.user_id)
			return mockWishlist
		}),
		count: vi.fn(async () => mockWishlist.length),
	},
}))

vi.mock('bcryptjs', () => ({
	default: {
		hash: vi.fn(async () => '$2a$10$hashedpassword'),
		compare: vi.fn(async () => true),
	},
}))

// Mock domain-analysis for RDAP lookups
vi.mock('../../api/domain-analysis.js', () => ({
	rdapLookup: vi.fn(async (domain: string) => {
		if (domain.includes('available')) return null
		return { registrar: 'GoDaddy', expiryDate: '2026-01-01', nameservers: [], status: [] }
	}),
}))

import { runWatchlistCheck, runWishlistCheck, runAllTasks } from '../../api/scheduler.js'
import { app } from '../../api/app'

describe('Phase 2A — Scheduler Watchlist/Wishlist Auto-Check', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockDomains.length = 0
		mockNotifications.length = 0
		mockWatchlist.length = 0
		mockWishlist.length = 0
	})

	// ─── 1. runWatchlistCheck ─────────────────────────────────────

	describe('runWatchlistCheck', () => {
		it('returns summary with checked count', async () => {
			mockWatchlist.push(
				makeWatchlistItem({ id: 1, user_id: 1, domain_name: 'test.com', available: null }),
				makeWatchlistItem({ id: 2, user_id: 2, domain_name: 'other.com', available: null }),
			)
			const result = await runWatchlistCheck()
			expect(result).toHaveProperty('checked')
			expect(result).toHaveProperty('notifications')
			expect(result.checked).toBe(2)
		})

		it('returns zero counts when no items exist', async () => {
			const result = await runWatchlistCheck()
			expect(result.checked).toBe(0)
			expect(result.notifications).toBe(0)
		})

		it('creates notifications for status changes', async () => {
			mockWatchlist.push(
				makeWatchlistItem({ id: 10, user_id: 1, domain_name: 'available.com', available: false }),
			)
			const result = await runWatchlistCheck()
			expect(result.checked).toBe(1)
			expect(result.notifications).toBeGreaterThanOrEqual(1)
		})
	})

	// ─── 2. runWishlistCheck ──────────────────────────────────────

	describe('runWishlistCheck', () => {
		it('returns summary with checked count', async () => {
			mockWishlist.push(
				makeWishlistItem({ id: 1, user_id: 1, domain_name: 'wish.com', available: null }),
			)
			const result = await runWishlistCheck()
			expect(result).toHaveProperty('checked')
			expect(result).toHaveProperty('notifications')
			expect(result.checked).toBe(1)
		})

		it('returns zero counts when no items exist', async () => {
			const result = await runWishlistCheck()
			expect(result.checked).toBe(0)
			expect(result.notifications).toBe(0)
		})
	})

	// ─── 3. Integration with runAllTasks ──────────────────────────

	describe('runAllTasks with watchlist_check / wishlist_check', () => {
		it('includes watchlistCheck when task "watchlist_check" is specified', async () => {
			const result = await runAllTasks(['watchlist_check'])
			expect(result).toHaveProperty('watchlistCheck')
		})

		it('includes wishlistCheck when task "wishlist_check" is specified', async () => {
			const result = await runAllTasks(['wishlist_check'])
			expect(result).toHaveProperty('wishlistCheck')
		})

		it('does not include watchlist/wishlist checks when not in task list', async () => {
			const result = await runAllTasks(['expiration'])
			expect(result).not.toHaveProperty('watchlistCheck')
			expect(result).not.toHaveProperty('wishlistCheck')
		})

		it('includes watchlist/wishlist checks when running all tasks', async () => {
			const result = await runAllTasks()
			expect(result).toHaveProperty('watchlistCheck')
			expect(result).toHaveProperty('wishlistCheck')
		})
	})

	// ─── 4. Scheduler API endpoint integration ────────────────────

	describe('POST /api/scheduler/run with watchlist_check task', () => {
		it('runs watchlist_check task and returns result', async () => {
			mockWatchlist.push(
				makeWatchlistItem({ id: 1, user_id: 1, domain_name: 'test.com', available: null }),
			)
			const res = await app.request('/api/scheduler/run', {
				method: 'POST',
				headers: authHeaders({ 'Content-Type': 'application/json' }),
				body: JSON.stringify({ tasks: ['watchlist_check'] }),
			})
			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data).toHaveProperty('watchlistCheck')
		})
	})
})
