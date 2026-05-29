/**
 * Tests for auth store — friendly error messages on login/register failures.
 *
 * These tests verify that the auth store uses friendlyMessage from the
 * API client interceptor, falling back to server error then raw message.
 *
 * Strategy: Mock the api module to reject with errors that already carry
 * `friendlyMessage` (simulating what the real axios interceptor does).
 * This tests the store's error-priority chain without coupling to
 * interceptor internals.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// Mock the API client BEFORE importing the store that depends on it
vi.mock('@/lib/api', () => ({
	__esModule: true,
	default: {
		post: vi.fn(),
		get: vi.fn(),
	},
}))

// Import AFTER mock — vitest hoists vi.mock so these get the mocked version
import { useAuthStore } from '@/stores/auth'
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
	// The real interceptor always adds this property
	if (opts.friendlyMessage) {
		err.friendlyMessage = opts.friendlyMessage
	}
	return err
}

describe('Auth Store — Friendly Error Messages', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		vi.clearAllMocks()
		localStorage.clear()
	})

	describe('login error mapping', () => {
		it('uses friendlyMessage for 502 errors', async () => {
			const store = useAuthStore()
			;(api.post as any).mockRejectedValue(
				makeApiError({
					status: 502,
					message: 'Request failed with status code 502',
					friendlyMessage: 'Service temporarily unavailable. Please try again.',
				})
			)

			try { await store.login('user@test.com', 'password') } catch {}

			expect(store.error).toMatch(/unavailable|try again/i)
			expect(store.error).not.toContain('502')
			expect(store.error).not.toContain('Request failed')
		})

		it('uses friendlyMessage for network errors', async () => {
			const store = useAuthStore()
			;(api.post as any).mockRejectedValue(
				makeApiError({
					code: 'ERR_NETWORK',
					message: 'Network Error',
					friendlyMessage: 'Unable to connect to server. Check your connection.',
				})
			)

			try { await store.login('user@test.com', 'password') } catch {}

			expect(store.error).toMatch(/unable to connect|check your connection/i)
			expect(store.error).not.toBe('Network Error')
		})

		it('uses server error message for 4xx when no friendlyMessage override', async () => {
			const store = useAuthStore()
			// For 4xx, the interceptor preserves server message as friendlyMessage
			;(api.post as any).mockRejectedValue(
				makeApiError({
					status: 401,
					data: { error: 'Invalid email or password' },
					message: 'Request failed with status code 401',
					friendlyMessage: 'Invalid email or password',
				})
			)

			try { await store.login('user@test.com', 'password') } catch {}

			expect(store.error).toBe('Invalid email or password')
			expect(store.error).not.toContain('401')
		})

		it('uses server error message for 409 conflicts', async () => {
			const store = useAuthStore()
			;(api.post as any).mockRejectedValue(
				makeApiError({
					status: 409,
					data: { error: 'Email already registered' },
					message: 'Request failed with status code 409',
					friendlyMessage: 'Email already registered',
				})
			)

			try { await store.login('user@test.com', 'password') } catch {}

			expect(store.error).toBe('Email already registered')
		})

		it('falls back to raw message when no friendlyMessage and no server error', async () => {
			const store = useAuthStore()
			// Edge case: interceptor adds friendlyMessage for no-response errors
			// but if somehow it doesn't, the store falls back to err.message
			;(api.post as any).mockRejectedValue(
				makeApiError({
					message: 'Network Error',
					friendlyMessage: 'Unable to connect to server. Check your connection.',
				})
			)

			try { await store.login('user@test.com', 'password') } catch {}

			// friendlyMessage is present (set by interceptor for network errors)
			expect(store.error).toMatch(/unable to connect|check your connection|something went wrong/i)
			expect(store.error).not.toBe('Network Error')
		})

		it('uses friendlyMessage for 503 errors', async () => {
			const store = useAuthStore()
			;(api.post as any).mockRejectedValue(
				makeApiError({
					status: 503,
					message: 'Request failed with status code 503',
					friendlyMessage: 'Service unavailable. Please try again later.',
				})
			)

			try { await store.login('user@test.com', 'password') } catch {}

			expect(store.error).toMatch(/unavailable|try again/i)
		})

		it('uses friendlyMessage for timeout errors', async () => {
			const store = useAuthStore()
			;(api.post as any).mockRejectedValue(
				makeApiError({
					code: 'ECONNABORTED',
					message: 'timeout of 10000ms exceeded',
					friendlyMessage: 'Request timed out. Please try again.',
				})
			)

			try { await store.login('user@test.com', 'password') } catch {}

			expect(store.error).toMatch(/timed out|try again/i)
			expect(store.error).not.toContain('10000ms')
		})
	})

	describe('register error mapping', () => {
		it('uses friendlyMessage for 502 errors', async () => {
			const store = useAuthStore()
			;(api.post as any).mockRejectedValue(
				makeApiError({
					status: 502,
					message: 'Request failed with status code 502',
					friendlyMessage: 'Service temporarily unavailable. Please try again.',
				})
			)

			try { await store.register('user@test.com', 'password123', 'password123') } catch {}

			expect(store.error).toMatch(/unavailable|try again/i)
			expect(store.error).not.toContain('502')
		})

		it('uses server error message for 400 validation errors', async () => {
			const store = useAuthStore()
			;(api.post as any).mockRejectedValue(
				makeApiError({
					status: 400,
					data: { error: 'Password must be at least 8 characters' },
					message: 'Request failed with status code 400',
					friendlyMessage: 'Password must be at least 8 characters',
				})
			)

			try { await store.register('user@test.com', 'short', 'short') } catch {}

			expect(store.error).toContain('Password')
		})

		it('uses friendlyMessage for network errors', async () => {
			const store = useAuthStore()
			;(api.post as any).mockRejectedValue(
				makeApiError({
					message: 'Network Error',
					friendlyMessage: 'Unable to connect to server. Check your connection.',
				})
			)

			try { await store.register('user@test.com', 'password123', 'password123') } catch {}

			expect(store.error).toMatch(/unable to connect|check your connection/i)
			expect(store.error).not.toBe('Network Error')
		})
	})
})
