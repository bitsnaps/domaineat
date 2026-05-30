/**
 * Phase 2A API route tests — TDD (RED phase first)
 *
 * Tests for:
 * 1. Wishlist "Check All" — POST /api/wishlist/check
 * 2. Bulk Delete — DELETE /api/watchlist/bulk, DELETE /api/wishlist/bulk
 * 3. Export CSV — GET /api/watchlist/export, GET /api/wishlist/export, GET /api/domains/export
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { signJwt } from '../../api/auth.js'

// Helper to generate auth headers for protected routes
function authHeaders(extra?: Record<string, string>) {
	const token = signJwt({ userId: 1, email: 'test@test.com', tier: 'premium' })
	return { Authorization: `Bearer ${token}`, ...extra }
}

// ─── Mock data ────────────────────────────────────────────────────────

const mockWatchlist: any[] = []
const mockWishlist: any[] = []
const mockDomains: any[] = []
const mockDomainTags: any[] = []

vi.mock('../../api/models/index.js', () => ({
	sequelize: { authenticate: vi.fn() },
	User: {
		findByPk: vi.fn(async (id: number | string) => {
			if (String(id) === '1') return { id: 1, email: 'test@test.com', tier: 'premium', password_hash: 'hash', llm_api_key_encrypted: null, daily_rdap_calls: 0, daily_ai_calls: 0, increment: vi.fn(), toJSON: () => ({ id: 1, email: 'test@test.com', tier: 'premium' }) }
			return null
		}),
		findOne: vi.fn(async () => null),
		create: vi.fn(async (data: any) => ({ id: 1, ...data })),
		update: vi.fn(async () => [1]),
	},
	Domain: {
		findAll: vi.fn(async () => mockDomains),
		count: vi.fn(async () => mockDomains.length),
		findByPk: vi.fn(async (id: number | string) => mockDomains.find((d) => String(d.id) === String(id)) || null),
		findOne: vi.fn(async (opts: any) => {
			if (!opts?.where) return null
			return mockDomains.find((d) => {
				if (opts.where.id !== undefined && String(d.id) !== String(opts.where.id)) return false
				if (opts.where.user_id !== undefined && d.user_id !== opts.where.user_id) return false
				return true
			}) || null
		}),
		create: vi.fn(async (data: any) => {
			const domain = { id: mockDomains.length + 1, ...data, update: vi.fn(), destroy: vi.fn() }
			mockDomains.push(domain)
			return domain
		}),
	},
	Watchlist: {
		findAll: vi.fn(async (opts?: any) => {
			if (opts?.where?.user_id) return mockWatchlist.filter(w => w.user_id === opts.where.user_id)
			if (opts?.where?.id) return mockWatchlist.filter(w => opts.where.id.includes(w.id))
			return mockWatchlist
		}),
		findOne: vi.fn(async (opts?: any) => {
			if (!opts?.where) return null
			return mockWatchlist.find(w => {
				if (opts.where.id !== undefined && String(w.id) !== String(opts.where.id)) return false
				if (opts.where.user_id !== undefined && w.user_id !== opts.where.user_id) return false
				return true
			}) || null
		}),
		count: vi.fn(async (opts?: any) => {
			if (opts?.where?.user_id) return mockWatchlist.filter(w => w.user_id === opts.where.user_id).length
			return mockWatchlist.length
		}),
		findByPk: vi.fn(async (id: number | string) => mockWatchlist.find((w) => String(w.id) === String(id)) || null),
		create: vi.fn(async (data: any) => {
			const item = { id: mockWatchlist.length + 1, ...data, update: vi.fn(), destroy: vi.fn() }
			mockWatchlist.push(item)
			return item
		}),
		destroy: vi.fn(async (opts?: any) => {
			if (opts?.where?.id) {
				const ids = Array.isArray(opts.where.id) ? opts.where.id : [opts.where.id]
				const before = mockWatchlist.length
				for (let i = mockWatchlist.length - 1; i >= 0; i--) {
					if (ids.includes(mockWatchlist[i].id)) mockWatchlist.splice(i, 1)
				}
				return before - mockWatchlist.length
			}
			return 0
		}),
	},
	Wishlist: {
		findAll: vi.fn(async (opts?: any) => {
			if (opts?.where?.user_id) return mockWishlist.filter(w => w.user_id === opts.where.user_id)
			if (opts?.where?.id) return mockWishlist.filter(w => opts.where.id.includes(w.id))
			return mockWishlist
		}),
		findOne: vi.fn(async (opts?: any) => {
			if (!opts?.where) return null
			return mockWishlist.find(w => {
				if (opts.where.id !== undefined && String(w.id) !== String(opts.where.id)) return false
				if (opts.where.user_id !== undefined && w.user_id !== opts.where.user_id) return false
				return true
			}) || null
		}),
		count: vi.fn(async (opts?: any) => {
			if (opts?.where?.user_id) return mockWishlist.filter(w => w.user_id === opts.where.user_id).length
			return mockWishlist.length
		}),
		findByPk: vi.fn(async (id: number | string) => mockWishlist.find((w) => String(w.id) === String(id)) || null),
		create: vi.fn(async (data: any) => {
			const item = { id: mockWishlist.length + 1, ...data, update: vi.fn(), destroy: vi.fn() }
			mockWishlist.push(item)
			return item
		}),
		destroy: vi.fn(async (opts?: any) => {
			if (opts?.where?.id) {
				const ids = Array.isArray(opts.where.id) ? opts.where.id : [opts.where.id]
				const before = mockWishlist.length
				for (let i = mockWishlist.length - 1; i >= 0; i--) {
					if (ids.includes(mockWishlist[i].id)) mockWishlist.splice(i, 1)
				}
				return before - mockWishlist.length
			}
			return 0
		}),
	},
	Notification: { findAll: vi.fn(async () => []), findByPk: vi.fn(async () => null), create: vi.fn() },
	Ledger: { findAll: vi.fn(async () => []), create: vi.fn() },
	Prospect: {
		findAll: vi.fn(async () => []),
		findByPk: vi.fn(async () => null),
		findOne: vi.fn(async () => null),
		create: vi.fn(async (data: any) => ({ id: 1, ...data })),
	},
	DomainTag: {
		findAll: vi.fn(async (opts?: any) => {
			if (opts?.where?.domain_id) return mockDomainTags.filter(t => t.domain_id === opts.where.domain_id)
			return mockDomainTags
		}),
		findOne: vi.fn(async (opts?: any) => {
			if (!opts?.where) return null
			return mockDomainTags.find(t => {
				if (opts.where.domain_id !== undefined && t.domain_id !== opts.where.domain_id) return false
				if (opts.where.tag !== undefined && t.tag !== opts.where.tag) return false
				return true
			}) || null
		}),
		findOrCreate: vi.fn(async (opts: any) => {
			const existing = mockDomainTags.find(t => {
				if (opts.where.domain_id !== undefined && t.domain_id !== opts.where.domain_id) return false
				if (opts.where.tag !== undefined && t.tag !== opts.where.tag) return false
				return true
			})
			if (existing) return [existing, false]
			const tag = { id: mockDomainTags.length + 1, ...opts.defaults, destroy: vi.fn() }
			mockDomainTags.push(tag)
			return [tag, true]
		}),
		create: vi.fn(async (data: any) => {
			const tag = { id: mockDomainTags.length + 1, ...data, destroy: vi.fn() }
			mockDomainTags.push(tag)
			return tag
		}),
		destroy: vi.fn(async (opts?: any) => {
			if (opts?.where) {
				const before = mockDomainTags.length
				for (let i = mockDomainTags.length - 1; i >= 0; i--) {
					const t = mockDomainTags[i]
					if (opts.where.domain_id !== undefined && t.domain_id !== opts.where.domain_id) continue
					if (opts.where.tag !== undefined && t.tag !== opts.where.tag) continue
					mockDomainTags.splice(i, 1)
				}
				return before - mockDomainTags.length
			}
			return 0
		}),
	},
}))

// Mock bcryptjs for auth routes
vi.mock('bcryptjs', () => ({
	default: {
		hash: vi.fn(async () => '$2a$10$hashedpassword'),
		compare: vi.fn(async () => true),
	},
}))

// Mock domain-analysis for check endpoints
vi.mock('../../api/domain-analysis.js', () => ({
	rdapLookup: vi.fn(async (domain: string) => {
		// Simulate: domain with "available" in name is available (null = no RDAP record)
		if (domain.includes('available')) return null
		return { registrar: 'GoDaddy', expiryDate: '2026-01-01', nameservers: [], status: [] }
	}),
}))

import { app } from '../../api/app'

describe('Phase 2A — Wishlist Check All', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockWatchlist.length = 0
		mockWishlist.length = 0
		mockDomains.length = 0
		mockDomainTags.length = 0
	})

	// ─── 1. POST /api/wishlist/check ────────────────────────────────

	describe('POST /api/wishlist/check', () => {
		it('returns 401 without auth token', async () => {
			const res = await app.request('/api/wishlist/check', { method: 'POST' })
			expect(res.status).toBe(401)
		})

		it('returns empty array when wishlist is empty', async () => {
			const res = await app.request('/api/wishlist/check', {
				method: 'POST',
				headers: authHeaders(),
			})
			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data).toBeInstanceOf(Array)
			expect(data).toHaveLength(0)
		})

		it('checks availability for all wishlist items and returns updated list', async () => {
			mockWishlist.push(
				{ id: 1, user_id: 1, domain_name: 'available.com', tld: 'com', available: null, update: vi.fn() },
				{ id: 2, user_id: 1, domain_name: 'taken.com', tld: 'com', available: null, update: vi.fn() },
			)
			const res = await app.request('/api/wishlist/check', {
				method: 'POST',
				headers: authHeaders(),
			})
			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data).toBeInstanceOf(Array)
			expect(data).toHaveLength(2)
		})

		it('creates notification when availability status changes', async () => {
			mockWishlist.push(
				{ id: 3, user_id: 1, domain_name: 'available.com', tld: 'com', available: false, update: vi.fn() },
			)
			const res = await app.request('/api/wishlist/check', {
				method: 'POST',
				headers: authHeaders(),
			})
			expect(res.status).toBe(200)
			// Notification.create should have been called for status change
			const { Notification } = await import('../../api/models/index.js')
			expect(Notification.create).toHaveBeenCalled()
		})

		it('does not create notification when availability is unchanged (null → result)', async () => {
			mockWishlist.push(
				{ id: 4, user_id: 1, domain_name: 'taken.com', tld: 'com', available: null, update: vi.fn() },
			)
			await app.request('/api/wishlist/check', {
				method: 'POST',
				headers: authHeaders(),
			})
			const { Notification } = await import('../../api/models/index.js')
			// No status *change* when previous was null — first check is informational only
			const statusChangeCalls = (Notification.create as any).mock.calls.filter(
				(c: any) => c[0].type === 'status_change',
			)
			expect(statusChangeCalls).toHaveLength(0)
		})
	})
})

describe('Phase 2A — Bulk Delete', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockWatchlist.length = 0
		mockWishlist.length = 0
		mockDomains.length = 0
		mockDomainTags.length = 0
	})

	// ─── 2. DELETE /api/watchlist/bulk ─────────────────────────────

	describe('DELETE /api/watchlist/bulk', () => {
		it('returns 401 without auth token', async () => {
			const res = await app.request('/api/watchlist/bulk', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids: [1, 2] }),
			})
			expect(res.status).toBe(401)
		})

		it('deletes multiple watchlist items by ids', async () => {
			mockWatchlist.push(
				{ id: 10, user_id: 1, domain_name: 'a.com', destroy: vi.fn() },
				{ id: 11, user_id: 1, domain_name: 'b.com', destroy: vi.fn() },
				{ id: 12, user_id: 2, domain_name: 'c.com', destroy: vi.fn() },
			)
			const res = await app.request('/api/watchlist/bulk', {
				method: 'DELETE',
				headers: authHeaders({ 'Content-Type': 'application/json' }),
				body: JSON.stringify({ ids: [10, 11] }),
			})
			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.deleted).toBe(2)
		})

		it('returns 400 when ids array is missing or empty', async () => {
			const res = await app.request('/api/watchlist/bulk', {
				method: 'DELETE',
				headers: authHeaders({ 'Content-Type': 'application/json' }),
				body: JSON.stringify({}),
			})
			expect(res.status).toBe(400)
		})

		it('only deletes items belonging to the authenticated user', async () => {
			mockWatchlist.push(
				{ id: 20, user_id: 1, domain_name: 'mine.com', destroy: vi.fn() },
				{ id: 21, user_id: 2, domain_name: 'theirs.com', destroy: vi.fn() },
			)
			const res = await app.request('/api/watchlist/bulk', {
				method: 'DELETE',
				headers: authHeaders({ 'Content-Type': 'application/json' }),
				body: JSON.stringify({ ids: [20, 21] }),
			})
			expect(res.status).toBe(200)
			const data = await res.json()
			// Only user 1's item should be deleted
			expect(data.deleted).toBe(1)
		})
	})

	// ─── 3. DELETE /api/wishlist/bulk ──────────────────────────────

	describe('DELETE /api/wishlist/bulk', () => {
		it('returns 401 without auth token', async () => {
			const res = await app.request('/api/wishlist/bulk', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids: [1, 2] }),
			})
			expect(res.status).toBe(401)
		})

		it('deletes multiple wishlist items by ids', async () => {
			mockWishlist.push(
				{ id: 30, user_id: 1, domain_name: 'x.com', destroy: vi.fn() },
				{ id: 31, user_id: 1, domain_name: 'y.com', destroy: vi.fn() },
			)
			const res = await app.request('/api/wishlist/bulk', {
				method: 'DELETE',
				headers: authHeaders({ 'Content-Type': 'application/json' }),
				body: JSON.stringify({ ids: [30, 31] }),
			})
			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.deleted).toBe(2)
		})

		it('returns 400 when ids array is missing or empty', async () => {
			const res = await app.request('/api/wishlist/bulk', {
				method: 'DELETE',
				headers: authHeaders({ 'Content-Type': 'application/json' }),
				body: JSON.stringify({ ids: [] }),
			})
			expect(res.status).toBe(400)
		})

		it('only deletes items belonging to the authenticated user', async () => {
			mockWishlist.push(
				{ id: 40, user_id: 1, domain_name: 'mine.com', destroy: vi.fn() },
				{ id: 41, user_id: 2, domain_name: 'theirs.com', destroy: vi.fn() },
			)
			const res = await app.request('/api/wishlist/bulk', {
				method: 'DELETE',
				headers: authHeaders({ 'Content-Type': 'application/json' }),
				body: JSON.stringify({ ids: [40, 41] }),
			})
			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.deleted).toBe(1)
		})
	})
})

describe('Phase 2A — Export CSV', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockWatchlist.length = 0
		mockWishlist.length = 0
		mockDomains.length = 0
		mockDomainTags.length = 0
	})

	// ─── 4. GET /api/watchlist/export ──────────────────────────────

	describe('GET /api/watchlist/export', () => {
		it('returns 401 without auth token', async () => {
			const res = await app.request('/api/watchlist/export')
			expect(res.status).toBe(401)
		})

		it('returns CSV with headers and data', async () => {
			mockWatchlist.push(
				{ id: 1, user_id: 1, domain_name: 'test.com', tld: 'com', available: true, appraisal_grade: 'A', notes: 'good', last_checked_at: '2025-01-01', created_at: '2025-01-01', updated_at: '2025-01-01', get: function() { const { get, update, destroy, ...rest } = this; return rest } },
			)
			const res = await app.request('/api/watchlist/export', { headers: authHeaders() })
			expect(res.status).toBe(200)
			expect(res.headers.get('content-type')).toContain('text/csv')
			const text = await res.text()
			expect(text).toContain('domain_name')
			expect(text).toContain('test.com')
		})

		it('returns CSV with only headers when no items', async () => {
			const res = await app.request('/api/watchlist/export', { headers: authHeaders() })
			expect(res.status).toBe(200)
			const text = await res.text()
			const lines = text.trim().split('\n')
			// Only header row
			expect(lines).toHaveLength(1)
		})
	})

	// ─── 5. GET /api/wishlist/export ───────────────────────────────

	describe('GET /api/wishlist/export', () => {
		it('returns 401 without auth token', async () => {
			const res = await app.request('/api/wishlist/export')
			expect(res.status).toBe(401)
		})

		it('returns CSV with headers and data', async () => {
			mockWishlist.push(
				{ id: 1, user_id: 1, domain_name: 'wish.com', tld: 'com', max_budget: 500, available: null, appraisal_grade: 'B', auto_prospect: true, ai_agent: false, priority: 'high', notes: 'want', last_checked_at: null, created_at: '2025-01-01', updated_at: '2025-01-01', get: function() { const { get, update, destroy, ...rest } = this; return rest } },
			)
			const res = await app.request('/api/wishlist/export', { headers: authHeaders() })
			expect(res.status).toBe(200)
			expect(res.headers.get('content-type')).toContain('text/csv')
			const text = await res.text()
			expect(text).toContain('domain_name')
			expect(text).toContain('wish.com')
			expect(text).toContain('priority')
		})
	})

	// ─── 6. GET /api/domains/export ────────────────────────────────

	describe('GET /api/domains/export', () => {
		it('returns 401 without auth token', async () => {
			const res = await app.request('/api/domains/export')
			expect(res.status).toBe(401)
		})

		it('returns CSV with domain data', async () => {
			mockDomains.push(
				{ id: 1, user_id: 1, domain_name: 'mydomain.io', registrar: 'Namecheap', status: 'active', acquisition_date: '2024-01-01', expiry_date: '2025-01-01', acquisition_cost: 12, renewal_cost: 15, nameservers: null, get: function() { const { get, update, destroy, ...rest } = this; return rest } },
			)
			const res = await app.request('/api/domains/export', { headers: authHeaders() })
			expect(res.status).toBe(200)
			expect(res.headers.get('content-type')).toContain('text/csv')
			const text = await res.text()
			expect(text).toContain('domain_name')
			expect(text).toContain('mydomain.io')
		})
	})
})

describe('Phase 2D — Wishlist Prospect-All', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockWatchlist.length = 0
		mockWishlist.length = 0
		mockDomains.length = 0
		mockDomainTags.length = 0
	})

	describe('POST /api/wishlist/prospect-all', () => {
		it('returns 401 without auth token', async () => {
			const res = await app.request('/api/wishlist/prospect-all', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids: [1] }),
			})
			expect(res.status).toBe(401)
		})

		it('returns 400 when ids array is missing', async () => {
			const res = await app.request('/api/wishlist/prospect-all', {
				method: 'POST',
				headers: authHeaders({ 'Content-Type': 'application/json' }),
				body: JSON.stringify({}),
			})
			expect(res.status).toBe(400)
		})

		it('returns 400 when ids array is empty', async () => {
			const res = await app.request('/api/wishlist/prospect-all', {
				method: 'POST',
				headers: authHeaders({ 'Content-Type': 'application/json' }),
				body: JSON.stringify({ ids: [] }),
			})
			expect(res.status).toBe(400)
		})

		it('creates prospect entries for alternative TLDs', async () => {
			mockWishlist.push(
				{ id: 1, user_id: 1, domain_name: 'example.com', tld: 'com', available: false },
			)
			const res = await app.request('/api/wishlist/prospect-all', {
				method: 'POST',
				headers: authHeaders({ 'Content-Type': 'application/json' }),
				body: JSON.stringify({ ids: [1] }),
			})
			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.found).toBeTypeOf('number')
			expect(data.found).toBeGreaterThan(0)
		})

		it('skips the current TLD when generating alternatives', async () => {
			mockWishlist.push(
				{ id: 2, user_id: 1, domain_name: 'mysite.io', tld: 'io', available: false },
			)
			const res = await app.request('/api/wishlist/prospect-all', {
				method: 'POST',
				headers: authHeaders({ 'Content-Type': 'application/json' }),
				body: JSON.stringify({ ids: [2] }),
			})
			expect(res.status).toBe(200)
			const { Prospect } = await import('../../api/models/index.js')
			// No prospect should be created for mysite.io (same TLD as input)
			const createCalls = (Prospect.create as any).mock.calls
			for (const call of createCalls) {
				expect(call[0].prospect_domain).not.toBe('mysite.io')
			}
		})

		it('ignores wishlist items not belonging to user', async () => {
			mockWishlist.push(
				{ id: 3, user_id: 2, domain_name: 'other.com', tld: 'com', available: false },
			)
			const res = await app.request('/api/wishlist/prospect-all', {
				method: 'POST',
				headers: authHeaders({ 'Content-Type': 'application/json' }),
				body: JSON.stringify({ ids: [3] }),
			})
			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.found).toBe(0)
		})
	})
})

// ─── Phase 2F: Domain Tags ────────────────────────────────────────────────
describe('Phase 2F — Domain Tags', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockWatchlist.length = 0
		mockWishlist.length = 0
		mockDomains.length = 0
		mockDomainTags.length = 0
	})

	describe('POST /api/domains/:id/tags', () => {
		it('adds a tag to a domain owned by the user', async () => {
			mockDomains.push({ id: 10, user_id: 1, domain_name: 'example.com' })
			const res = await app.request('/api/domains/10/tags', {
				method: 'POST',
				headers: authHeaders({ 'Content-Type': 'application/json' }),
				body: JSON.stringify({ tag: 'premium' }),
			})
			expect(res.status).toBe(201)
			const data = await res.json()
			expect(data.tag).toBe('premium')
		})

		it('rejects adding a duplicate tag', async () => {
			mockDomains.push({ id: 10, user_id: 1, domain_name: 'example.com' })
			// Pre-add the tag so findOrCreate finds it
			mockDomainTags.push({ id: 1, domain_id: 10, user_id: 1, tag: 'premium' })
			const res = await app.request('/api/domains/10/tags', {
				method: 'POST',
				headers: authHeaders({ 'Content-Type': 'application/json' }),
				body: JSON.stringify({ tag: 'premium' }),
			})
			expect(res.status).toBe(409)
		})

		it('returns 404 for domain not found', async () => {
			const res = await app.request('/api/domains/999/tags', {
				method: 'POST',
				headers: authHeaders({ 'Content-Type': 'application/json' }),
				body: JSON.stringify({ tag: 'test' }),
			})
			expect(res.status).toBe(404)
		})
	})

	describe('GET /api/domains/:id/tags', () => {
		it('returns tags for a domain', async () => {
			mockDomains.push({ id: 10, user_id: 1, domain_name: 'example.com' })
			mockDomainTags.push(
				{ id: 1, domain_id: 10, user_id: 1, tag: 'premium' },
				{ id: 2, domain_id: 10, user_id: 1, tag: 'short' },
			)
			const res = await app.request('/api/domains/10/tags', {
				headers: authHeaders(),
			})
			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data).toHaveLength(2)
		})
	})

	describe('DELETE /api/domains/:id/tags/:tag', () => {
		it('removes a tag from a domain', async () => {
			mockDomains.push({ id: 10, user_id: 1, domain_name: 'example.com' })
			mockDomainTags.push({ id: 1, domain_id: 10, user_id: 1, tag: 'premium' })
			const res = await app.request('/api/domains/10/tags/premium', {
				method: 'DELETE',
				headers: authHeaders(),
			})
			expect(res.status).toBe(200)
		})
	})

	describe('POST /api/domains/bulk-tag', () => {
		it('adds a tag to multiple domains', async () => {
			mockDomains.push(
				{ id: 10, user_id: 1, domain_name: 'a.com' },
				{ id: 11, user_id: 1, domain_name: 'b.com' },
			)
			const res = await app.request('/api/domains/bulk-tag', {
				method: 'POST',
				headers: authHeaders({ 'Content-Type': 'application/json' }),
				body: JSON.stringify({ ids: [10, 11], tag: 'bulk-test' }),
			})
			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.tagged).toBeTypeOf('number')
		})
	})
})
