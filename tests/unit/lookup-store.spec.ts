import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useLookupStore } from '@/stores/lookup'

// Mock the API module
vi.mock('@/lib/api', () => ({
	default: {
		get: vi.fn(),
	},
}))

import api from '@/lib/api'
const mockedGet = vi.mocked(api.get)

describe('Lookup Store', () => {
	let store: ReturnType<typeof useLookupStore>

	beforeEach(() => {
		setActivePinia(createPinia())
		store = useLookupStore()
		vi.clearAllMocks()
	})

	// ─── Initial state ────────────────────────────────────────────────

	it('has correct initial state', () => {
		expect(store.validateResult).toBeNull()
		expect(store.searchResult).toBeNull()
		expect(store.loading).toBe(false)
		expect(store.error).toBeNull()
		expect(store.fromCache).toBe(false)
		expect(store.history).toEqual([])
		expect(store.cache.size).toBe(0)
		expect(store.defaultTlds).toContain('com')
		expect(store.appraisalResult).toBeNull()
		expect(store.appraisalLoading).toBe(false)
		expect(store.appraisalError).toBeNull()
	})

	// ─── Cache ────────────────────────────────────────────────────────

	it('caches search results and skips API on cache hit', async () => {
		const mockResult = {
			status: 'ok' as const,
			sld: 'example',
			results: [
				{ domain: 'example.com', tld: 'com', available: false, registrar: 'GoDaddy', expiryDate: '2026-06-16T17:08:14.811Z' },
			],
		}
		mockedGet.mockResolvedValueOnce({ data: mockResult })

		// First call — hits API
		await store.searchDomain('example', ['com'])
		expect(mockedGet).toHaveBeenCalledTimes(1)
		expect(store.searchResult).toEqual(mockResult)
		expect(store.fromCache).toBe(false)

		// Second call — same query — should hit cache
		store.searchResult = null
		await store.searchDomain('example', ['com'])
		expect(mockedGet).toHaveBeenCalledTimes(1) // no additional call
		expect(store.searchResult).toEqual(mockResult)
		expect(store.fromCache).toBe(true)
	})

	it('caches validate results and skips API on cache hit', async () => {
		const mockResult = {
			status: 'ok' as const,
			domain: 'example.com',
			available: false,
			whois: { registrar: 'GoDaddy', creationDate: null, expiryDate: null, nameservers: [], status: [] },
			dns: null,
		}
		mockedGet.mockResolvedValueOnce({ data: mockResult })

		await store.validateDomain('example.com')
		expect(mockedGet).toHaveBeenCalledTimes(1)
		expect(store.validateResult).toEqual(mockResult)
		expect(store.fromCache).toBe(false)

		// Cache hit
		store.validateResult = null
		await store.validateDomain('example.com')
		expect(mockedGet).toHaveBeenCalledTimes(1)
		expect(store.validateResult).toEqual(mockResult)
		expect(store.fromCache).toBe(true)
	})

	it('different TLD selections produce different cache keys', async () => {
		const mockResult1 = { status: 'ok' as const, sld: 'test', results: [{ domain: 'test.com', tld: 'com', available: true, registrar: null, expiryDate: null }] }
		const mockResult2 = { status: 'ok' as const, sld: 'test', results: [{ domain: 'test.io', tld: 'io', available: false, registrar: 'Namecheap', expiryDate: null }] }
		mockedGet.mockResolvedValueOnce({ data: mockResult1 })
		mockedGet.mockResolvedValueOnce({ data: mockResult2 })

		await store.searchDomain('test', ['com'])
		await store.searchDomain('test', ['io'])
		expect(mockedGet).toHaveBeenCalledTimes(2) // both hit API — different cache keys
	})

	// ─── History ──────────────────────────────────────────────────────

	it('pushes search results to history', async () => {
		const mockResult = { status: 'ok' as const, sld: 'example', results: [] }
		mockedGet.mockResolvedValueOnce({ data: mockResult })

		await store.searchDomain('example', ['com'])
		expect(store.history).toHaveLength(1)
		expect(store.history[0].query).toBe('example')
		expect(store.history[0].mode).toBe('search')
		expect(store.history[0].tlds).toEqual(['com'])
	})

	it('deduplicates history — same query moves to top', async () => {
		const mockResult1 = { status: 'ok' as const, sld: 'foo', results: [] }
		const mockResult2 = { status: 'ok' as const, sld: 'bar', results: [] }
		mockedGet.mockResolvedValue({ data: mockResult1 })
			.mockResolvedValueOnce({ data: mockResult1 })
			.mockResolvedValueOnce({ data: mockResult2 })
			.mockResolvedValueOnce({ data: mockResult1 }) // 3rd call: foo again

		await store.searchDomain('foo', ['com'])
		await store.searchDomain('bar', ['com'])
		expect(store.history).toHaveLength(2)
		expect(store.history[0].query).toBe('bar') // most recent first

		// Search foo again (cache hit won't push history, so clear cache)
		store.cache.clear()
		mockedGet.mockResolvedValueOnce({ data: mockResult1 })
		await store.searchDomain('foo', ['com'])
		expect(store.history).toHaveLength(2) // deduped, not 3
		expect(store.history[0].query).toBe('foo') // moved to top
	})

	it('trims history to MAX_HISTORY (20)', async () => {
		mockedGet.mockResolvedValue({ data: { status: 'ok' as const, sld: 'x', results: [] } })

		// Fill 25 entries (each with different query to avoid dedup)
		for (let i = 0; i < 25; i++) {
			store.cache.clear() // force unique cache keys
			await store.searchDomain(`domain${i}`, ['com'])
		}
		expect(store.history.length).toBe(20)
		expect(store.history[0].query).toBe('domain24') // most recent
	})

	// ─── restoreFromHistory ───────────────────────────────────────────

	it('restoreFromHistory sets result from history without API call', async () => {
		const mockResult = { status: 'ok' as const, sld: 'example', results: [] }
		mockedGet.mockResolvedValueOnce({ data: mockResult })

		await store.searchDomain('example', ['com'])
		store.searchResult = null // clear current

		store.restoreFromHistory(store.history[0])
		expect(store.searchResult).toEqual(mockResult)
		expect(store.fromCache).toBe(true)
		expect(mockedGet).toHaveBeenCalledTimes(1) // no extra call
	})

	// ─── reset vs clearAll ────────────────────────────────────────────

	it('reset clears results but keeps history and cache', async () => {
		const mockResult = { status: 'ok' as const, sld: 'test', results: [] }
		mockedGet.mockResolvedValueOnce({ data: mockResult })

		await store.searchDomain('test', ['com'])
		expect(store.searchResult).not.toBeNull()
		expect(store.history).toHaveLength(1)

		store.reset()
		expect(store.searchResult).toBeNull()
		expect(store.validateResult).toBeNull()
		expect(store.error).toBeNull()
		expect(store.history).toHaveLength(1) // preserved
		expect(store.cache.size).toBe(1) // preserved
	})

	it('clearAll resets everything including history and cache', async () => {
		const mockResult = { status: 'ok' as const, sld: 'test', results: [] }
		mockedGet.mockResolvedValueOnce({ data: mockResult })

		await store.searchDomain('test', ['com'])
		store.clearAll()
		expect(store.searchResult).toBeNull()
		expect(store.history).toHaveLength(0)
		expect(store.cache.size).toBe(0)
	})

	// ─── Error handling ───────────────────────────────────────────────

	it('handles 429 rate limit errors', async () => {
		const error = { response: { status: 429, data: { limit: 30, used: 30, tier: 'anonymous' } } }
		mockedGet.mockRejectedValueOnce(error)

		await store.validateDomain('example.com')
		expect(store.error).toContain('Rate limit reached')
		expect(store.rateLimitInfo).toEqual({ limit: 30, used: 30, tier: 'anonymous' })
	})

	it('handles generic errors', async () => {
		const error = { response: { data: { error: 'Domain invalid' } } }
		mockedGet.mockRejectedValueOnce(error)

		await store.validateDomain('!!!')
		expect(store.error).toBe('Domain invalid')
	})

	// ─── Tier 2: Appraisal ───────────────────────────────────────────

	describe('fetchAppraisal', () => {
		it('fetches and stores appraisal result', async () => {
			const mockAppraisal = {
				grade: 'A',
				range: { low: 1000, high: 5000 },
				signals: {
					length: { score: 8, label: '5 chars (very good)', passed: true },
					tld: { score: 10, label: '.com', passed: true },
					dictionary: { score: 8, label: 'Dictionary match', passed: true },
					brandable: { score: 7, label: 'Good brandability', passed: true },
					clean: { score: 10, label: 'No hyphens or numbers', passed: true },
				},
			}
			mockedGet.mockResolvedValueOnce({ data: mockAppraisal })

			await store.fetchAppraisal('shop.com')
			expect(mockedGet).toHaveBeenCalledWith('/appraise', { params: { domain: 'shop.com' } })
			expect(store.appraisalResult).toEqual(mockAppraisal)
			expect(store.appraisalLoading).toBe(false)
			expect(store.appraisalError).toBeNull()
		})

		it('sets loading state during fetch', async () => {
			let resolveFetch!: (v: any) => void
			const pending = new Promise((resolve) => { resolveFetch = resolve })
			mockedGet.mockReturnValueOnce(pending)

			const fetchPromise = store.fetchAppraisal('test.com')
			expect(store.appraisalLoading).toBe(true)

			resolveFetch({ data: { grade: 'B', range: { low: 100, high: 500 }, signals: {} } })
			await fetchPromise
			expect(store.appraisalLoading).toBe(false)
		})

		it('handles fetch errors', async () => {
			mockedGet.mockRejectedValueOnce({ response: { data: { error: 'Invalid domain' } } })

			await store.fetchAppraisal('bad!!')
			expect(store.appraisalError).toBe('Invalid domain')
			expect(store.appraisalResult).toBeNull()
		})

		it('clearAppraisal resets appraisal state', async () => {
			const mockAppraisal = { grade: 'A', range: { low: 1000, high: 5000 }, signals: {} }
			mockedGet.mockResolvedValueOnce({ data: mockAppraisal })

			await store.fetchAppraisal('shop.com')
			expect(store.appraisalResult).not.toBeNull()

			store.clearAppraisal()
			expect(store.appraisalResult).toBeNull()
			expect(store.appraisalLoading).toBe(false)
			expect(store.appraisalError).toBeNull()
		})

		it('reset() also clears appraisal state', async () => {
			const mockAppraisal = { grade: 'A', range: { low: 1000, high: 5000 }, signals: {} }
			mockedGet.mockResolvedValueOnce({ data: mockAppraisal })

			await store.fetchAppraisal('shop.com')
			expect(store.appraisalResult).not.toBeNull()

			store.reset()
			expect(store.appraisalResult).toBeNull()
		})
	})
})
