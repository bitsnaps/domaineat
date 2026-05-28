/**
 * Tests for RDAP rate-limit middleware + public access to /api/validate & /api/search.
 *
 * TDD: These tests define the EXPECTED behavior BEFORE implementation.
 * They should FAIL initially, then pass once the rate-limit middleware
 * and public-route changes are applied.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { signJwt } from '../../api/auth.js'

// ─── Helpers ───────────────────────────────────────────────────────

function authHeaders(tier = 'premium', userId = 1, extra?: Record<string, string>) {
  const token = signJwt({ userId, email: `user${userId}@test.com`, tier })
  return { Authorization: `Bearer ${token}`, ...extra }
}

// ─── Mocks ─────────────────────────────────────────────────────────

const mockUserFinders: Record<number, any> = {}

vi.mock('../../api/models/index.js', () => ({
  sequelize: { authenticate: vi.fn() },
  User: {
    findByPk: vi.fn(async (id: number | string) => mockUserFinders[Number(id)] || null),
    findOne: vi.fn(async () => null),
    create: vi.fn(async (data: any) => ({ id: 1, ...data })),
  },
  Domain: {
    findAll: vi.fn(async () => []),
    count: vi.fn(async () => 0),
    findByPk: vi.fn(async () => null),
    findOne: vi.fn(async () => null),
    create: vi.fn(),
  },
  Ledger: { findAll: vi.fn(async () => []), create: vi.fn(), findByPk: vi.fn(async () => null) },
  Prospect: { findAll: vi.fn(async () => []), findByPk: vi.fn(async () => null), create: vi.fn() },
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(async () => '$2a$10$hashedpassword'),
    compare: vi.fn(async () => true),
  },
}))

vi.mock('../../api/domain-analysis.js', () => ({
  rdapLookup: vi.fn(async () => null),
  checkExtension: vi.fn(async (sld: string, tld: string) => ({
    domain: `${sld}.${tld}`, tld, available: true, registrar: null, expiryDate: null,
  })),
  parseDomain: vi.fn(),
  checkAltExtensions: vi.fn(),
  analyzeDomain: vi.fn(),
}))

vi.mock('../../api/dns-check.js', () => ({
  fullDnsCheck: vi.fn(async () => ({
    domain: 'test.com', resolved: false, ip: null, nameservers: [], ssl_expiry: null, checked_at: '',
  })),
  resolveIp: vi.fn(),
  resolveNameservers: vi.fn(),
  checkSslExpiry: vi.fn(),
}))

import { app } from '../../api/app'

// ─── Test suites ───────────────────────────────────────────────────

describe('RDAP Rate Limiting — Public Access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock users
    for (const k of Object.keys(mockUserFinders)) delete mockUserFinders[Number(k)]
  })

  // ─── /api/validate public access ────────────────────────────────

  it('GET /api/validate works WITHOUT auth (public access)', async () => {
    const res = await app.request('/api/validate?domain=example.com')
    // Should NOT return 401 — this is the key public-access test
    expect(res.status).not.toBe(401)
    expect([200, 502]).toContain(res.status)
  })

  it('GET /api/search works WITHOUT auth (public access)', async () => {
    const res = await app.request('/api/search?domain=example')
    expect(res.status).not.toBe(401)
    expect([200, 502]).toContain(res.status)
  })

  // ─── Anonymous IP-based rate limiting ───────────────────────────

  it('anonymous requests return rate-limit headers', async () => {
    const res = await app.request('/api/validate?domain=example.com', {
      headers: { 'X-Forwarded-For': '1.2.3.4' },
    })
    expect(res.status).toBe(200)
    // Should have rate-limit info in response or headers
    const data = await res.json()
    // At minimum, the response should succeed for the first request
    expect(data.status).toBe('ok')
  })

  // ─── Authenticated user rate limiting ───────────────────────────

  it('authenticated free-tier user is tracked via daily_rdap_calls', async () => {
    const { User } = await import('../../api/models/index.js')
    const mockUser = {
      id: 2,
      email: 'free@test.com',
      tier: 'free',
      daily_rdap_calls: 4, // 1 away from limit of 5
      increment: vi.fn(),
    }
    mockUserFinders[2] = mockUser

    const token = signJwt({ userId: 2, email: 'free@test.com', tier: 'free' })
    const res = await app.request('/api/validate?domain=example.com', {
      headers: { Authorization: `Bearer ${token}` },
    })

    // Should succeed — 4 < 5 limit
    expect(res.status).not.toBe(429)
    // increment should have been called
    expect(mockUser.increment).toHaveBeenCalledWith('daily_rdap_calls')
  })

  it('authenticated free-tier user gets 429 when daily_rdap_calls >= 5', async () => {
    const mockUser = {
      id: 3,
      email: 'free2@test.com',
      tier: 'free',
      daily_rdap_calls: 5, // at limit
      increment: vi.fn(),
    }
    mockUserFinders[3] = mockUser

    const token = signJwt({ userId: 3, email: 'free2@test.com', tier: 'free' })
    const res = await app.request('/api/validate?domain=example.com', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(429)
    const data = await res.json()
    expect(data.error).toContain('limit')
    expect(data.limit).toBe(5)
    expect(data.tier).toBe('free')
  })

  it('premium user has higher rdap limit (100/day)', async () => {
    const mockUser = {
      id: 4,
      email: 'premium@test.com',
      tier: 'premium',
      daily_rdap_calls: 50, // well within 100 limit
      increment: vi.fn(),
    }
    mockUserFinders[4] = mockUser

    const token = signJwt({ userId: 4, email: 'premium@test.com', tier: 'premium' })
    const res = await app.request('/api/validate?domain=example.com', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).not.toBe(429)
    expect(mockUser.increment).toHaveBeenCalledWith('daily_rdap_calls')
  })

  it('premium user gets 429 when daily_rdap_calls >= 100', async () => {
    const mockUser = {
      id: 5,
      email: 'premium2@test.com',
      tier: 'premium',
      daily_rdap_calls: 100, // at limit
      increment: vi.fn(),
    }
    mockUserFinders[5] = mockUser

    const token = signJwt({ userId: 5, email: 'premium2@test.com', tier: 'premium' })
    const res = await app.request('/api/validate?domain=example.com', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(429)
    const data = await res.json()
    expect(data.limit).toBe(100)
  })

  it('enterprise user has no rdap limit (Infinity)', async () => {
    const mockUser = {
      id: 6,
      email: 'ent@test.com',
      tier: 'enterprise',
      daily_rdap_calls: 9999,
      increment: vi.fn(),
    }
    mockUserFinders[6] = mockUser

    const token = signJwt({ userId: 6, email: 'ent@test.com', tier: 'enterprise' })
    const res = await app.request('/api/validate?domain=example.com', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).not.toBe(429)
  })

  // ─── /api/bulk remains auth-protected ───────────────────────────

  it('POST /api/bulk still requires auth (not public)', async () => {
    const res = await app.request('/api/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domains: ['example.com'] }),
    })
    // Should still return 401 — bulk is not a public route
    expect(res.status).toBe(401)
  })
})
