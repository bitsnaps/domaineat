/**
 * api.ts — Centralized API client with automatic auth header injection,
 * retry on transient failures, request timeout, and friendly error mapping.
 *
 * All API calls should go through this client instead of raw fetch().
 * It reads the auth token from localStorage and attaches it as
 * a Bearer header on every request.
 *
 * Features:
 * - 10s request timeout
 * - Automatic retry on 502/503/504/network errors (max 2 retries, 1s backoff)
 * - Friendly error messages instead of raw Axios error strings
 * - 401 auto-redirect to login (preserved from original)
 *
 * Usage:
 * import api from '@/lib/api'
 * const res = await api.get('/api/domains')
 * const res = await api.post('/api/domains', { domain_name: 'example.com' })
 */
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

const API_BASE = '/api'
const TIMEOUT_MS = 10_000
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1_000

/** HTTP status codes that trigger automatic retry */
const RETRYABLE_STATUS = new Set([502, 503, 504])

/** Error codes (no response) that trigger automatic retry */
const RETRYABLE_CODES = new Set(['ERR_NETWORK', 'ECONNABORTED', 'ECONNRESET'])

// ─── Friendly Error Messages ──────────────────────────────────────────────

const FRIENDLY_MESSAGES: Record<number, string> = {
	502: 'Service temporarily unavailable. Please try again.',
	503: 'Service unavailable. Please try again later.',
	504: 'Request timed out at the server. Please try again.',
}

const FRIENDLY_BY_CODE: Record<string, string> = {
	ERR_NETWORK: 'Unable to connect to server. Check your connection.',
	ECONNABORTED: 'Request timed out. Please try again.',
	ECONNRESET: 'Connection was reset. Please try again.',
}

/**
 * Augment an Axios error with a `friendlyMessage` property.
 * Stores use `err.friendlyMessage ?? err.response?.data?.error ?? err.message`
 * to display user-friendly text.
 */
function addFriendlyMessage(err: AxiosError): AxiosError & { friendlyMessage: string } {
	const enhanced = err as AxiosError & { friendlyMessage: string }

	// 1. Status-based friendly message
	const status = err.response?.status
	if (status && FRIENDLY_MESSAGES[status]) {
		enhanced.friendlyMessage = FRIENDLY_MESSAGES[status]
		return enhanced
	}

	// 2. Error-code-based friendly message (network/timeout)
	const code = (err as any).code as string | undefined
	if (code && FRIENDLY_BY_CODE[code]) {
		enhanced.friendlyMessage = FRIENDLY_BY_CODE[code]
		return enhanced
	}

	// 3. Generic fallback for any 5xx without a specific mapping
	if (status && status >= 500) {
		enhanced.friendlyMessage = 'Something went wrong. Please try again.'
		return enhanced
	}

	// 4. Generic fallback for network errors without response
	if (!err.response) {
		enhanced.friendlyMessage = 'Unable to connect to server. Check your connection.'
		return enhanced
	}

	// 5. For 4xx errors, no friendly override — use server message
	enhanced.friendlyMessage = err.response?.data
		? (typeof err.response.data === 'object' && 'error' in (err.response.data as any))
			? (err.response.data as any).error
			: err.message
		: err.message
	return enhanced
}

/**
 * Check if an error is retryable (5xx transient or network-level).
 */
function isRetryable(err: AxiosError): boolean {
	if (err.response?.status && RETRYABLE_STATUS.has(err.response.status)) return true
	const code = (err as any).code as string | undefined
	if (code && RETRYABLE_CODES.has(code)) return true
	return false
}

// ─── Create Axios Instance ────────────────────────────────────────────────

const api = axios.create({
	baseURL: API_BASE,
	headers: { 'Content-Type': 'application/json' },
	timeout: TIMEOUT_MS,
})

// ─── Request Interceptor: Auth Header ─────────────────────────────────────

api.interceptors.request.use((config) => {
	const token = localStorage.getItem('auth_token')
	if (token) {
		config.headers.Authorization = `Bearer ${token}`
	}
	return config
})

// ─── Response Interceptor: Retry + Friendly Errors + 401 Redirect ─────────

api.interceptors.response.use(
	(response) => response,
	async (err: AxiosError) => {
		const config = err.config as InternalAxiosRequestConfig & { _retryCount?: number }

		// ── 401: Clear token and redirect to login ────────────────────
		if (err.response?.status === 401) {
			const token = localStorage.getItem('auth_token')
			if (token) {
				localStorage.removeItem('auth_token')
				if (typeof window !== 'undefined' && window.location?.pathname !== '/login') {
					window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
				}
			}
			// 401 is NOT retryable — add friendly message and reject
			return Promise.reject(addFriendlyMessage(err))
		}

		// ── Retry logic for transient failures ─────────────────────────
		const retryCount = config?._retryCount ?? 0
		if (isRetryable(err) && retryCount < MAX_RETRIES) {
			config._retryCount = retryCount + 1
			// Exponential-ish backoff: 1s, 2s
			const delay = RETRY_DELAY_MS * config._retryCount
			await new Promise((resolve) => setTimeout(resolve, delay))
			return api(config)
		}

		// ── Add friendly message and reject ────────────────────────────
		return Promise.reject(addFriendlyMessage(err))
	}
)

export default api
