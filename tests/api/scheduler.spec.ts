/**
 * Background task scheduler tests — TDD.
 *
 * Tests for the scheduler module that handles:
 * 1. Domain expiration checks (mark expired domains, create notifications)
 * 2. Currency exchange rate updates (cache rates in memory/DB)
 * 3. Daily AI call counter resets
 * 4. Scheduler API endpoint for manual triggers
 * 5. Notifications API
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { signJwt } from '../../api/auth.js'

// Helper to generate auth headers for protected routes
function authHeaders(extra?: Record<string, string>) {
  const token = signJwt({ userId: 1, email: 'admin@test.com', tier: 'enterprise' })
  return { Authorization: `Bearer ${token}`, ...extra }
}

// ─── Mock data helpers ──────────────────────────────────────────────

/** Create a mock domain object with Sequelize-like .get() and .update() */
function makeDomain(data: Record<string, any>) {
  return {
    ...data,
    update: data.update || vi.fn(),
    get(opts: any) {
      // Return a plain copy matching Sequelize get({ plain: true })
      const { update, get, ...rest } = this
      return rest
    },
  }
}

// ─── Mock DB ──────────────────────────────────────────────────────────

const mockDomains: any[] = []
const mockNotifications: any[] = []

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
      // Filter by status if provided
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
			// Filter by domain_id and type if provided
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
		findAll: vi.fn(async () => []),
	},
	Wishlist: {
		findAll: vi.fn(async () => []),
	},
}))

// Mock bcryptjs for auth routes
vi.mock('bcryptjs', () => ({
	default: {
		hash: vi.fn(async () => '$2a$10$hashedpassword'),
		compare: vi.fn(async () => true),
	},
}))

// Mock domain-analysis for scheduler watchlist/wishlist check tasks
vi.mock('../../api/domain-analysis.js', () => ({
	rdapLookup: vi.fn(async () => ({ registrar: 'MockReg', expiryDate: '2026-01-01', nameservers: [], status: [] })),
}))

import { app } from '../../api/app'
import { runExpirationChecks, runCurrencyUpdate, runDailyAiReset, runDailyRdapReset, getCachedRates, runWatchlistCheck, runWishlistCheck } from '../../api/scheduler.js'

