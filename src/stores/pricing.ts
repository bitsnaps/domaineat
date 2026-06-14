import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/lib/api'
import type { PricingResponse } from '@/types'

export const usePricingStore = defineStore('pricing', () => {
	// ─── State ─────────────────────────────────────────────────────────
	const pricingResult = ref<PricingResponse | null>(null)
	const loading = ref(false)
	const error = ref<string | null>(null)

	// ─── Actions ───────────────────────────────────────────────────────

	/** Fetch pricing for a domain from all configured providers */
	async function fetchPricing(domain: string) {
		loading.value = true
		error.value = null
		pricingResult.value = null

		try {
			const { data } = await api.get<PricingResponse>('/pricing', {
				params: { domain },
			})
			pricingResult.value = data
		} catch (err: any) {
			error.value = err.friendlyMessage || err.response?.data?.error || err.message || 'Pricing fetch failed'
		} finally {
			loading.value = false
		}
	}

	/** Clear pricing state */
	function clearPricing() {
		pricingResult.value = null
		loading.value = false
		error.value = null
	}

	return {
		// State
		pricingResult,
		loading,
		error,
		// Actions
		fetchPricing,
		clearPricing,
	}
})
