import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePricingStore } from '@/stores/pricing'

// Mock the API module
vi.mock('@/lib/api', () => ({
	default: {
		get: vi.fn(),
	},
}))

import api from '@/lib/api'
const mockedGet = vi.mocked(api.get)

describe('Pricing Store', () => {
	let store: ReturnType<typeof usePricingStore>

	beforeEach(() => {
		setActivePinia(createPinia())
		store = usePricingStore()
		vi.clearAllMocks()
	})

	// ─── Initial state ────────────────────────────────────────────────

	it('has correct initial state', () => {
		expect(store.pricingResult).toBeNull()
		expect(store.loading).toBe(false)
		expect(store.error).toBeNull()
	})

	// ─── fetchPricing ────────────────────────────────────────────────

	it('fetches pricing and stores result', async () => {
		const mockPricing = {
			domain: 'example.com',
			available: true,
			prices: [
				{ provider: 'Porkbun', domain: 'example.com', available: true, register: 9.58, renew: 9.58, transfer: 9.58, currency: 'USD', buyUrl: 'https://porkbun.com/checkout/example.com' },
				{ provider: 'Cloudflare', domain: 'example.com', available: true, register: 10.11, renew: 10.11, transfer: 10.11, currency: 'USD' },
				{ provider: 'GoDaddy', domain: 'example.com', available: true, register: 11.99, renew: 21.99, transfer: null, currency: 'USD' },
			],
			providersConfigured: ['Porkbun', 'Cloudflare', 'GoDaddy'],
		}
		mockedGet.mockResolvedValueOnce({ data: mockPricing })

		await store.fetchPricing('example.com')
		expect(mockedGet).toHaveBeenCalledWith('/pricing', { params: { domain: 'example.com' } })
		expect(store.pricingResult).toEqual(mockPricing)
		expect(store.loading).toBe(false)
		expect(store.error).toBeNull()
	})

	it('sets loading state during fetch', async () => {
		let resolveFetch!: (v: any) => void
		const pending = new Promise((resolve) => { resolveFetch = resolve })
		mockedGet.mockReturnValueOnce(pending)

		const fetchPromise = store.fetchPricing('test.com')
		expect(store.loading).toBe(true)

		resolveFetch({ data: { domain: 'test.com', available: null, prices: [], providersConfigured: [] } })
		await fetchPromise
		expect(store.loading).toBe(false)
	})

	it('handles fetch errors', async () => {
		mockedGet.mockRejectedValueOnce({ response: { data: { error: 'Domain invalid' } } })

		await store.fetchPricing('bad!!')
		expect(store.error).toBe('Domain invalid')
		expect(store.pricingResult).toBeNull()
		expect(store.loading).toBe(false)
	})

	it('handles network errors with friendly message', async () => {
		mockedGet.mockRejectedValueOnce({ friendlyMessage: 'Unable to connect to server.' })

		await store.fetchPricing('test.com')
		expect(store.error).toBe('Unable to connect to server.')
		expect(store.pricingResult).toBeNull()
	})

	it('handles generic errors', async () => {
		mockedGet.mockRejectedValueOnce(new Error('Unexpected'))

		await store.fetchPricing('test.com')
		expect(store.error).toBe('Unexpected')
	})

	// ─── clearPricing ────────────────────────────────────────────────

	it('clearPricing resets pricing state', async () => {
		const mockPricing = {
			domain: 'example.com',
			available: true,
			prices: [],
			providersConfigured: [],
		}
		mockedGet.mockResolvedValueOnce({ data: mockPricing })

		await store.fetchPricing('example.com')
		expect(store.pricingResult).not.toBeNull()

		store.clearPricing()
		expect(store.pricingResult).toBeNull()
		expect(store.loading).toBe(false)
		expect(store.error).toBeNull()
	})

	it('clears previous error on new fetch', async () => {
		mockedGet.mockRejectedValueOnce({ response: { data: { error: 'Failed' } } })
		await store.fetchPricing('bad.com')
		expect(store.error).toBe('Failed')

		const mockPricing = { domain: 'good.com', available: true, prices: [], providersConfigured: [] }
		mockedGet.mockResolvedValueOnce({ data: mockPricing })
		await store.fetchPricing('good.com')
		expect(store.error).toBeNull()
		expect(store.pricingResult).toEqual(mockPricing)
	})
})
