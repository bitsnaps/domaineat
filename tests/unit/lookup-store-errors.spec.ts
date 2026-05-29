/**
 * Tests for lookup store — friendly error messages on validate/search failures.
 *
 * These tests verify that the lookup store uses friendlyMessage from the
 * API client interceptor, falling back to server error then raw message.
 *
 * Strategy: Mock the api module to reject with errors that already carry
 * `friendlyMessage` (simulating what the real axios interceptor does).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useLookupStore } from '@/stores/lookup'

vi.mock('@/lib/api', () => ({
	__esModule: true,
	default: {
		get: vi.fn(),
		post: vi.fn(),
	},
}))

import api from '@/lib/api'

/**
 * Helper: create an error object that mimics what the real axios interceptor
 * produces after adding `friendlyMessage`.
 */
function makeApiError(opts: {
	status?: number
	data?: any
	message?: string
	friendlyMessage?: string
	code?: string
}) {
	const err: any = new Error(opts.message || 'Request failed')
	if (opts.status) {
		err.response = { status: opts.status, data: opts.data || {} }
	}
	if (opts.code) {
		err.code = opts.code
	}
	if (opts.friendlyMessage) {
		err.friendlyMessage = opts.friendlyMessage
	}
	return err
}

describe('Lookup Store — Friendly Error Messages', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		vi.clearAllMocks()
	})

	describe('validateDomain error mapping', () => {
		it('uses friendlyMessage for 502 errors', async () => {
			const store = useLookupStore()
			;(api.get as any).mockRejectedValue(
				makeApiError({
					status: 502,
					message: 'Request failed with status code 502',
					friendlyMessage: 'Service temporarily unavailable. Please try again.',
				})
			)

			await store.validateDomain('test.com')

			expect(store.error).toMatch(/unavailable|try again/i)
			expect(store.error).not.toContain('502')
			expect(store.error).not.toContain('Request failed')
		})

		it('uses friendlyMessage for 504 timeout errors', async () => {
			const store = useLookupStore()
			;(api.get as any).mockRejectedValue(
				makeApiError({
					status: 504,
					message: 'Request failed with status code 504',
					friendlyMessage: 'Request timed out at the server. Please try again.',
				})
			)

			await store.validateDomain('test.com')

			expect(store.error).toMatch(/timed out|try again/i)
			expect(store.error).not.toContain('504')
		})

		it('uses friendlyMessage for generic 500 errors', async () => {
			const store = useLookupStore()
			;(api.get as any).mockRejectedValue(
				makeApiError({
					status: 500,
					data: { error: 'Internal Server Error' },
					message: 'Request failed with status code 500',
					friendlyMessage: 'Something went wrong. Please try again.',
				})
			)

			await store.validateDomain('test.com')

			expect(store.error).toMatch(/something went wrong|try again/i)
			expect(store.error).not.toContain('Internal Server Error')
		})

		it('uses friendly message when error has no response (network error)', async () => {
			const store = useLookupStore()
			;(api.get as any).mockRejectedValue(
				makeApiError({
					message: 'Network Error',
					friendlyMessage: 'Unable to connect to server. Check your connection.',
				})
			)

			await store.validateDomain('test.com')

			expect(store.error).toMatch(/unable to connect|check your connection|something went wrong/i)
			expect(store.error).not.toBe('Network Error')
		})

		it('preserves rate-limit error format for 429', async () => {
			const store = useLookupStore()
			;(api.get as any).mockRejectedValue(
				makeApiError({
					status: 429,
					data: { error: 'Rate limit exceeded', limit: 10, tier: 'free' },
					message: 'Request failed with status code 429',
				})
			)

			await store.validateDomain('test.com')

			// Rate limit errors have their own format
			expect(store.error).toMatch(/rate limit/i)
		})
	})

	describe('searchDomain error mapping', () => {
		it('uses friendlyMessage for 502 errors', async () => {
			const store = useLookupStore()
			;(api.get as any).mockRejectedValue(
				makeApiError({
					status: 502,
					message: 'Request failed with status code 502',
					friendlyMessage: 'Service temporarily unavailable. Please try again.',
				})
			)

			await store.searchDomain('test')

			expect(store.error).toMatch(/unavailable|try again/i)
			expect(store.error).not.toContain('502')
		})

		it('uses friendly message for network errors', async () => {
			const store = useLookupStore()
			;(api.get as any).mockRejectedValue(
				makeApiError({
					message: 'Network Error',
					friendlyMessage: 'Unable to connect to server. Check your connection.',
				})
			)

			await store.searchDomain('test')

			expect(store.error).toMatch(/unable to connect|check your connection/i)
			expect(store.error).not.toBe('Network Error')
		})

		it('preserves rate-limit error format for 429', async () => {
			const store = useLookupStore()
			;(api.get as any).mockRejectedValue(
				makeApiError({
					status: 429,
					data: { error: 'Rate limit exceeded', limit: 10, tier: 'free' },
					message: 'Request failed with status code 429',
				})
			)

			await store.searchDomain('test')

			expect(store.error).toMatch(/rate limit/i)
		})
	})

	describe('appraiseDomain error mapping', () => {
		it('uses friendlyMessage for 502 errors', async () => {
			const store = useLookupStore()
			;(api.get as any).mockRejectedValue(
				makeApiError({
					status: 502,
					message: 'Request failed with status code 502',
					friendlyMessage: 'Service temporarily unavailable. Please try again.',
				})
			)

			await store.fetchAppraisal('test.com')

			expect(store.appraisalError).toMatch(/unavailable|try again/i)
			expect(store.appraisalError).not.toContain('502')
		})

		it('uses friendly message for network errors', async () => {
			const store = useLookupStore()
			;(api.get as any).mockRejectedValue(
				makeApiError({
					message: 'Network Error',
					friendlyMessage: 'Unable to connect to server. Check your connection.',
				})
			)

			await store.fetchAppraisal('test.com')

			expect(store.appraisalError).toMatch(/unable to connect|check your connection/i)
			expect(store.appraisalError).not.toBe('Network Error')
		})

		it('uses server error for 4xx when no friendly override', async () => {
			const store = useLookupStore()
			;(api.get as any).mockRejectedValue(
				makeApiError({
					status: 400,
					data: { error: 'Invalid domain format' },
					message: 'Request failed with status code 400',
					friendlyMessage: 'Invalid domain format',
				})
			)

			await store.fetchAppraisal('bad')

			expect(store.appraisalError).toContain('Invalid domain')
		})
	})
})
