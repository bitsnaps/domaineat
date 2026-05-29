import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/lib/api'
import type { ValidateResponse, SearchResponse, RateLimitInfo, DomainAppraisal } from '@/types'

// ─── Cache / History types ──────────────────────────────────────────────

interface CacheEntry<T> {
	result: T
	timestamp: number
}

export interface LookupHistoryEntry {
	query: string
	mode: 'search' | 'validate'
	tlds?: string[]
	result: SearchResponse | ValidateResponse | null
	timestamp: number
}

// ─── Constants ──────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_HISTORY = 20

// ─── Store ──────────────────────────────────────────────────────────────

export const useLookupStore = defineStore('lookup', () => {
	// ─── State ─────────────────────────────────────────────────────────
	const validateResult = ref<ValidateResponse | null>(null)
	const searchResult = ref<SearchResponse | null>(null)
	const loading = ref(false)
	const error = ref<string | null>(null)
	const rateLimitInfo = ref<RateLimitInfo | null>(null)
	const fromCache = ref(false)

	// Default TLDs for search
	const defaultTlds = ['com', 'net', 'org', 'io', 'co', 'dev', 'app', 'ai', 'xyz', 'me']

	// Cache: keyed by "search:sld:tlds" or "validate:domain"
	const cache = ref<Map<string, CacheEntry<SearchResponse | ValidateResponse>>>(new Map())

	// Search history (most recent first)
	const history = ref<LookupHistoryEntry[]>([])

	// ─── Cache helpers ─────────────────────────────────────────────────

	function cacheKey(mode: 'search' | 'validate', query: string, tlds?: string[]): string {
		if (mode === 'search') {
			const sortedTlds = [...(tlds || [])].sort().join(',')
			return `search:${query}:${sortedTlds}`
		}
		return `validate:${query}`
	}

	function getCached<T extends SearchResponse | ValidateResponse>(
		key: string,
	): T | null {
		const entry = cache.value.get(key)
		if (!entry) return null
		if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
			cache.value.delete(key)
			return null
		}
		return entry.result as T
	}

	function setCache(key: string, result: SearchResponse | ValidateResponse) {
		cache.value.set(key, { result, timestamp: Date.now() })
	}

	// ─── History helpers ───────────────────────────────────────────────

	function pushHistory(entry: LookupHistoryEntry) {
		// Deduplicate: if same query+mode exists, move it to top
		const idx = history.value.findIndex(
			(h) => h.query === entry.query && h.mode === entry.mode,
		)
		if (idx >= 0) history.value.splice(idx, 1)
		history.value.unshift(entry)
		// Trim to max
		if (history.value.length > MAX_HISTORY) {
			history.value = history.value.slice(0, MAX_HISTORY)
		}
	}

	/** Restore a history entry as the current result (no API call) */
	function restoreFromHistory(entry: LookupHistoryEntry) {
		error.value = null
		fromCache.value = true
		if (entry.mode === 'search') {
			searchResult.value = entry.result as SearchResponse
			validateResult.value = null
		} else {
			validateResult.value = entry.result as ValidateResponse
			searchResult.value = null
		}
	}

	// ─── Actions ───────────────────────────────────────────────────────

	/** Validate a single domain (RDAP + DNS) */
	async function validateDomain(domain: string) {
		const key = cacheKey('validate', domain)
		const cached = getCached<ValidateResponse>(key)
		if (cached) {
			validateResult.value = cached
			searchResult.value = null
			fromCache.value = true
			error.value = null
			return
		}

		loading.value = true
		error.value = null
		validateResult.value = null
		fromCache.value = false

		try {
			const { data } = await api.get<ValidateResponse>('/validate', {
				params: { domain },
			})
			validateResult.value = data
			setCache(key, data)
			pushHistory({
				query: domain,
				mode: 'validate',
				result: data,
				timestamp: Date.now(),
			})
		} catch (err: any) {
			if (err.response?.status === 429) {
				rateLimitInfo.value = err.response.data
				error.value = `Rate limit reached (${err.response.data.limit}/${err.response.data.tier})`
			} else {
				error.value = err.friendlyMessage || err.response?.data?.error || err.message || 'Validation failed'
			}
		} finally {
			loading.value = false
		}
	}

	/** Search domain across multiple TLDs */
	async function searchDomain(sld: string, tlds?: string[]) {
		const key = cacheKey('search', sld, tlds)
		const cached = getCached<SearchResponse>(key)
		if (cached) {
			searchResult.value = cached
			validateResult.value = null
			fromCache.value = true
			error.value = null
			return
		}

		loading.value = true
		error.value = null
		searchResult.value = null
		fromCache.value = false

		try {
			const tldsParam = tlds?.join(',') || undefined
			const { data } = await api.get<SearchResponse>('/search', {
				params: { domain: sld, tlds: tldsParam },
			})
			searchResult.value = data
			setCache(key, data)
			pushHistory({
				query: sld,
				mode: 'search',
				tlds,
				result: data,
				timestamp: Date.now(),
			})
		} catch (err: any) {
			if (err.response?.status === 429) {
				rateLimitInfo.value = err.response.data
				error.value = `Rate limit reached (${err.response.data.limit}/${err.response.data.tier})`
			} else {
				error.value = err.friendlyMessage || err.response?.data?.error || err.message || 'Search failed'
			}
		} finally {
			loading.value = false
		}
	}

	/** Reset current results (keeps history + cache) */
	function reset() {
		validateResult.value = null
		searchResult.value = null
		loading.value = false
		error.value = null
		rateLimitInfo.value = null
		fromCache.value = false
		clearAppraisal()
	}

	/** Clear everything including history and cache */
	function clearAll() {
		reset()
		history.value = []
		cache.value.clear()
	}

	// ─── Tier 2: Server-side Appraisal ─────────────────────────────────

	const appraisalResult = ref<DomainAppraisal | null>(null)
	const appraisalLoading = ref(false)
	const appraisalError = ref<string | null>(null)

	/** Fetch a server-side appraisal for a domain (Tier 2) */
	async function fetchAppraisal(domain: string) {
		appraisalLoading.value = true
		appraisalError.value = null
		try {
			const { data } = await api.get<DomainAppraisal>('/appraise', {
				params: { domain },
			})
			appraisalResult.value = data
		} catch (err: any) {
			appraisalError.value = err.friendlyMessage || err.response?.data?.error || err.message || 'Appraisal failed'
		} finally {
			appraisalLoading.value = false
		}
	}

	/** Clear just the appraisal state */
	function clearAppraisal() {
		appraisalResult.value = null
		appraisalLoading.value = false
		appraisalError.value = null
	}

	return {
		// State
		validateResult,
		searchResult,
		loading,
		error,
		rateLimitInfo,
		fromCache,
		defaultTlds,
		history,
		// Appraisal (Tier 2)
		appraisalResult,
		appraisalLoading,
		appraisalError,
		// Actions
		validateDomain,
		searchDomain,
		fetchAppraisal,
		clearAppraisal,
		reset,
		clearAll,
		restoreFromHistory,
		// For testing
		cache,
	}
})
