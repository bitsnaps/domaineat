/**
 * Pricing API route tests — tests the /api/pricing and /api/pricing/providers endpoints.
 * Mocks the pricing module to test route handling without hitting external APIs.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the db module before importing the app
vi.mock('../../api/models/index.js', () => ({
  sequelize: { authenticate: vi.fn() },
  User: {
    findByPk: vi.fn(async () => ({ id: 1, email: 'test@test.com', tier: 'premium', password_hash: 'hash', llm_api_key_encrypted: null, daily_rdap_calls: 0, daily_ai_calls: 0 })),
    findOne: vi.fn(async () => null),
    create: vi.fn(async (data: any) => ({ id: 1, ...data })),
  },
  Domain: {
    findAll: vi.fn(async () => []),
    count: vi.fn(async () => 0),
    findByPk: vi.fn(async () => null),
    findOne: vi.fn(async () => null),
    create: vi.fn(async (data: any) => ({ id: 1, ...data })),
  },
  Ledger: { findAll: vi.fn(async () => []), findByPk: vi.fn(async () => null) },
  Prospect: { findAll: vi.fn(async () => []), findByPk: vi.fn(async () => null) },
  Notification: { findAll: vi.fn(async () => []), findByPk: vi.fn(async () => null), create: vi.fn() },
}))

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn(async () => '$2a$10$hashedpassword'), compare: vi.fn(async () => true) },
}))

// Mock the pricing module
const mockGetDomainPricing = vi.fn()
const mockGetProviderStatus = vi.fn()

vi.mock('../../api/pricing/index.js', () => ({
  getDomainPricing: (...args: any[]) => mockGetDomainPricing(...args),
  getProviderStatus: (...args: any[]) => mockGetProviderStatus(...args),
}))

import { app } from '../../api/app'

describe('GET /api/pricing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetDomainPricing.mockResolvedValue({
      domain: 'example.com',
      available: true,
      prices: [
        { provider: 'Porkbun', domain: 'example.com', available: true, register: 9.58, renew: 9.58, transfer: null, currency: 'USD', buyUrl: 'https://porkbun.com/checkout/search?q=example.com' },
        { provider: 'Cloudflare', domain: 'example.com', available: true, register: 10.11, renew: 10.11, transfer: null, currency: 'USD', buyUrl: 'https://www.cloudflare.com/products/registrar/?query=example.com' },
        { provider: 'GoDaddy', domain: 'example.com', available: true, register: 11.99, renew: 21.99, transfer: null, currency: 'USD', buyUrl: 'https://www.godaddy.com/domainsearch/find?domainToCheck=example.com' },
      ],
      providersConfigured: ['Porkbun', 'Cloudflare', 'GoDaddy'],
    })
  })

  it('returns pricing for a valid domain', async () => {
    const res = await app.request('/api/pricing?domain=example.com')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.domain).toBe('example.com')
    expect(data.prices).toBeDefined()
    expect(Array.isArray(data.prices)).toBe(true)
    expect(data.prices.length).toBeGreaterThan(0)
  })

  it('returns prices sorted by registration price (lowest first)', async () => {
    const res = await app.request('/api/pricing?domain=example.com')
    const data = await res.json()
    const prices = data.prices.map((p: any) => p.register).filter((p: any) => p !== null)
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1])
    }
  })

  it('includes availability information', async () => {
    const res = await app.request('/api/pricing?domain=example.com')
    const data = await res.json()
    expect(typeof data.available).toBe('boolean')
  })

  it('returns 400 when domain param is missing', async () => {
    const res = await app.request('/api/pricing')
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/domain/i)
  })

  it('returns 400 for invalid domain format', async () => {
    const res = await app.request('/api/pricing?domain=!!bad!!')
    expect(res.status).toBe(400)
  })

  it('is accessible without auth token (public route)', async () => {
    const res = await app.request('/api/pricing?domain=test.com')
    expect(res.status).not.toBe(401)
  })

  it('handles provider failures gracefully', async () => {
    mockGetDomainPricing.mockResolvedValue({
      domain: 'example.com',
      available: null,
      prices: [],
      providersConfigured: [],
    })
    const res = await app.request('/api/pricing?domain=example.com')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.prices).toEqual([])
  })

  it('strips www prefix', async () => {
    await app.request('/api/pricing?domain=www.example.com')
    expect(mockGetDomainPricing).toHaveBeenCalledWith('example.com')
  })

  it('normalizes domain to lowercase', async () => {
    await app.request('/api/pricing?domain=Example.COM')
    expect(mockGetDomainPricing).toHaveBeenCalledWith('example.com')
  })
})

describe('GET /api/pricing/providers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns provider status list', async () => {
    mockGetProviderStatus.mockReturnValue([
      { name: 'Porkbun', configured: true },
      { name: 'Cloudflare', configured: true },
      { name: 'GoDaddy', configured: true },
    ])
    const res = await app.request('/api/pricing/providers')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBe(3)
    expect(data[0].name).toBe('Porkbun')
    expect(typeof data[0].configured).toBe('boolean')
  })

  it('is accessible without auth token (public route)', async () => {
    const res = await app.request('/api/pricing/providers')
    expect(res.status).not.toBe(401)
  })
})
