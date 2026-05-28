import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/lib/api'
import type { ValidateResponse, SearchResponse, RateLimitInfo } from '@/types'

export const useLookupStore = defineStore('lookup', () => {
	// ─── State ─────────────────────────────────────────────────────────────
	const validateResult = ref<ValidateResponse | null>(null)
	const searchResult = ref<SearchResponse | null>(null)
	const loading = ref(false)
	const error = ref<string | null>(null)
	const rateLimitInfo = ref<RateLimitInfo | null>(null)

	// Default TLDs for search
	const defaultTlds = ['com', 'net', 'org', 'io', 'co', 'dev', 'app', 'ai', 'xyz', 'me']

	// ─── Actions ───────────────────────────────────────────────────────────

	/** Validate a single domain (RDAP + DNS) */
	async function validateDomain(domain: string) {
		loading.value = true
		error.value = null
		validateResult.value = null

		try {
			const { data } = await api.get<ValidateResponse>('/validate', {
				params: { domain },
			})
			validateResult.value = data
		} catch (err: any) {
			if (err.response?.status === 429) {
				rateLimitInfo.value = err.response.data
				error.value = `Rate limit reached (${err.response.data.limit}/${err.response.data.tier})`
			} else {
				error.value = err.response?.data?.error || err.message || 'Validation failed'
			}
		} finally {
			loading.value = false
		}
	}

	/** Search domain across multiple TLDs */
	async function searchDomain(sld: string, tlds?: string[]) {
		loading.value = true
		error.value = null
		searchResult.value = null

		try {
			const tldsParam = tlds?.join(',') || undefined
			const { data } = await api.get<SearchResponse>('/search', {
				params: { domain: sld, tlds: tldsParam },
			})
			searchResult.value = data
		} catch (err: any) {
			if (err.response?.status === 429) {
				rateLimitInfo.value = err.response.data
				error.value = `Rate limit reached (${err.response.data.limit}/${err.response.data.tier})`
			} else {
				error.value = err.response?.data?.error || err.message || 'Search failed'
			}
		} finally {
			loading.value = false
		}
	}

	/** Reset all state */
	function reset() {
		validateResult.value = null
		searchResult.value = null
		loading.value = false
		error.value = null
		rateLimitInfo.value = null
	}

	return {
		validateResult,
		searchResult,
		loading,
		error,
		rateLimitInfo,
		defaultTlds,
		validateDomain,
		searchDomain,
		reset,
	}
})
