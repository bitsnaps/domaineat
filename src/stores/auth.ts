import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, UserTier } from '@/types'
import api from '@/lib/api'

export const useAuthStore = defineStore('auth', () => {
	const token = ref<string | null>(localStorage.getItem('auth_token'))
	const user = ref<User | null>(null)
	const loading = ref(false)
	const error = ref<string | null>(null)

	const isLoggedIn = computed(() => !!token.value)
	const userTier = computed<UserTier>(() => user.value?.tier || 'free')

	// Tier limits
	const tierLimits = computed(() => {
		const limits: Record<string, { domains: number; rdapDaily: number; aiDaily: number }> = {
			free: { domains: 10, rdapDaily: 5, aiDaily: 5 },
			premium: { domains: 1000, rdapDaily: 100, aiDaily: 100 },
			enterprise: { domains: Infinity, rdapDaily: Infinity, aiDaily: Infinity },
		}
		return limits[userTier.value] || limits.free
	})

	/** Register a new user */
	async function register(email: string, password: string, confirmPassword: string) {
		loading.value = true
		error.value = null
		try {
			const res = await api.post('/auth/register', { email, password, confirmPassword })
			token.value = res.data.token
			user.value = res.data.user
			localStorage.setItem('auth_token', res.data.token)
		} catch (err: any) {
			error.value = err.response?.data?.error || err.message
			throw err
		} finally {
			loading.value = false
		}
	}

	/** Login */
	async function login(email: string, password: string) {
		loading.value = true
		error.value = null
		try {
			const res = await api.post('/auth/login', { email, password })
			token.value = res.data.token
			user.value = res.data.user
			localStorage.setItem('auth_token', res.data.token)
		} catch (err: any) {
			error.value = err.response?.data?.error || err.message
			throw err
		} finally {
			loading.value = false
		}
	}

	/** Logout */
	function logout() {
		token.value = null
		user.value = null
		localStorage.removeItem('auth_token')
	}

	/** Fetch current user profile */
	async function fetchProfile() {
		if (!token.value) return
		try {
			const res = await api.get('/auth/me')
			user.value = res.data
		} catch {
			// Token invalid — logout
			logout()
		}
	}

	// Auto-fetch profile on store creation if token exists
	if (token.value) {
		fetchProfile()
	}

	return {
		token,
		user,
		loading,
		error,
		isLoggedIn,
		userTier,
		tierLimits,
		register,
		login,
		logout,
		fetchProfile,
	}
})
