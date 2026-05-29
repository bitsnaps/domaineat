import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useToastStore } from '@/stores/toast'
import api from '@/lib/api'
import type {
	WatchlistItem,
	WatchlistCreate,
} from '@/types'

export const useWatchlistStore = defineStore('watchlist', () => {
	// ─── State ─────────────────────────────────────────────────────────────
	const items = ref<WatchlistItem[]>([])
	const loading = ref(false)
	const error = ref<string | null>(null)

	// ─── Actions ───────────────────────────────────────────────────────────

	async function fetchWatchlist() {
		loading.value = true
		error.value = null
		try {
			const res = await api.get('/watchlist')
			items.value = res.data
		} catch (e: any) {
			const msg = e.friendlyMessage ?? e.response?.data?.error ?? e.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to fetch watchlist: ${msg}`)
		} finally {
			loading.value = false
		}
	}

	async function addToWatchlist(payload: WatchlistCreate): Promise<WatchlistItem | null> {
		error.value = null
		try {
			const res = await api.post('/watchlist', payload)
			const item: WatchlistItem = res.data
			items.value.unshift(item)
			const toast = useToastStore()
			toast.success('Added to watchlist')
			return item
		} catch (e: any) {
			const msg = e.friendlyMessage ?? e.response?.data?.error ?? e.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to add to watchlist: ${msg}`)
			return null
		}
	}

	async function removeFromWatchlist(id: number): Promise<boolean> {
		error.value = null
		try {
			await api.delete(`/watchlist/${id}`)
			items.value = items.value.filter((i) => i.id !== id)
			const toast = useToastStore()
			toast.success('Removed from watchlist')
			return true
		} catch (e: any) {
			const msg = e.friendlyMessage ?? e.response?.data?.error ?? e.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to remove from watchlist: ${msg}`)
			return false
		}
	}

	async function bulkCheck(): Promise<boolean> {
		error.value = null
		try {
			const res = await api.post('/watchlist/check')
			items.value = res.data
			const toast = useToastStore()
			toast.success('Watchlist availability updated')
			return true
		} catch (e: any) {
			const msg = e.friendlyMessage ?? e.response?.data?.error ?? e.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to check watchlist: ${msg}`)
			return false
		}
	}

	async function moveToPortfolio(ids: number[]): Promise<boolean> {
		error.value = null
		try {
			await api.post('/watchlist/move-to-portfolio', { ids })
			items.value = items.value.filter((i) => !ids.includes(i.id))
			const toast = useToastStore()
			toast.success(`Moved ${ids.length} domain${ids.length > 1 ? 's' : ''} to portfolio`)
			return true
		} catch (e: any) {
			const msg = e.friendlyMessage ?? e.response?.data?.error ?? e.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to move to portfolio: ${msg}`)
			return false
		}
	}

	return {
		// State
		items,
		loading,
		error,
		// Actions
		fetchWatchlist,
		addToWatchlist,
		removeFromWatchlist,
		bulkCheck,
		moveToPortfolio,
	}
})
