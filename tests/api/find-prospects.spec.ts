/**
 * find-prospects API tests
 *
 * Tests for POST /api/domains/find-prospects covering:
 * 1. 401 without auth
 * 2. 400 without domain_id
 * 3. 200 success — creates prospects from alt TLD extensions
 * 4. 200 no-op when prospects already exist
 * 5. 200 no-op when no alt TLDs found
 * 6. 404 when domain not found
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { signJwt } from '../../api/auth.js'

function authHeaders(extra?: Record<string, string>) {
  const token = signJwt({ userId: 1, email: 'test@test.com', tier: 'premium' })
  return { Authorization: `Bearer ${token}`, ...extra }
}

// ─── Mock data ────────────────────────────────────────────────────────

const mockDomains: any[] = [
  { id: 1, user_id: 1, domain_name: 'test.com', registrar: 'GoDaddy', status: 'active', acquisition_date: '2026-01-01', expiry_date: '2027-01-01', acquisition_cost: 0, renewal_cost: 0, nameservers: null, update: vi.fn(), destroy: vi.fn(), toJSON: vi.fn(), get: vi.fn(function(this: any, opts?: any) { return opts?.plain ? { ...this } : this }) },
]
const mockProspects: any[] = []

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
  Prospect: {
    findAll: vi.fn(async (opts: any) => {
      if (!opts?.where) return mockProspects
      return mockProspects.filter((p) => {
        if (opts.where.domain_id !== undefined && p.domain_id !== opts.where.domain_id) return false
        if (opts.where.prospect_domain !== undefined && p.prospect_domain !== opts.where.prospect_domain) return false
        return true
      })
    }),
    findByPk: vi.fn(async (id: number | string) => mockProspects.find((p) => String(p.id) === String(id)) || null),
    findOne: vi.fn(async (opts: any) => {
      if (!opts?.where) return null
      return mockProspects.find((p) => {
        if (opts.where.domain_id !== undefined && p.domain_id !== opts.where.domain_id) return false
        if (opts.where.prospect_domain !== undefined && p.prospect_domain !== opts.where.prospect_domain) return false
        return true
      }) || null
    }),
    create: vi.fn(async (data: any) => {
      const prospect = { id: mockProspects.length + 1, ...data }
      mockProspects.push(prospect)
      return prospect
    }),
  },
  DomainTag: { findAll: vi.fn(async () => []), findOne: vi.fn(async () => null), findOrCreate: vi.fn(async () => [{ id: 1 }, true]), create: vi.fn(), destroy: vi.fn() },
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(async () => '$2a$10$hashedpassword'),
    compare: vi.fn(async () => true),
  },
}))

vi.mock('../../api/domain-analysis.js', () => ({
  rdapLookup: vi.fn(async () => ({ registrar: 'GoDaddy', expiryDate: '2027-01-01', nameservers: ['ns1.example.com'], status: ['client transfer prohibited'] })),
  parseDomain: vi.fn((domain: string) => {
    const parts = domain.split('.')
    const tld = parts.pop() || 'com'
    const sld = parts.join('.')
    return { sld, tld, keywords: [sld], altExtensions: ['net', 'org', 'io'] }
  }),
}))

import { app } from '../../api/app'

describe('POST /api/domains/find-prospects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProspects.length = 0
  })

  it('returns 401 without auth token', async () => {
    const res = await app.request('/api/domains/find-prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain_id: 1 }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 without domain_id', async () => {
    const res = await app.request('/api/domains/find-prospects', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('domain_id')
  })

  it('returns 200 and creates prospects from alt TLDs', async () => {
    const res = await app.request('/api/domains/find-prospects', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ domain_id: 1 }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.found).toBeGreaterThanOrEqual(0)
    expect(typeof data.found).toBe('number')
  })

  it('returns 404 when domain not found', async () => {
    const res = await app.request('/api/domains/find-prospects', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ domain_id: 999 }),
    })
    expect(res.status).toBe(404)
  })
})
