import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToastStore } from '@/stores/toast'
import api from '@/lib/api'
import type {
	LedgerEntry,
	LedgerEntryCreate,
	TransactionType,
} from '@/types'

export const useLedgerStore = defineStore('ledger', () => {
	// ─── State ──────────────────────────────────────────────────────────────

	const entries = ref<LedgerEntry[]>([])
	const loading = ref(false)
	const error = ref<string | null>(null)

	// Filters
	const filterDomainId = ref<number | null>(null)
	const filterType = ref<TransactionType | ''>('')
	const filterDateFrom = ref('')
	const filterDateTo = ref('')
	const searchQuery = ref('')

	// ─── Actions ────────────────────────────────────────────────────────────

	async function fetchEntries() {
		loading.value = true
		error.value = null
		try {
			const params: Record<string, string> = {}
			if (filterDomainId.value) params.domain_id = String(filterDomainId.value)
			const res = await api.get('/ledger', { params })
			entries.value = res.data
		} catch (err: any) {
			const msg = err.response?.data?.error || err.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to fetch entries: ${msg}`)
		} finally {
			loading.value = false
		}
	}

	async function createEntry(payload: LedgerEntryCreate) {
		error.value = null
		try {
			const res = await api.post('/ledger', payload)
			const entry = res.data
			entries.value.unshift(entry)
			const toast = useToastStore()
			toast.success('Ledger entry added')
			return entry
		} catch (err: any) {
			const msg = err.response?.data?.error || err.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to add entry: ${msg}`)
			throw err
		}
	}

	async function updateEntry(id: number, payload: Partial<LedgerEntryCreate>) {
		error.value = null
		try {
			const res = await api.patch(`/ledger/${id}`, payload)
			const updated = res.data
			const idx = entries.value.findIndex((e) => e.id === id)
			if (idx !== -1) entries.value[idx] = updated
			const toast = useToastStore()
			toast.success('Ledger entry updated')
			return updated
		} catch (err: any) {
			const msg = err.response?.data?.error || err.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to update entry: ${msg}`)
			throw err
		}
	}

	async function deleteEntry(id: number) {
		error.value = null
		try {
			await api.delete(`/ledger/${id}`)
			entries.value = entries.value.filter((e) => e.id !== id)
			const toast = useToastStore()
			toast.success('Ledger entry deleted')
		} catch (err: any) {
			const msg = err.response?.data?.error || err.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to delete entry: ${msg}`)
			throw err
		}
	}

	function clearFilters() {
		filterDomainId.value = null
		filterType.value = ''
		filterDateFrom.value = ''
		filterDateTo.value = ''
		searchQuery.value = ''
	}

	// ─── Getters ────────────────────────────────────────────────────────────

	/** Entries after applying local filters (type, date range, search) */
	const filteredEntries = computed(() => {
		let result = entries.value

		if (filterType.value) {
			result = result.filter((e) => e.transaction_type === filterType.value)
		}

		if (filterDateFrom.value) {
			result = result.filter((e) => e.transaction_date >= filterDateFrom.value)
		}
		if (filterDateTo.value) {
			result = result.filter((e) => e.transaction_date <= filterDateTo.value)
		}

		if (searchQuery.value) {
			const q = searchQuery.value.toLowerCase()
			result = result.filter(
				(e) =>
					String(e.amount).includes(q) ||
					e.transaction_type.toLowerCase().includes(q) ||
					(e.notes && e.notes.toLowerCase().includes(q)) ||
					String(e.domain_id).includes(q)
			)
		}

		return result
	})

	// ─── Financial calculations ─────────────────────────────────────────────

	/** Total costs = purchase + renewal + transfer + listing_fee + other */
	const totalCosts = computed(() =>
		filteredEntries.value
			.filter((e) => e.transaction_type !== 'sale')
			.reduce((sum, e) => sum + Number(e.amount), 0)
	)

	/** Total revenue = sales only */
	const totalRevenue = computed(() =>
		filteredEntries.value
			.filter((e) => e.transaction_type === 'sale')
			.reduce((sum, e) => sum + Number(e.amount), 0)
	)

	/** Net profit = revenue - costs */
	const netProfit = computed(() => totalRevenue.value - totalCosts.value)

	/** Monthly burn rate = average monthly cost over the last 12 months */
	const burnRate = computed(() => {
		const now = new Date()
		const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1)
			.toISOString()
			.slice(0, 10)

		const last12 = entries.value.filter(
			(e) =>
				e.transaction_type !== 'sale' && e.transaction_date >= twelveMonthsAgo
		)
		const total = last12.reduce((sum, e) => sum + Number(e.amount), 0)
		return total / 12
	})

	/** Count of entries by transaction type */
	const countByType = computed(() => {
		const counts: Record<string, number> = {}
		for (const e of filteredEntries.value) {
			counts[e.transaction_type] = (counts[e.transaction_type] || 0) + 1
		}
		return counts
	})

	/** ROI = (revenue - costs) / costs * 100 (or 0 if no costs) */
	const roi = computed(() =>
		totalCosts.value === 0 ? 0 : (netProfit.value / totalCosts.value) * 100
	)

	/** NAV (Net Asset Value) = sum of all domain acquisition costs still held */
	const nav = computed(() => {
		// Sum purchase costs for domains that haven't been sold
		const purchaseMap = new Map<number, number>()
		const soldDomains = new Set<number>()

		for (const e of entries.value) {
			if (e.transaction_type === 'purchase') {
				purchaseMap.set(e.domain_id, (purchaseMap.get(e.domain_id) || 0) + Number(e.amount))
			}
			if (e.transaction_type === 'sale') {
				soldDomains.add(e.domain_id)
			}
		}

		let total = 0
		for (const [domainId, cost] of purchaseMap) {
			if (!soldDomains.has(domainId)) total += cost
		}
		return total
	})

	return {
		// State
		entries,
		loading,
		error,
		filterDomainId,
		filterType,
		filterDateFrom,
		filterDateTo,
		searchQuery,
		// Actions
		fetchEntries,
		createEntry,
		updateEntry,
		deleteEntry,
		clearFilters,
		// Getters
		filteredEntries,
		totalCosts,
		totalRevenue,
		netProfit,
		burnRate,
		countByType,
		roi,
		nav,
	}
})
