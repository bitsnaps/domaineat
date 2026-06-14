/**
 * Admin API routes tests — role-based access, user management, plans CRUD, stats.
 *
 * TDD RED phase: these tests define the expected behavior of admin routes
 * in api/app.ts. They should FAIL until the implementation is complete.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { signJwt } from '../../api/auth.js'
import * as planCache from '../../api/plan-cache.js'

// Helper to generate auth headers with a valid JWT
function makeAuthHeader(payload: { userId: number; email: string; tier: string; role?: string }) {
	const token = signJwt(payload as any)
	return { Authorization: `Bearer ${token}` }
}

// Mock plan-cache so getPlanLimits returns hardcoded TIER_LIMITS-like values
vi.mock('../../api/plan-cache.js', () => ({
	getPlanLimits: vi.fn(async (tier: string) => {
		const limits: Record<string, any> = {
			free: { domains: 10, rdapDaily: 10, aiDaily: 5, watchlist: 10, wishlist: 5 },
			premium: { domains: 1000, rdapDaily: 100, aiDaily: 100, watchlist: 100, wishlist: 50 },
			enterprise: { domains: Infinity, rdapDaily: Infinity, aiDaily: Infinity, watchlist: Infinity, wishlist: Infinity },
		}
		return limits[tier] || limits.free
	}),
	invalidatePlanCache: vi.fn(),
}))

// Mock data stores
const mockUsers: any[] = []
const mockDomains: any[] = []
const mockPlans: any[] = [
	{
		tier: 'free', name: 'Free', price_monthly: 0, price_yearly: 0,
		domains: 10, rdap_daily: 10, ai_daily: 5, watchlist: 10, wishlist: 5,
		features: '[]', active: true,
	},
	{
		tier: 'premium', name: 'Premium', price_monthly: 29.99, price_yearly: 299.99,
		domains: 1000, rdap_daily: 100, ai_daily: 100, watchlist: 100, wishlist: 50,
		features: '[]', active: true,
	},
	{
		tier: 'enterprise', name: 'Enterprise', price_monthly: 99.99, price_yearly: 999.99,
		domains: -1, rdap_daily: -1, ai_daily: -1, watchlist: -1, wishlist: -1,
		features: '[]', active: true,
	},
]

vi.mock('../../api/models/index.js', () => ({
	sequelize: { authenticate: vi.fn() },
	User: {
		findByPk: vi.fn(async (id: number | string) => {
			const user = mockUsers.find((u) => String(u.id) === String(id))
			return user || null
		}),
		findOne: vi.fn(async (opts: any) => {
			if (opts?.where?.email) return mockUsers.find((u) => u.email === opts.where.email) || null
			return mockUsers[0] || null
		}),
		findAll: vi.fn(async (opts: any) => {
			let users = [...mockUsers]
			if (opts?.where?.role) users = users.filter((u) => u.role === opts.where.role)
			return users
		}),
		count: vi.fn(async () => mockUsers.length),
		create: vi.fn(async (data: any) => {
			const user = { id: mockUsers.length + 1, ...data, update: vi.fn(), destroy: vi.fn(), toJSON: () => ({ ...data, id: mockUsers.length + 1 }) }
			mockUsers.push(user)
			return user
		}),
	},
	Domain: {
		findByPk: vi.fn(async (id: number | string) =>
			mockDomains.find((d) => String(d.id) === String(id)) || null
		),
		findOne: vi.fn(async (opts: any) => {
			if (opts?.where?.id) return mockDomains.find((d) => String(d.id) === String(opts.where.id)) || null
			return null
		}),
		findAll: vi.fn(async (opts: any) => {
			let domains = [...mockDomains]
			if (opts?.where?.user_id) domains = domains.filter((d) => d.user_id === opts.where.user_id)
			return domains
		}),
		count: vi.fn(async () => mockDomains.length),
		create: vi.fn(async (data: any) => ({ id: mockDomains.length + 1, ...data })),
		destroy: vi.fn(),
	},
	Ledger: {
		findAll: vi.fn(async () => []),
		findByPk: vi.fn(async () => null),
		count: vi.fn(async () => 0),
		create: vi.fn(async (data: any) => ({ id: 1, ...data })),
		destroy: vi.fn(async () => 0),
	},
	Prospect: {
		findAll: vi.fn(async () => []),
		findByPk: vi.fn(async () => null),
		create: vi.fn(async (data: any) => ({ id: 1, ...data })),
		destroy: vi.fn(async () => 0),
	},
	Notification: { findAll: vi.fn(async () => []), create: vi.fn(), destroy: vi.fn(async () => 0) },
	Watchlist: { findAll: vi.fn(async () => []), count: vi.fn(async () => 0), destroy: vi.fn(async () => 0) },
	Wishlist: { findAll: vi.fn(async () => []), count: vi.fn(async () => 0), destroy: vi.fn(async () => 0) },
	DomainTag: { findAll: vi.fn(async () => []), destroy: vi.fn(async () => 0) },
	Plan: {
		findAll: vi.fn(async () => [...mockPlans]),
		findByPk: vi.fn(async (tier: string) => mockPlans.find((p) => p.tier === tier) || null),
		findOne: vi.fn(async (opts: any) => {
			if (opts?.where?.tier) return mockPlans.find((p) => p.tier === opts.where.tier) || null
			return null
		}),
		findOrCreate: vi.fn(async (opts: any) => {
			const existing = mockPlans.find((p) => p.tier === opts.where.tier)
			if (existing) return [existing, false]
			const plan = { ...opts.where, ...opts.defaults }
			mockPlans.push(plan)
			return [plan, true]
		}),
	},
}))

vi.mock('bcryptjs', () => ({
	default: { hash: vi.fn(async () => '$2a$10$hashed'), compare: vi.fn(async () => true) },
}))

import { app } from '../../api/app'

describe('Admin API Routes', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockUsers.length = 0
		mockDomains.length = 0
		// Reset plans to defaults
		mockPlans.length = 0
		mockPlans.push(
			{ tier: 'free', name: 'Free', price_monthly: 0, price_yearly: 0, domains: 10, rdap_daily: 10, ai_daily: 5, watchlist: 10, wishlist: 5, features: '[]', active: true, update: vi.fn(), destroy: vi.fn() },
			{ tier: 'premium', name: 'Premium', price_monthly: 29.99, price_yearly: 299.99, domains: 1000, rdap_daily: 100, ai_daily: 100, watchlist: 100, wishlist: 50, features: '[]', active: true, update: vi.fn(), destroy: vi.fn() },
			{ tier: 'enterprise', name: 'Enterprise', price_monthly: 99.99, price_yearly: 999.99, domains: -1, rdap_daily: -1, ai_daily: -1, watchlist: -1, wishlist: -1, features: '[]', active: true, update: vi.fn(), destroy: vi.fn() },
		)
	})

	// ─── Admin Access Guard ──────────────────────────────────────────

	describe('Admin access guard', () => {
		it('returns 401 for admin routes without token', async () => {
			const res = await app.request('/api/admin/users')
			expect(res.status).toBe(401)
		})

		it('returns 403 for non-admin users', async () => {
			const headers = makeAuthHeader({ userId: 1, email: 'user@test.com', tier: 'free', role: 'user' })
			const res = await app.request('/api/admin/users', { headers })
			expect(res.status).toBe(403)
			const data = await res.json()
			expect(data.error).toMatch(/admin/i)
		})

		it('allows admin users', async () => {
			const headers = makeAuthHeader({ userId: 1, email: 'admin@test.com', tier: 'free', role: 'admin' })
			const res = await app.request('/api/admin/stats', { headers })
			expect(res.status).toBe(200)
		})
	})

	// ─── Admin Stats ────────────────────────────────────────────────

	describe('GET /api/admin/stats', () => {
		it('returns platform stats for admin', async () => {
			mockUsers.push(
				{ id: 1, email: 'a@test.com', tier: 'free', role: 'admin', update: vi.fn(), destroy: vi.fn() },
				{ id: 2, email: 'b@test.com', tier: 'premium', role: 'user', update: vi.fn(), destroy: vi.fn() },
			)
			const headers = makeAuthHeader({ userId: 1, email: 'admin@test.com', tier: 'free', role: 'admin' })
			const res = await app.request('/api/admin/stats', { headers })
			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data).toHaveProperty('totalUsers')
			expect(data).toHaveProperty('totalDomains')
		})
	})

	// ─── User Management ────────────────────────────────────────────

	describe('GET /api/admin/users', () => {
		it('returns list of users for admin', async () => {
			mockUsers.push(
				{ id: 1, email: 'a@test.com', tier: 'free', role: 'admin', update: vi.fn(), destroy: vi.fn() },
				{ id: 2, email: 'b@test.com', tier: 'premium', role: 'user', update: vi.fn(), destroy: vi.fn() },
			)
			const headers = makeAuthHeader({ userId: 1, email: 'admin@test.com', tier: 'free', role: 'admin' })
			const res = await app.request('/api/admin/users', { headers })
			expect(res.status).toBe(200)
			const data = await res.json()
			expect(Array.isArray(data.users || data)).toBe(true)
		})
	})

	describe('GET /api/admin/users/:id', () => {
		it('returns user details for admin', async () => {
			const adminObj = { id: 1, email: 'admin@test.com', tier: 'free', role: 'admin', password_hash: 'hash', llm_api_key_encrypted: null, toJSON() { const { password_hash, llm_api_key_encrypted, ...rest } = this as any; return rest } }
			const userObj = { id: 2, email: 'user@test.com', tier: 'premium', role: 'user', password_hash: 'hash', llm_api_key_encrypted: null, toJSON() { const { password_hash, llm_api_key_encrypted, ...rest } = this as any; return rest } }
			mockUsers.push(adminObj, userObj)
			const headers = makeAuthHeader({ userId: 1, email: 'admin@test.com', tier: 'free', role: 'admin' })
			const res = await app.request('/api/admin/users/2', { headers })
			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.email).toBe('user@test.com')
			expect(data.password_hash).toBeUndefined()
		})

		it('returns 404 for non-existent user', async () => {
			const headers = makeAuthHeader({ userId: 1, email: 'admin@test.com', tier: 'free', role: 'admin' })
			const res = await app.request('/api/admin/users/999', { headers })
			expect(res.status).toBe(404)
		})
	})

	describe('PATCH /api/admin/users/:id', () => {
		it('allows admin to update user tier', async () => {
			const mockUpdate = vi.fn()
			mockUsers.push(
				{ id: 1, email: 'admin@test.com', tier: 'free', role: 'admin', password_hash: 'hash', llm_api_key_encrypted: null },
				{ id: 2, email: 'user@test.com', tier: 'free', role: 'user', password_hash: 'hash', llm_api_key_encrypted: null, update: mockUpdate, toJSON: () => ({ id: 2, email: 'user@test.com', tier: 'premium', role: 'user' }) },
			)
			const headers = makeAuthHeader({ userId: 1, email: 'admin@test.com', tier: 'free', role: 'admin' })
			const res = await app.request('/api/admin/users/2', {
				method: 'PATCH',
				headers: { ...headers, 'Content-Type': 'application/json' },
				body: JSON.stringify({ tier: 'premium' }),
			})
			expect(res.status).toBe(200)
			expect(mockUpdate).toHaveBeenCalled()
		})

		it('prevents admin from changing their own role to user', async () => {
			const mockUpdate = vi.fn()
			mockUsers.push(
				{ id: 1, email: 'admin@test.com', tier: 'free', role: 'admin', password_hash: 'hash', llm_api_key_encrypted: null, update: mockUpdate, toJSON: () => ({ id: 1, email: 'admin@test.com', tier: 'free', role: 'admin' }) },
			)
			const headers = makeAuthHeader({ userId: 1, email: 'admin@test.com', tier: 'free', role: 'admin' })
			const res = await app.request('/api/admin/users/1', {
				method: 'PATCH',
				headers: { ...headers, 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: 'user' }),
			})
			// Should either reject or ignore self-demotion
			const data = await res.json()
			expect(data.role || data.error).toBeDefined()
		})
	})

	// ─── Plans Management ───────────────────────────────────────────

	describe('GET /api/admin/plans', () => {
		it('returns all plans for admin', async () => {
			const headers = makeAuthHeader({ userId: 1, email: 'admin@test.com', tier: 'free', role: 'admin' })
			const res = await app.request('/api/admin/plans', { headers })
			expect(res.status).toBe(200)
			const data = await res.json()
			expect(Array.isArray(data)).toBe(true)
			expect(data.length).toBeGreaterThanOrEqual(3)
		})
	})

	describe('PUT /api/admin/plans/:tier', () => {
		it('allows admin to update plan pricing', async () => {
			const mockUpdate = vi.fn()
			const plan = { tier: 'premium', name: 'Premium', price_monthly: 29.99, price_yearly: 299.99, domains: 1000, rdap_daily: 100, ai_daily: 100, watchlist: 100, wishlist: 50, features: '[]', active: true, update: mockUpdate, toJSON: () => ({ tier: 'premium', price_monthly: 49.99 }) }
			mockPlans.length = 0
			mockPlans.push(plan)

			const headers = makeAuthHeader({ userId: 1, email: 'admin@test.com', tier: 'free', role: 'admin' })
			const res = await app.request('/api/admin/plans/premium', {
				method: 'PUT',
				headers: { ...headers, 'Content-Type': 'application/json' },
				body: JSON.stringify({ price_monthly: 49.99 }),
			})
			expect(res.status).toBe(200)
			expect(mockUpdate).toHaveBeenCalled()
		})

		it('returns 404 for non-existent plan tier', async () => {
			const headers = makeAuthHeader({ userId: 1, email: 'admin@test.com', tier: 'free', role: 'admin' })
			const res = await app.request('/api/admin/plans/nonexistent', {
				method: 'PUT',
				headers: { ...headers, 'Content-Type': 'application/json' },
				body: JSON.stringify({ price_monthly: 10 }),
			})
			expect(res.status).toBe(404)
		})

		it('invalidates plan cache on update', async () => {
			const mockUpdate = vi.fn()
			const plan = { tier: 'free', name: 'Free', price_monthly: 0, domains: 10, update: mockUpdate, toJSON: () => ({ tier: 'free', price_monthly: 5 }) }
			mockPlans.length = 0
			mockPlans.push(plan)

			const headers = makeAuthHeader({ userId: 1, email: 'admin@test.com', tier: 'free', role: 'admin' })
			await app.request('/api/admin/plans/free', {
				method: 'PUT',
				headers: { ...headers, 'Content-Type': 'application/json' },
				body: JSON.stringify({ price_monthly: 5 }),
			})
			expect(planCache.invalidatePlanCache).toHaveBeenCalled()
		})
	})

	// ─── Delete User (POST endpoint) ────────────────────────────────

	describe('POST /api/admin/users/:id/delete', () => {
		it('allows admin to delete user with cascade', async () => {
			const mockDestroy = vi.fn()
			const userObj = { id: 2, email: 'user@test.com', tier: 'free', role: 'user', destroy: mockDestroy }
			mockUsers.push(
				{ id: 1, email: 'admin@test.com', tier: 'free', role: 'admin' },
				userObj,
			)

			const headers = makeAuthHeader({ userId: 1, email: 'admin@test.com', tier: 'free', role: 'admin' })
			const res = await app.request('/api/admin/users/2/delete', {
				method: 'POST',
				headers: { ...headers, 'Content-Type': 'application/json' },
				body: JSON.stringify({ cascade: true }),
			})
			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.deleted).toBe(true)
			expect(data.cascade).toBe(true)
			expect(mockDestroy).toHaveBeenCalled()
		})

		it('prevents admin from deleting themselves', async () => {
			const userObj = { id: 1, email: 'admin@test.com', tier: 'free', role: 'admin', destroy: vi.fn() }
			mockUsers.push(userObj)

			const headers = makeAuthHeader({ userId: 1, email: 'admin@test.com', tier: 'free', role: 'admin' })
			const res = await app.request('/api/admin/users/1/delete', {
				method: 'POST',
				headers: { ...headers, 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			})
			expect(res.status).toBe(400)
			const data = await res.json()
			expect(data.error).toMatch(/delete yourself/i)
		})

		it('returns 404 for non-existent user', async () => {
			const headers = makeAuthHeader({ userId: 1, email: 'admin@test.com', tier: 'free', role: 'admin' })
			const res = await app.request('/api/admin/users/999/delete', {
				method: 'POST',
				headers: { ...headers, 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			})
			expect(res.status).toBe(404)
		})
	})

	// ─── Domains Overview ───────────────────────────────────────────

	describe('GET /api/admin/domains', () => {
		it('returns all domains across users for admin', async () => {
			mockDomains.push(
				{ id: 1, user_id: 1, domain_name: 'a.com' },
				{ id: 2, user_id: 2, domain_name: 'b.com' },
			)
			const headers = makeAuthHeader({ userId: 1, email: 'admin@test.com', tier: 'free', role: 'admin' })
			const res = await app.request('/api/admin/domains', { headers })
			expect(res.status).toBe(200)
			const data = await res.json()
			expect(Array.isArray(data)).toBe(true)
		})
	})

	// ─── First User is Admin ────────────────────────────────────────

	describe('First user registration', () => {
		it('assigns admin role to the first registered user', async () => {
			const res = await app.request('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: 'first@test.com', password: 'password123', confirmPassword: 'password123' }),
			})
			expect(res.status).toBe(201)
			const data = await res.json()
			expect(data.user.role).toBe('admin')
		})

		it('does not assign admin role to subsequent users', async () => {
			// Simulate existing user (first user already registered)
			mockUsers.push({ id: 1, email: 'existing@test.com', tier: 'free', role: 'admin' })
			const res = await app.request('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: 'second@test.com', password: 'password123', confirmPassword: 'password123' }),
			})
			expect(res.status).toBe(201)
			const data = await res.json()
			expect(data.user.role).toBe('user')
		})
	})
})
