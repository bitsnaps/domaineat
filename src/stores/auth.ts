import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, UserTier } from '@/types'

const API_BASE = '/api'

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

  /** Helper: make authenticated fetch */
  function authFetch(url: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }
    if (token.value) {
      headers['Authorization'] = `Bearer ${token.value}`
    }
    return fetch(url, { ...options, headers })
  }

 /** Register a new user */
 async function register(email: string, password: string, confirmPassword: string) {
 loading.value = true
 error.value = null
 try {
 const res = await fetch(`${API_BASE}/auth/register`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ email, password, confirmPassword }),
 })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)

      token.value = data.token
      user.value = data.user
      localStorage.setItem('auth_token', data.token)
    } catch (err: any) {
      error.value = err.message
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
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)

      token.value = data.token
      user.value = data.user
      localStorage.setItem('auth_token', data.token)
    } catch (err: any) {
      error.value = err.message
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
      const res = await authFetch(`${API_BASE}/auth/me`)
      if (res.ok) {
        user.value = await res.json()
      } else {
        // Token invalid — logout
        logout()
      }
    } catch {
      // Network error — keep token, try later
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
    authFetch,
    register,
    login,
    logout,
    fetchProfile,
  }
})