describe('Background Task Scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDomains.length = 0
    mockNotifications.length = 0
  })

  // ─── 1. Domain Expiration Checks ──────────────────────────────

  describe('runExpirationChecks', () => {
    it('marks domains as expired when expiry_date is in the past', async () => {
      const pastDate = new Date('2020-01-01')
      const domain = makeDomain({
        id: 1, domain_name: 'expired.com', expiry_date: pastDate, status: 'active', user_id: 1,
      })
      mockDomains.push(domain)

      const result = await runExpirationChecks()

      expect(result.expired).toBe(1)
      expect(domain.update).toHaveBeenCalledWith({ status: 'expired' })
    })

    it('does not mark already-expired domains again', async () => {
      mockDomains.push(makeDomain({
        id: 1, domain_name: 'already-expired.com', expiry_date: new Date('2020-01-01'), status: 'expired', user_id: 1,
      }))

      const result = await runExpirationChecks()

      expect(result.expired).toBe(0)
      expect(mockDomains[0].update).not.toHaveBeenCalled()
    })

    it('creates notifications for domains expiring within 30 days', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 15)
      mockDomains.push(makeDomain({
        id: 2, domain_name: 'expiring-soon.com', expiry_date: futureDate, status: 'active', user_id: 1,
      }))

      const result = await runExpirationChecks()

      expect(result.notifications).toBeGreaterThanOrEqual(1)
    })

    it('creates notifications for domains expiring within 7 days (urgent)', async () => {
      const weekAway = new Date()
      weekAway.setDate(weekAway.getDate() + 5)
      mockDomains.push(makeDomain({
        id: 3, domain_name: 'urgent-expiry.com', expiry_date: weekAway, status: 'active', user_id: 1,
      }))

      const result = await runExpirationChecks()

      expect(result.notifications).toBeGreaterThanOrEqual(1)
      const { Notification } = await import('../../api/models/index.js')
      const createCalls = (Notification.create as any).mock.calls
      const urgentCall = createCalls.find((c: any) => c[0].level === 'urgent')
      expect(urgentCall).toBeDefined()
    })

    it('does not create duplicate notifications for already-notified domains', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 15)
      mockDomains.push(makeDomain({
        id: 4, domain_name: 'already-notified.com', expiry_date: futureDate, status: 'active', user_id: 1,
      }))
      // Simulate existing notification for this domain
      mockNotifications.push({
        id: 1, domain_id: 4, type: 'expiration_warning', dismissed: false,
      })

      const result = await runExpirationChecks()

      const { Notification } = await import('../../api/models/index.js')
      const domain4Calls = (Notification.create as any).mock.calls.filter(
        (c: any) => c[0].domain_id === 4
      )
      expect(domain4Calls.length).toBe(0)
    })

    it('skips domains that are not near expiry', async () => {
      const farFuture = new Date()
      farFuture.setDate(farFuture.getDate() + 365)
      mockDomains.push(makeDomain({
        id: 5, domain_name: 'safe-domain.com', expiry_date: farFuture, status: 'active', user_id: 1,
      }))

      const result = await runExpirationChecks()

      expect(result.expired).toBe(0)
      expect(result.notifications).toBe(0)
    })

    it('returns a summary with counts', async () => {
      const result = await runExpirationChecks()

      expect(result).toHaveProperty('expired')
      expect(result).toHaveProperty('notifications')
      expect(result).toHaveProperty('checked')
    })
  })

  // ─── 2. Currency Exchange Rate Updates ────────────────────────

  describe('runCurrencyUpdate', () => {
    it('fetches and caches exchange rates', async () => {
      const result = await runCurrencyUpdate()

      expect(result).toHaveProperty('rates')
      expect(result).toHaveProperty('source')
      expect(result.rates).toHaveProperty('USD')
      expect(result.rates.USD).toBe(1)
    })

    it('returns fallback rates when external API fails', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn(async () => { throw new Error('Network error') })

      const result = await runCurrencyUpdate()

      expect(result.source).toBe('fallback')
      expect(result.rates).toHaveProperty('EUR')
      expect(result.rates.EUR).toBe(0.92)

      globalThis.fetch = originalFetch
    })

    it('stores cached rates for subsequent reads', async () => {
      await runCurrencyUpdate()
      const cached = getCachedRates()

      expect(cached).not.toBeNull()
      expect(cached).toHaveProperty('USD')
    })
  })

 // ─── 3. Daily AI Call Counter Reset ───────────────────────────

 describe('runDailyAiReset', () => {
 it('resets daily_ai_calls to 0 for all users', async () => {
 const result = await runDailyAiReset()

 expect(result).toHaveProperty('reset')
 expect(result.reset).toBeGreaterThanOrEqual(0)
 const { User } = await import('../../api/models/index.js')
 expect(User.update).toHaveBeenCalledWith(
 { daily_ai_calls: 0 },
 expect.objectContaining({ where: expect.anything() })
 )
 })
 })

 // ─── 3b. Daily RDAP Call Counter Reset ──────────────────────

 describe('runDailyRdapReset', () => {
 it('resets daily_rdap_calls to 0 for all users', async () => {
 const result = await runDailyRdapReset()

 expect(result).toHaveProperty('reset')
 expect(result.reset).toBeGreaterThanOrEqual(0)
 const { User } = await import('../../api/models/index.js')
 expect(User.update).toHaveBeenCalledWith(
 { daily_rdap_calls: 0 },
 expect.objectContaining({ where: expect.anything() })
 )
 })
 })

  // ─── 4. Scheduler API Endpoint ────────────────────────────────

  describe('POST /api/scheduler/run (manual trigger)', () => {
    it('returns 401 without auth token', async () => {
      const res = await app.request('/api/scheduler/run', { method: 'POST' })
      expect(res.status).toBe(401)
    })

	it('runs all scheduler tasks and returns summary', async () => {
		const res = await app.request('/api/scheduler/run', {
			method: 'POST',
			headers: authHeaders({ 'Content-Type': 'application/json' }),
		})
		expect(res.status).toBe(200)
		const data = await res.json()
		expect(data).toHaveProperty('expirationChecks')
		expect(data).toHaveProperty('currencyUpdate')
		expect(data).toHaveProperty('dailyAiReset')
		expect(data).toHaveProperty('dailyRdapReset')
		expect(data).toHaveProperty('watchlistCheck')
		expect(data).toHaveProperty('wishlistCheck')
		expect(data).toHaveProperty('runAt')
	})

	it('allows specifying which tasks to run', async () => {
		const res = await app.request('/api/scheduler/run', {
			method: 'POST',
			headers: authHeaders({ 'Content-Type': 'application/json' }),
			body: JSON.stringify({ tasks: ['expiration'] }),
		})
		expect(res.status).toBe(200)
		const data = await res.json()
		expect(data).toHaveProperty('expirationChecks')
		// Other tasks should not be present when filtered
		expect(data).not.toHaveProperty('currencyUpdate')
		expect(data).not.toHaveProperty('dailyAiReset')
		expect(data).not.toHaveProperty('dailyRdapReset')
		expect(data).not.toHaveProperty('watchlistCheck')
		expect(data).not.toHaveProperty('wishlistCheck')
	})
  })

  // ─── 5. GET /api/notifications ────────────────────────────────

  describe('GET /api/notifications', () => {
    it('returns 401 without auth token', async () => {
      const res = await app.request('/api/notifications')
      expect(res.status).toBe(401)
    })

    it('returns notifications for authenticated user', async () => {
      const res = await app.request('/api/notifications', {
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
    })
  })
})
