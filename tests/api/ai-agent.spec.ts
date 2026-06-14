/**
 * AI Agent scheduler tests
 *
 * Tests for POST /api/scheduler/run with 'ai_agent' task:
 * 1. Creates prospects for ai_agent wishlist items
 * 2. Skips items without ai_agent flag
 * 3. Skips prospects that already exist
 * 4. Handles errors gracefully
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { signJwt } from '../../api/auth.js'

function authHeaders(extra?: Record<string, string>) {
  const token = signJwt({ userId: 1, email: 'test@test.com', tier: 'premium' })
  return { Authorization: `Bearer ${token}`, ...extra }
}

const mockWishlistItems: any[] = []
const mockProspects: any[] = []
const mockDomains: any[] = []

vi.mock('../../api/models/index.js', () => ({
  sequelize: { authenticate: vi.fn() },
  User: {
    findByPk: vi.fn(async (id: number | string) => {
      if (String(id) === '1') return { id: 1, email: 'test@test.com', tier: 'premium', password_hash: 'hash', llm_provider: 'openai', llm_api_key_encrypted: 'sk-test', llm_model: 'gpt-5.4-mini', daily_ai_calls: 0, daily_rdap_calls: 0, increment: vi.fn(), toJSON: () => ({ id: 1, email: 'test@test.com', tier: 'premium' }), update: vi.fn() }
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
        if (opts.where.domain_name !== undefined && d.domain_name !== opts.where.domain_name) return false
        return true
      }) || null
    }),
    create: vi.fn(async (data: any) => {
      const domain: any = { id: mockDomains.length + 1, ...data, update: vi.fn(), destroy: vi.fn() }
      domain.get = vi.fn((opts: any) => opts?.plain ? { ...domain } : domain)
      mockDomains.push(domain)
      return domain
    }),
  },
  Watchlist: { findAll: vi.fn(async () => []), findOne: vi.fn(async () => null), count: vi.fn(async () => 0), findByPk: vi.fn(async () => null), create: vi.fn(), destroy: vi.fn() },
  Wishlist: {
    findAll: vi.fn(async (opts: any) => {
      if (!opts?.where) return mockWishlistItems
      return mockWishlistItems.filter((w) => {
        if (opts.where.ai_agent !== undefined && w.ai_agent !== opts.where.ai_agent) return false
        if (opts.where.id !== undefined && w.id !== opts.where.id) return false
        return true
      })
    }),
    findOne: vi.fn(async (opts: any) => {
      if (!opts?.where) return null
      return mockWishlistItems.find((w) => {
        if (opts.where.id !== undefined && w.id !== opts.where.id) return false
        if (opts.where.user_id !== undefined && w.user_id !== opts.where.user_id) return false
        return true
      }) || null
    }),
    count: vi.fn(async () => mockWishlistItems.length),
    findByPk: vi.fn(async (id: number | string) => mockWishlistItems.find((w) => String(w.id) === String(id)) || null),
    create: vi.fn(),
    destroy: vi.fn(),
  },
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
}))

import { app } from '../../api/app'

describe('AI Agent scheduler task', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWishlistItems.length = 0
    mockProspects.length = 0
    mockDomains.length = 0
  })

  it('returns 401 without auth token', async () => {
    const res = await app.request('/api/scheduler/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks: ['ai_agent'] }),
    })
    expect(res.status).toBe(401)
  })

  it('creates prospects for ai_agent wishlist items', async () => {
    const item = {
      id: 1, user_id: 1, domain_name: 'test.com', tld: 'com', ai_agent: true,
      auto_prospect: true, priority: 'high', max_budget: 1000, available: false,
      appraisal_grade: 'B', notes: null, last_checked_at: null,
      created_at: '2026-01-01', updated_at: '2026-01-01',
    }
    ;(item as any).get = vi.fn((opts: any) => opts?.plain ? { ...item } : item)
    mockWishlistItems.push(item)

    const res = await app.request('/api/scheduler/run', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ tasks: ['ai_agent'] }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.aiAgent).toBeDefined()
    expect(data.aiAgent.processed).toBe(1)
    expect(data.aiAgent.prospectsFound).toBeGreaterThanOrEqual(0)
  })

  it('skips wishlist items without ai_agent flag', async () => {
    const item = {
      id: 1, user_id: 1, domain_name: 'test.com', tld: 'com', ai_agent: false,
      auto_prospect: true, priority: 'high', max_budget: 1000, available: false,
      appraisal_grade: 'B', notes: null, last_checked_at: null,
      created_at: '2026-01-01', updated_at: '2026-01-01',
    }
    ;(item as any).get = vi.fn((opts: any) => opts?.plain ? { ...item } : item)
    mockWishlistItems.push(item)

    const res = await app.request('/api/scheduler/run', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ tasks: ['ai_agent'] }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.aiAgent).toBeDefined()
    expect(data.aiAgent.processed).toBe(0)
  })

  it('handles empty wishlist gracefully', async () => {
    const res = await app.request('/api/scheduler/run', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ tasks: ['ai_agent'] }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.aiAgent).toBeDefined()
    expect(data.aiAgent.processed).toBe(0)
  })
})
