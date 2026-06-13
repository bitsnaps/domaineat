import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToastStore } from '@/stores/toast'
import api from '@/lib/api'

interface AdminUser {
	id: number
	email: string
	tier: string
	role: string
	llm_provider: string | null
	llm_model: string | null
	preferred_registrar: string | null
	daily_ai_calls: number
	daily_rdap_calls: number
	created_at: string
}

interface AdminPlan {
	tier: string
	name: string
	price_monthly: number
	price_yearly: number
	domains: number
	rdap_daily: number
	ai_daily: number
	watchlist: number
	wishlist: number
	features: string
	active: boolean
	created_at: string
	updated_at: string
}

interface AdminStats {
	totalUsers: number
	totalDomains: number
	adminCount: number
	tierDistribution: Record<string, number>
}

export { type AdminUser, type AdminPlan, type AdminStats }

export const useAdminStore = defineStore('admin', () => {
	// ─── State ─────────────────────────────────────────────────────────
	const users = ref<AdminUser[]>([])
	const plans = ref<AdminPlan[]>([])
	const domains = ref<any[]>([])
	const stats = ref<AdminStats | null>(null)
	const loading = ref(false)
	const error = ref<string | null>(null)

	// Search/filter
	const userSearch = ref('')

	// ─── Getters ───────────────────────────────────────────────────────
	const filteredUsers = computed(() => {
		if (!userSearch.value) return users.value
		const q = userSearch.value.toLowerCase()
		return users.value.filter((u) => u.email.toLowerCase().includes(q))
	})

	// ─── Actions ───────────────────────────────────────────────────────

	async function fetchStats() {
		loading.value = true
		error.value = null
		try {
			const res = await api.get('/admin/stats')
			stats.value = res.data
		} catch (e: any) {
			error.value = e.response?.data?.error || e.message
		} finally {
			loading.value = false
		}
	}

	async function fetchUsers() {
		loading.value = true
		error.value = null
		try {
			const res = await api.get('/admin/users')
			users.value = res.data.users || res.data
		} catch (e: any) {
			error.value = e.response?.data?.error || e.message
		} finally {
			loading.value = false
		}
	}

	async function fetchUser(id: number): Promise<AdminUser | null> {
		try {
			const res = await api.get(`/admin/users/${id}`)
			return res.data
		} catch (e: any) {
			const toast = useToastStore()
			toast.error(e.response?.data?.error || 'Failed to fetch user')
			return null
		}
	}

	async function updateUser(id: number, data: Partial<AdminUser>): Promise<boolean> {
		try {
			const res = await api.patch(`/admin/users/${id}`, data)
			const idx = users.value.findIndex((u) => u.id === id)
			if (idx !== -1) users.value[idx] = res.data
			const toast = useToastStore()
			toast.success('User updated')
			return true
		} catch (e: any) {
			const toast = useToastStore()
			toast.error(e.response?.data?.error || 'Failed to update user')
			return false
		}
	}

	async function deleteUser(id: number, cascade = false): Promise<boolean> {
		try {
			await api.delete(`/admin/users/${id}?cascade=${cascade}`)
			users.value = users.value.filter((u) => u.id !== id)
			const toast = useToastStore()
			toast.success('User deleted')
			return true
		} catch (e: any) {
			const toast = useToastStore()
			toast.error(e.response?.data?.error || 'Failed to delete user')
			return false
		}
	}

	async function resetUsage(id: number): Promise<boolean> {
		try {
			await api.post(`/admin/users/${id}/reset-usage`)
			const toast = useToastStore()
			toast.success('Usage counters reset')
			return true
		} catch (e: any) {
			const toast = useToastStore()
			toast.error(e.response?.data?.error || 'Failed to reset usage')
			return false
		}
	}

	async function fetchPlans() {
		loading.value = true
		error.value = null
		try {
			const res = await api.get('/admin/plans')
			plans.value = res.data
		} catch (e: any) {
			error.value = e.response?.data?.error || e.message
		} finally {
			loading.value = false
		}
	}

	async function updatePlan(tier: string, data: Partial<AdminPlan>): Promise<boolean> {
		try {
			const res = await api.put(`/admin/plans/${tier}`, data)
			const idx = plans.value.findIndex((p) => p.tier === tier)
			if (idx !== -1) plans.value[idx] = res.data
			const toast = useToastStore()
			toast.success('Plan updated')
			return true
		} catch (e: any) {
			const toast = useToastStore()
			toast.error(e.response?.data?.error || 'Failed to update plan')
			return false
		}
	}

	async function fetchAllDomains() {
		loading.value = true
		error.value = null
		try {
			const res = await api.get('/admin/domains')
			domains.value = res.data
		} catch (e: any) {
			error.value = e.response?.data?.error || e.message
		} finally {
			loading.value = false
		}
	}

	return {
		// State
		users,
		plans,
		domains,
		stats,
		loading,
		error,
		userSearch,
		// Getters
		filteredUsers,
		// Actions
		fetchStats,
		fetchUsers,
		fetchUser,
		updateUser,
		deleteUser,
		resetUsage,
		fetchPlans,
		updatePlan,
		fetchAllDomains,
	}
})
