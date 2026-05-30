import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToastStore } from '@/stores/toast'
import api from '@/lib/api'
import type {
	Domain,
	DomainCreate,
	DomainUpdate,
	DomainStatus,
	SmartFolderKey,
	AppraisalGrade,
} from '@/types'
import { gradeToRange } from '@/lib/appraise'

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
	const filterSmartFolder = ref<SmartFolderKey>('all')

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

		// Smart folder filtering
		const folder = filterSmartFolder.value
		if (folder === 'ungraded') {
			result = result.filter((d) => !d.appraisal_grade)
		} else if (folder === 'expiring') {
			result = result.filter((d) => {
				const days = daysUntilExpiry(d.expiry_date)
				return days >= 0 && days <= 30
			})
		} else if (folder === 'undervalued') {
			result = result.filter((d) => {
				if (!d.appraisal_grade) return false
				const range = gradeToRange(d.appraisal_grade as AppraisalGrade)
				return range.low > Number(d.acquisition_cost) * 2
			})
		} else if (folder === 'outreach') {
			const domainIds = activeOutreachDomainIds.value
			result = result.filter((d) => domainIds.has(d.id))
		} else if (folder === 'recent') {
			const sevenDaysAgo = new Date()
				sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
				const cutoff = sevenDaysAgo.toISOString()
			result = result.filter((d) => d.created_at && d.created_at >= cutoff)
		} else if (folder === 'agent') {
			const domainIds = agentDomainIds.value
			result = result.filter((d) => domainIds.has(d.id))
		} else if (folder !== 'all') {
			// Grade-based folders (A+, A, B, C, D)
			result = result.filter((d) => d.appraisal_grade === folder)
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

	/** Domain IDs that have prospects in contacted/negotiating status */
	const activeOutreachDomainIds = computed(() => {
		const ids = new Set<number>()
		// Lazy import to avoid circular dependency
		try {
			const { useProspectsStore } = require('@/stores/prospects')
			const prospectsStore = useProspectsStore()
			for (const p of prospectsStore.prospects) {
				if (['contacted', 'responded', 'negotiating'].includes(p.outreach_status)) {
					ids.add(p.domain_id)
				}
			}
		} catch { /* prospects store not initialized yet */ }
		return ids
	})

	/** Domain IDs tracked by AI agent (in watchlist or wishlist with ai_agent=true) */
	const agentDomainIds = computed(() => {
		const ids = new Set<number>()
		try {
			const { useWatchlistStore } = require('@/stores/watchlist')
			const { useWishlistStore } = require('@/stores/wishlist')
			const watchlistStore = useWatchlistStore()
			const wishlistStore = useWishlistStore()
			for (const w of watchlistStore.items) {
				if ((w as any).ai_agent) ids.add((w as any).domain_id ?? 0)
			}
			for (const w of wishlistStore.items) {
				if (w.ai_agent) ids.add((w as any).domain_id ?? 0)
			}
		} catch { /* stores not initialized yet */ }
		return ids
	})

	/** Smart folder counts for all folder tabs */
	const smartFolderCounts = computed(() => {
		const counts: Record<string, number> = {
			all: domains.value.length,
			ungraded: domains.value.filter((d) => !d.appraisal_grade).length,
			expiring: expiringSoon.value.length,
			undervalued: domains.value.filter((d) => {
				if (!d.appraisal_grade) return false
				const range = gradeToRange(d.appraisal_grade as AppraisalGrade)
				return range.low > Number(d.acquisition_cost) * 2
			}).length,
			outreach: activeOutreachDomainIds.value.size,
			recent: domains.value.filter((d) => {
				if (!d.created_at) return false
				const sevenDaysAgo = new Date()
				sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
				return d.created_at >= sevenDaysAgo.toISOString()
			}).length,
			agent: agentDomainIds.value.size,
		}
		for (const g of ['A+', 'A', 'B', 'C', 'D'] as AppraisalGrade[]) {
			counts[g] = domains.value.filter((d) => d.appraisal_grade === g).length
		}
		return counts
	})

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
		filterSmartFolder.value = 'all'
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

	async function bulkTag(ids: number[], tag: string): Promise<{ tagged: number; tag: string } | null> {
		error.value = null
		try {
			const res = await api.post('/domains/bulk-tag', { ids, tag })
			const toast = useToastStore()
			toast.success(`Tagged ${res.data.tagged} domain${res.data.tagged !== 1 ? 's' : ''} with "${res.data.tag}"`)
			return res.data
		} catch (e: any) {
			const msg = e.response?.data?.error || e.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to tag domains: ${msg}`)
			return null
		}
	}

	async function fetchTags(domainId: number) {
		try {
			const res = await api.get(`/domains/${domainId}/tags`)
			const domain = domains.value.find((d) => d.id === domainId)
			if (domain) domain.tags = res.data
			return res.data
		} catch {
			return []
		}
	}

	async function addTag(domainId: number, tag: string) {
		try {
			const res = await api.post(`/domains/${domainId}/tags`, { tag })
			const domain = domains.value.find((d) => d.id === domainId)
			if (domain) {
				if (!domain.tags) domain.tags = []
				domain.tags.push(res.data)
			}
			return res.data
		} catch (e: any) {
			const toast = useToastStore()
			toast.error(e.response?.data?.error || 'Failed to add tag')
			return null
		}
	}

	async function removeTag(domainId: number, tag: string) {
		try {
			await api.delete(`/domains/${domainId}/tags/${encodeURIComponent(tag)}`)
			const domain = domains.value.find((d) => d.id === domainId)
			if (domain?.tags) {
				domain.tags = domain.tags.filter((t) => t.tag !== tag)
			}
		} catch (e: any) {
			const toast = useToastStore()
			toast.error(e.response?.data?.error || 'Failed to remove tag')
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
		filterGrade: filterSmartFolder,
		filterSmartFolder,
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
		smartFolderCounts,
		activeOutreachDomainIds,
		agentDomainIds,
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
		bulkTag,
		fetchTags,
		addTag,
		removeTag,
	}
})
