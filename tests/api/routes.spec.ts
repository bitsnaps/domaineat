/**
 * API route tests — tests the platform-agnostic api/app.ts
 * by mocking the DB module at the models boundary.
 *
 * Updated: all protected routes now require a valid JWT Bearer token
 * (auth middleware was added in P7-4).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { signJwt } from '../../api/auth.js'

// Helper to generate auth headers for protected routes
function authHeaders(extra?: Record<string, string>) {
  const token = signJwt({ userId: 1, email: 'test@test.com', tier: 'premium' })
  return { Authorization: `Bearer ${token}`, ...extra }
}

// Mock the db module before importing the app
const mockDomains: any[] = []
const mockLedger: any[] = []
const mockProspects: any[] = []

vi.mock('../../api/models/index.js', () => ({
  sequelize: {
    authenticate: vi.fn(),
  },
  User: {
    findByPk: vi.fn(async (id: number | string) => {
      // Return a user for auth-related tests
      if (String(id) === '1') return { id: 1, email: 'test@test.com', tier: 'premium', password_hash: 'hash', llm_api_key_encrypted: null, toJSON: () => ({ id: 1, email: 'test@test.com', tier: 'premium' }) }
      return null
    }),
    findOne: vi.fn(async () => null),
    create: vi.fn(async (data: any) => ({ id: 1, ...data })),
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
  Ledger: {
    findAll: vi.fn(async () => mockLedger),
    create: vi.fn(async (data: any) => {
      const entry = { id: mockLedger.length + 1, ...data, update: vi.fn(), destroy: vi.fn() }
      mockLedger.push(entry)
      return entry
    }),
    findByPk: vi.fn(async (id: number | string) => mockLedger.find((e) => String(e.id) === String(id)) || null),
  },
  Prospect: {
    findAll: vi.fn(async () => mockProspects),
    findByPk: vi.fn(async (id: number | string) => mockProspects.find((p) => String(p.id) === String(id)) || null),
    create: vi.fn(async (data: any) => {
      const prospect = { id: mockProspects.length + 1, ...data, update: vi.fn(), destroy: vi.fn() }
      mockProspects.push(prospect)
      return prospect
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

// Import the REAL app (after mocking — mock must be in place first)
import { app } from '../../api/app'

describe('API Routes (real api/app.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDomains.length = 0
    mockLedger.length = 0
    mockProspects.length = 0
  })

  // ─── Health (public — no auth needed) ────────────────────────

  it('GET /api/health returns ok when DB is connected', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('ok')
    expect(data.database).toBe('connected')
  })

  it('GET /api/health returns 503 when DB is disconnected', async () => {
    const { sequelize } = await import('../../api/models/index.js')
    ;(sequelize.authenticate as any).mockRejectedValueOnce(new Error('connection refused'))
    const res = await app.request('/api/health')
    expect(res.status).toBe(503)
    const data = await res.json()
    expect(data.status).toBe('error')
    expect(data.database).toBe('disconnected')
  })

  // ─── Domains (protected — auth required) ──────────────────────

  it('GET /api/domains returns domains for authenticated user', async () => {
    const res = await app.request('/api/domains', { headers: authHeaders() })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toBeInstanceOf(Array)
  })

  it('GET /api/domains returns domains for a user', async () => {
    mockDomains.push({ id: 1, user_id: 1, domain_name: 'example.com' })
    const res = await app.request('/api/domains', { headers: authHeaders() })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toBeInstanceOf(Array)
  })

  it('POST /api/domains creates a domain', async () => {
    const res = await app.request('/api/domains', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ user_id: 1, domain_name: 'newdomain.io' }),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.domain_name).toBe('newdomain.io')
  })

  it('GET /api/domains/:id returns a domain', async () => {
    mockDomains.push({ id: 42, user_id: 1, domain_name: 'found.com' })
    const res = await app.request('/api/domains/42', { headers: authHeaders() })
    expect(res.status).toBe(200)
  })

  it('GET /api/domains/:id returns 404 when not found', async () => {
    const res = await app.request('/api/domains/9999', { headers: authHeaders() })
    expect(res.status).toBe(404)
  })

  it('PUT /api/domains/:id updates a domain', async () => {
    const domain = { id: 1, user_id: 1, domain_name: 'old.com', update: vi.fn() }
    mockDomains.push(domain)
    const res = await app.request('/api/domains/1', {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ domain_name: 'new.com' }),
    })
    expect(res.status).toBe(200)
    expect(domain.update).toHaveBeenCalledWith({ domain_name: 'new.com' })
  })

  it('PUT /api/domains/:id returns 404 when not found', async () => {
    const res = await app.request('/api/domains/9999', {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ domain_name: 'x.com' }),
    })
    expect(res.status).toBe(404)
  })

  it('DELETE /api/domains/:id deletes a domain', async () => {
    const domain = { id: 1, user_id: 1, destroy: vi.fn() }
    mockDomains.push(domain)
    const res = await app.request('/api/domains/1', { method: 'DELETE', headers: authHeaders() })
    expect(res.status).toBe(200)
    expect(domain.destroy).toHaveBeenCalled()
  })

  it('DELETE /api/domains/:id returns 404 when not found', async () => {
    const res = await app.request('/api/domains/9999', { method: 'DELETE', headers: authHeaders() })
    expect(res.status).toBe(404)
  })

  it('POST /api/domains returns 400 on validation error', async () => {
    const { Domain } = await import('../../api/models/index.js')
    ;(Domain.create as any).mockRejectedValueOnce(new Error('notNull Violation'))
    const res = await app.request('/api/domains', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ domain_name: '' }),
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('notNull')
  })

  // ─── Ledger (protected — auth required) ───────────────────────

  it('GET /api/ledger returns entries', async () => {
    const res = await app.request('/api/ledger', { headers: authHeaders() })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toBeInstanceOf(Array)
  })

  it('GET /api/ledger filters by domain_id', async () => {
    const res = await app.request('/api/ledger?domain_id=1', { headers: authHeaders() })
    expect(res.status).toBe(200)
  })

  it('POST /api/ledger creates an entry', async () => {
    mockDomains.push({ id: 1, user_id: 1, domain_name: 'test.com' })
    const res = await app.request('/api/ledger', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ domain_id: 1, amount: 9.99, transaction_type: 'renewal' }),
    })
    expect(res.status).toBe(201)
  })

  it('POST /api/ledger returns 400 on error', async () => {
    mockDomains.push({ id: 1, user_id: 1, domain_name: 'test.com' })
    const { Ledger } = await import('../../api/models/index.js')
    ;(Ledger.create as any).mockRejectedValueOnce(new Error('validation failed'))
    const res = await app.request('/api/ledger', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ domain_id: 1 }),
    })
    expect(res.status).toBe(400)
  })

  // ─── Prospects (protected — auth required) ────────────────────

  it('GET /api/prospects returns prospects', async () => {
    const res = await app.request('/api/prospects', { headers: authHeaders() })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toBeInstanceOf(Array)
  })

  it('GET /api/prospects filters by domain_id', async () => {
    const res = await app.request('/api/prospects?domain_id=1', { headers: authHeaders() })
    expect(res.status).toBe(200)
  })

  it('POST /api/prospects creates a prospect', async () => {
    mockDomains.push({ id: 1, user_id: 1, domain_name: 'test.com' })
    const res = await app.request('/api/prospects', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ domain_id: 1, contact_name: 'Jane', contact_email: 'jane@x.com' }),
    })
    expect(res.status).toBe(201)
  })

  it('POST /api/prospects returns 400 on error', async () => {
    mockDomains.push({ id: 1, user_id: 1, domain_name: 'test.com' })
    const { Prospect } = await import('../../api/models/index.js')
    ;(Prospect.create as any).mockRejectedValueOnce(new Error('validation error'))
    const res = await app.request('/api/prospects', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ domain_id: 1 }),
    })
    expect(res.status).toBe(400)
  })

  it('PUT /api/prospects/:id updates a prospect', async () => {
    mockDomains.push({ id: 1, user_id: 1, domain_name: 'test.com' })
    const prospect = { id: 1, domain_id: 1, update: vi.fn() }
    mockProspects.push(prospect)
    const res = await app.request('/api/prospects/1', {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ outreach_status: 'contacted' }),
    })
    expect(res.status).toBe(200)
    expect(prospect.update).toHaveBeenCalled()
  })

  it('PUT /api/prospects/:id returns 404 when not found', async () => {
    const res = await app.request('/api/prospects/9999', {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ outreach_status: 'contacted' }),
    })
    expect(res.status).toBe(404)
  })

  it('DELETE /api/prospects/:id deletes a prospect', async () => {
    mockDomains.push({ id: 1, user_id: 1, domain_name: 'test.com' })
    const prospect = { id: 1, domain_id: 1, destroy: vi.fn() }
    mockProspects.push(prospect)
    const res = await app.request('/api/prospects/1', { method: 'DELETE', headers: authHeaders() })
    expect(res.status).toBe(200)
    expect(prospect.destroy).toHaveBeenCalled()
  })

  it('DELETE /api/prospects/:id returns 404 when not found', async () => {
    const res = await app.request('/api/prospects/9999', { method: 'DELETE', headers: authHeaders() })
    expect(res.status).toBe(404)
  })
})
