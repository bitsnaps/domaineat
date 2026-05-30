import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToastStore } from '@/stores/toast'
import api from '@/lib/api'
import type {
	Domain,
	DomainCreate,
	DomainUpdate,
	DomainStatus,
} from '@/types'

export const useDomainsStore = defineStore('domains', () => {
	// ─── State ─────────────────────────────────────────────────────────────
	const domains = ref<Domain[]>([])
	const loading = ref(false)
	const error = ref<string | null>(null)

	// Filters
	const filterTld = ref<string>('')
	const filterRegistrar = ref<string>('')
	const filterStatus = ref<DomainStatus | ''>('')
	const searchQuery = ref('')

	// Pagination
	const currentPage = ref(1)
	const pageSize = ref(20)

	// Sort
	const sortField = ref<keyof Domain>('domain_name')
	const sortAsc = ref(true)

	// ─── Helpers ───────────────────────────────────────────────────────────

	/** Extract TLD from domain name (last segment after '.') */
	function getTld(name: string): string {
		const parts = name.split('.')
		return parts.length > 1 ? '.' + parts[parts.length - 1] : ''
	}

	/** Days until expiry (negative = already expired) */
	function daysUntilExpiry(dateStr: string): number {
		const expiry = new Date(dateStr)
		const now = new Date()
		return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
	}

	// ─── Getters ───────────────────────────────────────────────────────────

	/** Unique TLDs in the portfolio */
	const tldOptions = computed(() => {
		const tlds = new Set(domains.value.map((d) => getTld(d.domain_name)))
		return [...tlds].sort()
	})

	/** Unique registrars in the portfolio */
	const registrarOptions = computed(() => {
		const regs = new Set(domains.value.map((d) => d.registrar))
		return [...regs].sort()
	})

	/** Status options derived from current data */
	const statusOptions = computed((): DomainStatus[] => ['active', 'expired', 'sold', 'pending_delete', 'parked'])
	const filterGrade = ref<string>('all')

	const filteredDomains = computed(() => {
		let result = [...domains.value]

		if (searchQuery.value) {
			const q = searchQuery.value.toLowerCase()
			result = result.filter((d) => d.domain_name.toLowerCase().includes(q))
		}

		if (filterTld.value) {
			result = result.filter((d) => getTld(d.domain_name) === filterTld.value)
		}

		if (filterRegistrar.value) {
			result = result.filter((d) => d.registrar === filterRegistrar.value)
		}

		if (filterStatus.value) {
			result = result.filter((d) => d.status === filterStatus.value)
		}

		if (filterGrade.value === 'ungraded') {
			result = result.filter((d) => !d.appraisal_grade)
		} else if (filterGrade.value !== 'all') {
			result = result.filter((d) => d.appraisal_grade === filterGrade.value)
		}

		// Sort
		result.sort((a, b) => {
			const aVal = a[sortField.value]
			const bVal = b[sortField.value]
			let cmp = 0
			if (typeof aVal === 'string' && typeof bVal === 'string') {
				cmp = aVal.localeCompare(bVal)
			} else if (typeof aVal === 'number' && typeof bVal === 'number') {
				cmp = aVal - bVal
			} else {
				cmp = String(aVal).localeCompare(String(bVal))
			}
			return sortAsc.value ? cmp : -cmp
		})

		return result
	})

	/** Paginated slice of filtered results */
	const pagedDomains = computed(() => {
		const start = (currentPage.value - 1) * pageSize.value
		return filteredDomains.value.slice(start, start + pageSize.value)
	})

	const totalPages = computed(() =>
		Math.max(1, Math.ceil(filteredDomains.value.length / pageSize.value))
	)

	/** Domains expiring within 30 days */
	const expiringSoon = computed(() =>
		domains.value.filter((d) => {
			const days = daysUntilExpiry(d.expiry_date)
			return days >= 0 && days <= 30
		})
	)

	/** Count by status */
	const countByStatus = computed(() => {
		const counts: Record<string, number> = {}
		for (const d of domains.value) {
			counts[d.status] = (counts[d.status] || 0) + 1
		}
		return counts
	})

	/** Total acquisition cost */
	const totalAcquisitionCost = computed(() =>
		domains.value.reduce((sum, d) => sum + Number(d.acquisition_cost), 0)
	)

	/** Total annual renewal cost */
	const totalRenewalCost = computed(() =>
		domains.value.reduce((sum, d) => sum + Number(d.renewal_cost), 0)
	)

	const count = computed(() => domains.value.length)

	// ─── Actions ───────────────────────────────────────────────────────────

	async function fetchDomains() {
		loading.value = true
		error.value = null
		try {
			const res = await api.get('/domains')
			domains.value = res.data
		} catch (e: any) {
			const msg = e.response?.data?.error || e.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to fetch domains: ${msg}`)
		} finally {
			loading.value = false
		}
	}

	async function createDomain(payload: DomainCreate): Promise<Domain | null> {
		error.value = null
		try {
			const res = await api.post('/domains', payload)
			const domain: Domain = res.data
			domains.value.unshift(domain)
			const toast = useToastStore()
			toast.success('Domain added successfully')
			return domain
		} catch (e: any) {
			const msg = e.response?.data?.error || e.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to add domain: ${msg}`)
			return null
		}
	}

	async function updateDomain(id: number, payload: DomainUpdate): Promise<Domain | null> {
		error.value = null
		try {
			const res = await api.put(`/domains/${id}`, payload)
			const updated: Domain = res.data
			const idx = domains.value.findIndex((d) => d.id === id)
			if (idx !== -1) domains.value[idx] = updated
			const toast = useToastStore()
			toast.success('Domain updated')
			return updated
		} catch (e: any) {
			const msg = e.response?.data?.error || e.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to update domain: ${msg}`)
			return null
		}
	}

	async function deleteDomain(id: number): Promise<boolean> {
		error.value = null
		try {
			await api.delete(`/domains/${id}`)
			domains.value = domains.value.filter((d) => d.id !== id)
			const toast = useToastStore()
			toast.success('Domain deleted')
			return true
		} catch (e: any) {
			const msg = e.response?.data?.error || e.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to delete domain: ${msg}`)
			return false
		}
	}

	function clearFilters() {
		filterTld.value = ''
		filterRegistrar.value = ''
		filterStatus.value = ''
		filterGrade.value = 'all'
		searchQuery.value = ''
		currentPage.value = 1
	}

	async function bulkDelete(ids: number[]): Promise<number> {
		error.value = null
		try {
			// Domains use individual DELETE since no bulk endpoint
			let deleted = 0
			for (const id of ids) {
				try {
					await api.delete(`/domains/${id}`)
					deleted++
				} catch { /* skip individual failures */ }
			}
			domains.value = domains.value.filter((d) => !ids.includes(d.id))
			const toast = useToastStore()
			toast.success(`Deleted ${deleted} domain${deleted !== 1 ? 's' : ''}`)
			return deleted
		} catch (e: any) {
			const msg = e.response?.data?.error || e.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to bulk delete domains: ${msg}`)
			return 0
		}
	}

	async function exportCsv(): Promise<boolean> {
		error.value = null
		try {
			const res = await api.get('/domains/export', { responseType: 'blob' })
			const url = window.URL.createObjectURL(new Blob([res.data as BlobPart], { type: 'text/csv' }))
			const link = document.createElement('a')
			link.href = url
			link.setAttribute('download', 'domains.csv')
			document.body.appendChild(link)
			link.click()
			link.remove()
			window.URL.revokeObjectURL(url)
			const toast = useToastStore()
			toast.success('Domains exported')
			return true
		} catch (e: any) {
			const msg = e.response?.data?.error || e.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to export domains: ${msg}`)
			return false
		}
	}

	return {
		// State
		domains,
		loading,
		error,
		filterTld,
		filterRegistrar,
		filterStatus,
		filterGrade,
		searchQuery,
		currentPage,
		pageSize,
		sortField,
		sortAsc,
		// Getters
		tldOptions,
		registrarOptions,
		statusOptions,
		filteredDomains,
		pagedDomains,
		totalPages,
		expiringSoon,
		countByStatus,
		totalAcquisitionCost,
		totalRenewalCost,
		count,
		// Helpers
		getTld,
		daysUntilExpiry,
		// Actions
		fetchDomains,
		createDomain,
		updateDomain,
		deleteDomain,
		clearFilters,
		bulkDelete,
		exportCsv,
	}
})
