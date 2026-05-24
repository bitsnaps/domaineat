/**
 * Tests for /api/validate, /api/search, /api/bulk routes.
 * Mocks the domain-analysis and dns-check modules at the boundary.
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

// Mock the DB module (required by app.ts)
vi.mock('../../api/models/index.js', () => ({
  sequelize: { authenticate: vi.fn() },
  User: {},
  Domain: { findAll: vi.fn(async () => []), count: vi.fn(async () => 0), findByPk: vi.fn(async () => null), create: vi.fn() },
  Ledger: { findAll: vi.fn(async () => []), create: vi.fn() },
  Prospect: { findAll: vi.fn(async () => []), findByPk: vi.fn(async () => null), create: vi.fn() },
}))

// Mock bcryptjs for auth routes
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(async () => '$2a$10$hashedpassword'),
    compare: vi.fn(async () => true),
  },
}))

// Mock domain-analysis (rdapLookup, checkExtension)
vi.mock('../../api/domain-analysis.js', () => ({
  rdapLookup: vi.fn(),
  checkExtension: vi.fn(),
  parseDomain: vi.fn(),
  checkAltExtensions: vi.fn(),
  analyzeDomain: vi.fn(),
}))

// Mock dns-check (fullDnsCheck)
vi.mock('../../api/dns-check.js', () => ({
  fullDnsCheck: vi.fn(),
  resolveIp: vi.fn(),
  resolveNameservers: vi.fn(),
  checkSslExpiry: vi.fn(),
}))

import { app } from '../../api/app'
import { rdapLookup, checkExtension } from '../../api/domain-analysis.js'
import { fullDnsCheck } from '../../api/dns-check.js'

describe('API: Domain Validation (/api/validate)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when domain param is missing', async () => {
    const res = await app.request('/api/validate', { headers: authHeaders() })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('domain')
  })

  it('returns 400 for invalid domain format', async () => {
    const res = await app.request('/api/validate?domain=notadomain', { headers: authHeaders() })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Invalid domain format')
  })

  it('returns available=true when RDAP finds no record', async () => {
    ;(rdapLookup as any).mockRejectedValue(new Error('No RDAP server'))
    ;(fullDnsCheck as any).mockResolvedValue({
      domain: 'available123.com',
      resolved: false,
      ip: null,
      nameservers: [],
      ssl_expiry: null,
      checked_at: '2026-01-01T00:00:00Z',
    })

    const res = await app.request('/api/validate?domain=available123.com', { headers: authHeaders() })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('ok')
    expect(data.domain).toBe('available123.com')
    expect(data.available).toBe(true)
    expect(data.whois).toBeNull()
    expect(data.dns).toBeDefined()
    expect(data.dns.resolved).toBe(false)
  })

  it('returns available=false with whois data when domain is registered', async () => {
    ;(rdapLookup as any).mockResolvedValue({
      domain: 'google.com',
      registrar: 'MarkMonitor',
      creationDate: '1997-09-15',
      expiryDate: '2028-09-13',
      nameservers: ['ns1.google.com', 'ns2.google.com'],
      status: ['client transfer prohibited'],
    })
    ;(fullDnsCheck as any).mockResolvedValue({
      domain: 'google.com',
      resolved: true,
      ip: '142.250.80.46',
      nameservers: ['ns1.google.com'],
      ssl_expiry: '2026-06-01T00:00:00Z',
      checked_at: '2026-01-01T00:00:00Z',
    })

    const res = await app.request('/api/validate?domain=google.com', { headers: authHeaders() })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.available).toBe(false)
    expect(data.whois).toBeDefined()
    expect(data.whois.registrar).toBe('MarkMonitor')
    expect(data.whois.expiryDate).toBe('2028-09-13')
    expect(data.dns.resolved).toBe(true)
    expect(data.dns.ip).toBe('142.250.80.46')
  })

  it('strips www. prefix from domain', async () => {
    ;(rdapLookup as any).mockRejectedValue(new Error('No RDAP'))
    ;(fullDnsCheck as any).mockResolvedValue({
      domain: 'example.com', resolved: false, ip: null, nameservers: [], ssl_expiry: null, checked_at: '',
    })

    const res = await app.request('/api/validate?domain=www.example.com', { headers: authHeaders() })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.domain).toBe('example.com')
  })

  it('handles RDAP failure gracefully', async () => {
    ;(rdapLookup as any).mockRejectedValue(new Error('RDAP timeout'))
    ;(fullDnsCheck as any).mockRejectedValue(new Error('DNS timeout'))

    const res = await app.request('/api/validate?domain=example.com', { headers: authHeaders() })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.available).toBe(true)
    expect(data.whois).toBeNull()
    expect(data.dns).toBeNull()
  })
})

describe('API: Domain Search (/api/search)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when domain param is missing', async () => {
    const res = await app.request('/api/search', { headers: authHeaders() })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('domain')
  })

  it('returns extension results for a domain', async () => {
    ;(checkExtension as any).mockImplementation(async (sld: string, tld: string) => ({
      domain: `${sld}.${tld}`,
      tld,
      available: tld !== 'com',
      registrar: tld === 'com' ? 'GoDaddy' : null,
      expiryDate: null,
    }))

    const res = await app.request('/api/search?domain=example&tlds=com,org,net', { headers: authHeaders() })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('ok')
    expect(data.sld).toBe('example')
    expect(data.results).toHaveLength(3)
    expect(data.results[0].domain).toBe('example.com')
    expect(data.results[0].available).toBe(false)
    expect(data.results[1].available).toBe(true)
  })

  it('uses default TLDs when tlds param is omitted', async () => {
    ;(checkExtension as any).mockResolvedValue({
      domain: 'test.com', tld: 'com', available: true, registrar: null, expiryDate: null,
    })

    const res = await app.request('/api/search?domain=test', { headers: authHeaders() })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.sld).toBe('test')
    // Should have called checkExtension for each default TLD
    expect(checkExtension).toHaveBeenCalledTimes(10)
  })

  it('strips leading dots from TLDs', async () => {
    ;(checkExtension as any).mockResolvedValue({
      domain: 'example.io', tld: 'io', available: true, registrar: null, expiryDate: null,
    })

    const res = await app.request('/api/search?domain=example&tlds=.io,.dev', { headers: authHeaders() })
    expect(res.status).toBe(200)
    // Check that dots were stripped — the TLD passed to checkExtension should not start with .
    const calls = (checkExtension as any).mock.calls
    expect(calls[0][1]).toBe('io')
    expect(calls[1][1]).toBe('dev')
  })
})

describe('API: Bulk Domain Lookup (/api/bulk)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when domains array is missing', async () => {
    const res = await app.request('/api/bulk', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('domains')
  })

  it('returns 400 when domains array is empty', async () => {
    const res = await app.request('/api/bulk', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ domains: [] }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when more than 50 domains', async () => {
    const domains = Array.from({ length: 51 }, (_, i) => `domain${i}.com`)
    const res = await app.request('/api/bulk', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ domains }),
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('50')
  })

  it('returns 400 when all domains are invalid', async () => {
    const res = await app.request('/api/bulk', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ domains: ['notvalid', '???.com', ''] }),
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('No valid domains')
  })

  it('returns results for valid domains', async () => {
    ;(rdapLookup as any).mockImplementation((domain: string) => {
      if (domain === 'google.com') {
        return Promise.resolve({
          domain, registrar: 'MarkMonitor', creationDate: '1997-09-15',
          expiryDate: '2028-09-13', nameservers: [], status: [],
        })
      }
      return Promise.reject(new Error('No RDAP'))
    })
    ;(fullDnsCheck as any).mockResolvedValue({
      domain: 'google.com', resolved: true, ip: '1.2.3.4', nameservers: [], ssl_expiry: null, checked_at: '',
    })

    const res = await app.request('/api/bulk', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ domains: ['google.com', 'available123.xyz'] }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('ok')
    expect(data.results).toHaveLength(2)
    // google.com should be unavailable
    expect(data.results[0].domain).toBe('google.com')
    expect(data.results[0].available).toBe(false)
    // available123.xyz should be available
    expect(data.results[1].domain).toBe('available123.xyz')
    expect(data.results[1].available).toBe(true)
  })

  it('filters out invalid domains from the request', async () => {
    ;(rdapLookup as any).mockRejectedValue(new Error('No RDAP'))
    ;(fullDnsCheck as any).mockResolvedValue({
      domain: 'valid.com', resolved: false, ip: null, nameservers: [], ssl_expiry: null, checked_at: '',
    })

    const res = await app.request('/api/bulk', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ domains: ['valid.com', 'notadomain', 'another.com'] }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    // Only valid domains should be in results
    const resultDomains = data.results.map((r: any) => r.domain)
    expect(resultDomains).toContain('valid.com')
    expect(resultDomains).toContain('another.com')
    expect(resultDomains).not.toContain('notadomain')
  })

  it('strips www. prefix from bulk domains', async () => {
    ;(rdapLookup as any).mockRejectedValue(new Error('No RDAP'))
    ;(fullDnsCheck as any).mockResolvedValue({
      domain: 'example.com', resolved: false, ip: null, nameservers: [], ssl_expiry: null, checked_at: '',
    })

    const res = await app.request('/api/bulk', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ domains: ['www.example.com'] }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.results[0].domain).toBe('example.com')
  })
})
