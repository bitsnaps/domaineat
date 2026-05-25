/**
 * api.ts — Centralized API client with automatic auth header injection.
 *
 * All API calls should go through this client instead of raw fetch().
 * It reads the auth token from localStorage and attaches it as
 * a Bearer header on every request.
 *
 * Usage:
 *   import api from '@/lib/api'
 *   const res = await api.get('/api/domains')
 *   const res = await api.post('/api/domains', { domain_name: 'example.com' })
 */
import axios from 'axios'

const API_BASE = '/api'

const api = axios.create({
	baseURL: API_BASE,
	headers: { 'Content-Type': 'application/json' },
})

// Request interceptor: inject Bearer token from localStorage
api.interceptors.request.use((config) => {
	const token = localStorage.getItem('auth_token')
	if (token) {
		config.headers.Authorization = `Bearer ${token}`
	}
	return config
})

// Response interceptor: on 401, clear token and redirect to login
api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			const token = localStorage.getItem('auth_token')
			if (token) {
				localStorage.removeItem('auth_token')
				// Only redirect if we're not already on the login page
				if (window.location.pathname !== '/login') {
					window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
				}
			}
		}
		return Promise.reject(error)
	}
)

export default api
