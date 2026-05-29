/**
 * Auth middleware tests — JWT verification, public route bypass, tier gating.
 *
 * TDD RED phase: these tests define the expected behavior of the auth middleware
 * that will be added to api/app.ts. They should FAIL until the middleware is implemented.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { signJwt, TIER_LIMITS } from '../../api/auth.js'

// Helper to generate auth headers with a valid JWT
function makeAuthHeader(payload: { userId: number; email: string; tier: string }) {
  const token = signJwt(payload)
  return { Authorization: `Bearer ${token}` }
}

// Mock the DB module
const mockUsers: any[] = []

vi.mock('../../api/models/index.js', () => ({
  sequelize: {
    authenticate: vi.fn(),
  },
  User: {
    findByPk: vi.fn(async (id: number | string) =>
      mockUsers.find((u) => String(u.id) === String(id)) || null
    ),
    findOne: vi.fn(async (opts: any) =>
      mockUsers.find((u) => u.email === opts?.where?.email) || null
    ),
    create: vi.fn(async (data: any) => {
      const user = { id: mockUsers.length + 1, ...data, update: vi.fn(), toJSON: () => data }
      mockUsers.push(user)
      return user
    }),
  },
  Domain: {
    findAll: vi.fn(async () => []),
    count: vi.fn(async () => 0),
    findByPk: vi.fn(async () => null),
    create: vi.fn(async (data: any) => ({ id: 1, ...data })),
  },
  Ledger: {
    findAll: vi.fn(async () => []),
    create: vi.fn(async (data: any) => ({ id: 1, ...data })),
  },
  Prospect: {
    findAll: vi.fn(async () => []),
    findByPk: vi.fn(async () => null),
    create: vi.fn(async (data: any) => ({ id: 1, ...data })),
  },
}))

// Mock bcryptjs for auth routes (register/login)
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(async () => '$2a$10$hashedpassword'),
    compare: vi.fn(async () => true),
  },
}))

// Import the REAL app (after mocking)
import { app } from '../../api/app'

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsers.length = 0
  })

  // ─── Public Routes (no auth required) ──────────────────────────

  describe('Public routes — no auth required', () => {
    it('GET /api/health is accessible without token', async () => {
      const res = await app.request('/api/health')
      expect(res.status).not.toBe(401)
    })

 it('POST /api/auth/register is accessible without token', async () => {
 const res = await app.request('/api/auth/register', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ email: 'new@test.com', password: 'password123', confirmPassword: 'password123' }),
 })
 expect(res.status).not.toBe(401)
 })

    it('POST /api/auth/login is accessible without token', async () => {
      mockUsers.push({ id: 1, email: 'test@test.com', password_hash: 'hash', tier: 'free' })
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com', password: 'password123' }),
      })
      expect(res.status).not.toBe(401)
    })

    it('GET /api/auth/me is accessible without token (returns own error)', async () => {
      const res = await app.request('/api/auth/me')
      expect([200, 401]).toContain(res.status)
    })
  })

  // ─── Protected Routes (auth required) ──────────────────────────

  describe('Protected routes — auth required', () => {
    it('GET /api/domains returns 401 without token', async () => {
      const res = await app.request('/api/domains?user_id=1')
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toMatch(/authorization|unauthorized|token/i)
    })

    it('POST /api/domains returns 401 without token', async () => {
      const res = await app.request('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain_name: 'test.com' }),
      })
      expect(res.status).toBe(401)
    })

    it('GET /api/ledger returns 401 without token', async () => {
      const res = await app.request('/api/ledger')
      expect(res.status).toBe(401)
    })

    it('POST /api/ledger returns 401 without token', async () => {
      const res = await app.request('/api/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain_id: 1, amount: 9.99 }),
      })
      expect(res.status).toBe(401)
    })

    it('GET /api/prospects returns 401 without token', async () => {
      const res = await app.request('/api/prospects')
      expect(res.status).toBe(401)
    })

    it('GET /api/users/:id returns 401 without token', async () => {
      const res = await app.request('/api/users/1')
      expect(res.status).toBe(401)
    })

    it('POST /api/ai/draft-outreach returns 401 without token', async () => {
      const res = await app.request('/api/ai/draft-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 1, domain_name: 'a.com', prospect_domain: 'b.com' }),
      })
      expect(res.status).toBe(401)
    })

    it('GET /api/domains/:id/dns-check returns 401 without token', async () => {
      const res = await app.request('/api/domains/1/dns-check')
      expect(res.status).toBe(401)
    })

    it('GET /api/exchange-rates returns 401 without token', async () => {
      const res = await app.request('/api/exchange-rates')
      expect(res.status).toBe(401)
    })

	it('GET /api/validate is now public (no auth required)', async () => {
		const res = await app.request('/api/validate?domain=test.com')
		// /api/validate is a public RDAP route — no 401
		expect(res.status).not.toBe(401)
	})

	it('GET /api/search is now public (no auth required)', async () => {
		const res = await app.request('/api/search?domain=test')
		expect(res.status).not.toBe(401)
	})

	it('GET /api/appraise is public (no auth required)', async () => {
		const res = await app.request('/api/appraise?domain=test.com')
		expect(res.status).not.toBe(401)
	})
 })

  // ─── Valid Token — Access Granted ──────────────────────────────

  describe('Valid token — access granted', () => {
    it('GET /api/domains succeeds with valid token', async () => {
      const headers = makeAuthHeader({ userId: 1, email: 'test@test.com', tier: 'free' })
      const res = await app.request('/api/domains?user_id=1', { headers })
      expect(res.status).toBe(200)
    })

    it('POST /api/domains succeeds with valid token', async () => {
      const headers = makeAuthHeader({ userId: 1, email: 'test@test.com', tier: 'free' })
      const res = await app.request('/api/domains', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain_name: 'new.com' }),
      })
      expect(res.status).toBe(201)
    })

    it('GET /api/ledger succeeds with valid token', async () => {
      const headers = makeAuthHeader({ userId: 1, email: 'test@test.com', tier: 'free' })
      const res = await app.request('/api/ledger', { headers })
      expect(res.status).toBe(200)
    })

    it('GET /api/prospects succeeds with valid token', async () => {
      const headers = makeAuthHeader({ userId: 1, email: 'test@test.com', tier: 'free' })
      const res = await app.request('/api/prospects', { headers })
      expect(res.status).toBe(200)
    })

    it('GET /api/users/:id succeeds with valid token', async () => {
      const headers = makeAuthHeader({ userId: 1, email: 'test@test.com', tier: 'free' })
      mockUsers.push({ id: 1, email: 'test@test.com', tier: 'free', password_hash: 'hash', llm_api_key_encrypted: null })
      const res = await app.request('/api/users/1', { headers })
      expect(res.status).toBe(200)
    })

    it('GET /api/exchange-rates succeeds with valid token', async () => {
      const headers = makeAuthHeader({ userId: 1, email: 'test@test.com', tier: 'free' })
      const res = await app.request('/api/exchange-rates', { headers })
      expect(res.status).toBe(200)
    })
  })

  // ─── Invalid / Expired Token — Access Denied ───────────────────

  describe('Invalid token — access denied', () => {
    it('Returns 401 with malformed token', async () => {
      const res = await app.request('/api/domains?user_id=1', {
        headers: { Authorization: 'Bearer not-a-real-token' },
      })
      expect(res.status).toBe(401)
    })

    it('Returns 401 with empty Bearer', async () => {
      const res = await app.request('/api/domains?user_id=1', {
        headers: { Authorization: 'Bearer ' },
      })
      expect(res.status).toBe(401)
    })

    it('Returns 401 with wrong scheme (Basic instead of Bearer)', async () => {
      const res = await app.request('/api/domains?user_id=1', {
        headers: { Authorization: 'Basic dXNlcjpwYXNz' },
      })
      expect(res.status).toBe(401)
    })

    it('Returns 401 with expired token', async () => {
      // Sign a token that expires immediately
      const jwt = await import('jsonwebtoken')
      const expiredToken = jwt.default.sign(
        { userId: 1, email: 'test@test.com', tier: 'free' },
        process.env.JWT_SECRET || 'dev-secret-change-in-production',
        { expiresIn: '0s' }
      )
      const res = await app.request('/api/domains?user_id=1', {
        headers: { Authorization: `Bearer ${expiredToken}` },
      })
      expect(res.status).toBe(401)
    })
  })

  // ─── User Context Injection ────────────────────────────────────

  describe('User context injection', () => {
    it('Middleware injects user info (c.set) for downstream routes', async () => {
      const headers = makeAuthHeader({ userId: 42, email: 'alice@test.com', tier: 'premium' })
      mockUsers.push({ id: 42, email: 'alice@test.com', tier: 'premium', password_hash: 'hash', llm_api_key_encrypted: null })
      const res = await app.request('/api/auth/me', { headers })
      expect(res.status).not.toBe(401)
    })
  })

  // ─── Tier-based Gating ─────────────────────────────────────────

  describe('Tier-based access gating', () => {
    it('Free user cannot exceed domain limit (10 domains)', async () => {
      const headers = makeAuthHeader({ userId: 1, email: 'free@test.com', tier: 'free' })
      const { Domain } = await import('../../api/models/index.js')
      // Mock Domain.count to return 10 (at limit for free tier)
      ;(Domain.count as any) = vi.fn(async () => 10)
      const res = await app.request('/api/domains', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain_name: 'overlimit.com' }),
      })
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toMatch(/limit|tier|upgrade/i)
    })

    it('Premium user can exceed free limit', async () => {
      const headers = makeAuthHeader({ userId: 2, email: 'premium@test.com', tier: 'premium' })
      const { Domain } = await import('../../api/models/index.js')
      ;(Domain.count as any) = vi.fn(async () => 10)
      const res = await app.request('/api/domains', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain_name: 'ok.com' }),
      })
      expect(res.status).toBe(201)
    })

    it('Free user cannot exceed AI daily limit (5 calls)', async () => {
      const headers = makeAuthHeader({ userId: 1, email: 'free@test.com', tier: 'free' })
      mockUsers.push({
        id: 1,
        email: 'free@test.com',
        tier: 'free',
        llm_provider: 'openai',
        llm_api_key_encrypted: 'sk-test',
        llm_model: 'gpt-4o-mini',
        daily_ai_calls: 5,
        update: vi.fn(),
      })
      const res = await app.request('/api/ai/draft-outreach', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 1, domain_name: 'a.com', prospect_domain: 'b.com' }),
      })
      expect(res.status).toBe(429)
    })

    it('Enterprise user has no AI daily limit', async () => {
      const headers = makeAuthHeader({ userId: 3, email: 'ent@test.com', tier: 'enterprise' })
      mockUsers.push({
        id: 3,
        email: 'ent@test.com',
        tier: 'enterprise',
        llm_provider: 'openai',
        llm_api_key_encrypted: 'sk-test',
        llm_model: 'gpt-4o-mini',
        daily_ai_calls: 999,
        update: vi.fn(),
      })
      const res = await app.request('/api/ai/draft-outreach', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 3, domain_name: 'a.com', prospect_domain: 'b.com' }),
      })
 // Should NOT be 429 — enterprise has no limit
 expect(res.status).not.toBe(429)
 })
 })

 // ─── Registration — confirmPassword validation ────────────────

 describe('Registration — confirmPassword validation', () => {
 it('rejects registration without confirmPassword', async () => {
 const res = await app.request('/api/auth/register', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ email: 'noconfirm@test.com', password: 'password123' }),
 })
 expect(res.status).toBe(400)
 const data = await res.json()
 expect(data.error).toMatch(/confirmation|required/i)
 })

 it('rejects registration when passwords do not match', async () => {
 const res = await app.request('/api/auth/register', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ email: 'mismatch@test.com', password: 'password123', confirmPassword: 'different456' }),
 })
 expect(res.status).toBe(400)
 const data = await res.json()
 expect(data.error).toMatch(/match/i)
 })

 it('accepts registration when passwords match', async () => {
 const res = await app.request('/api/auth/register', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ email: 'match@test.com', password: 'password123', confirmPassword: 'password123' }),
 })
 expect(res.status).toBe(201)
 })

 it('rejects short password even with matching confirmPassword', async () => {
 const res = await app.request('/api/auth/register', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ email: 'short@test.com', password: 'short', confirmPassword: 'short' }),
 })
 expect(res.status).toBe(400)
 const data = await res.json()
 expect(data.error).toMatch(/8 characters/i)
 })

 it('rejects duplicate email registration', async () => {
 mockUsers.push({ id: 99, email: 'dup@test.com', password_hash: 'hash', tier: 'free' })
 const res = await app.request('/api/auth/register', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ email: 'dup@test.com', password: 'password123', confirmPassword: 'password123' }),
 })
 expect(res.status).toBe(409)
 const data = await res.json()
 expect(data.error).toMatch(/already|exists/i)
 })
 })
})
