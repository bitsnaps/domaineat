/**
 * from-lookup API tests
 *
 * Tests for POST /api/domains/from-lookup covering:
 * 1. 401 without auth
 * 2. 400 without domain_name
 * 3. 201 success with RDAP data (taken domain)
 * 4. 201 success when domain not found (available)
 * 5. Error handling
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { signJwt } from '../../api/auth.js'

// Helper to generate auth headers for protected routes
function authHeaders(extra?: Record<string, string>) {
  const token = signJwt({ userId: 1, email: 'test@test.com', tier: 'premium' })
  return { Authorization: `Bearer ${token}`, ...extra }
}

// ─── Mock data ────────────────────────────────────────────────────────

const mockDomains: any[] = []

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
  Watchlist: { findAll: vi.fn(async () => []), findOne: vi.fn(async () => null), count: vi.fn(async () => 0), findByPk: vi.fn(async () => null), create: vi.fn(), destroy: vi.fn() },
  Wishlist: { findAll: vi.fn(async () => []), findOne: vi.fn(async () => null), count: vi.fn(async () => 0), findByPk: vi.fn(async () => null), create: vi.fn(), destroy: vi.fn() },
  Notification: { findAll: vi.fn(async () => []), findByPk: vi.fn(async () => null), create: vi.fn() },
  Ledger: { findAll: vi.fn(async () => []), create: vi.fn() },
  Prospect: { findAll: vi.fn(async () => []), findByPk: vi.fn(async () => null), findOne: vi.fn(async () => null), create: vi.fn() },
  DomainTag: { findAll: vi.fn(async () => []), findOne: vi.fn(async () => null), findOrCreate: vi.fn(async () => [{ id: 1 }, true]), create: vi.fn(), destroy: vi.fn() },
}))

// Mock bcryptjs for auth routes
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(async () => '$2a$10$hashedpassword'),
    compare: vi.fn(async () => true),
  },
}))

// Mock domain-analysis for RDAP lookups
vi.mock('../../api/domain-analysis.js', () => ({
  rdapLookup: vi.fn(async (domain: string) => {
    // Simulate: domain with "available" in name is available (null = no RDAP record)
    if (domain.includes('available')) return null
    return { registrar: 'GoDaddy', expiryDate: '2027-01-01', nameservers: ['ns1.example.com'], status: ['client transfer prohibited'] }
  }),
}))

import { app } from '../../api/app'

describe('POST /api/domains/from-lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDomains.length = 0
  })

  it('returns 401 without auth token', async () => {
    const res = await app.request('/api/domains/from-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain_name: 'example.com' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 without domain_name', async () => {
    const res = await app.request('/api/domains/from-lookup', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('domain_name')
  })

  it('returns 201 with RDAP data for a taken domain', async () => {
    const res = await app.request('/api/domains/from-lookup', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ domain_name: 'taken.com' }),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.domain_name).toBe('taken.com')
    expect(data.registrar).toBe('GoDaddy')
    expect(data.status).toBe('active')
    expect(data.user_id).toBe(1)
  })

  it('returns 201 for an available domain (no RDAP record)', async () => {
    const res = await app.request('/api/domains/from-lookup', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ domain_name: 'available.com' }),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.domain_name).toBe('available.com')
    expect(data.registrar).toBe('Unknown')
    expect(data.status).toBe('pending_delete')
  })

  it('sanitizes domain name (lowercase, strip www.)', async () => {
    const res = await app.request('/api/domains/from-lookup', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ domain_name: 'WWW.Example.COM' }),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.domain_name).toBe('example.com')
  })

  it('returns 502 when RDAP lookup throws an error', async () => {
    const { rdapLookup } = await import('../../api/domain-analysis.js')
    ;(rdapLookup as any).mockRejectedValueOnce(new Error('RDAP timeout'))

    const res = await app.request('/api/domains/from-lookup', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ domain_name: 'failing.com' }),
    })
    expect(res.status).toBe(502)
    const data = await res.json()
    expect(data.error).toContain('Failed to import domain')
  })
})
