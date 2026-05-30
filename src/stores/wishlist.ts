import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToastStore } from '@/stores/toast'
import api from '@/lib/api'
import type {
	WishlistItem,
	WishlistCreate,
	WishlistUpdate,
	WishlistPriority,
} from '@/types'

const PRIORITY_ORDER: Record<WishlistPriority, number> = {
	critical: 0,
	high: 1,
	medium: 2,
	low: 3,
}

export const useWishlistStore = defineStore('wishlist', () => {
	// ─── State ─────────────────────────────────────────────────────────────
	const items = ref<WishlistItem[]>([])
	const loading = ref(false)
	const error = ref<string | null>(null)

	// ─── Getters ───────────────────────────────────────────────────────────

	/** Items sorted by priority: critical → high → medium → low */
	const sortedByPriority = computed(() =>
		[...items.value].sort(
			(a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
		),
	)

	// ─── Actions ───────────────────────────────────────────────────────────

	async function fetchWishlist() {
		loading.value = true
		error.value = null
		try {
			const res = await api.get('/wishlist')
			items.value = res.data
		} catch (e: any) {
			const msg = e.friendlyMessage ?? e.response?.data?.error ?? e.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to fetch wishlist: ${msg}`)
		} finally {
			loading.value = false
		}
	}

	async function addToWishlist(payload: WishlistCreate): Promise<WishlistItem | null> {
		error.value = null
		try {
			const res = await api.post('/wishlist', payload)
			const item: WishlistItem = res.data
			items.value.unshift(item)
			const toast = useToastStore()
			toast.success('Added to wishlist')
			return item
		} catch (e: any) {
			const msg = e.friendlyMessage ?? e.response?.data?.error ?? e.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to add to wishlist: ${msg}`)
			return null
		}
	}

	async function updateWishlistItem(id: number, payload: WishlistUpdate): Promise<WishlistItem | null> {
		error.value = null
		try {
			const res = await api.put(`/wishlist/${id}`, payload)
			const updated: WishlistItem = res.data
			const idx = items.value.findIndex((i) => i.id === id)
			if (idx !== -1) items.value[idx] = updated
			const toast = useToastStore()
			toast.success('Wishlist item updated')
			return updated
		} catch (e: any) {
			const msg = e.friendlyMessage ?? e.response?.data?.error ?? e.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to update wishlist item: ${msg}`)
			return null
		}
	}

	async function removeFromWishlist(id: number): Promise<boolean> {
		error.value = null
		try {
			await api.delete(`/wishlist/${id}`)
			items.value = items.value.filter((i) => i.id !== id)
			const toast = useToastStore()
			toast.success('Removed from wishlist')
			return true
		} catch (e: any) {
			const msg = e.friendlyMessage ?? e.response?.data?.error ?? e.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to remove from wishlist: ${msg}`)
			return false
		}
	}

	async function moveToPortfolio(ids: number[]): Promise<boolean> {
		error.value = null
		try {
			await api.post('/wishlist/move-to-portfolio', { ids })
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

	async function bulkCheck(): Promise<boolean> {
		error.value = null
		try {
			const res = await api.post('/wishlist/check')
			items.value = res.data
			const toast = useToastStore()
			toast.success('Wishlist availability updated')
			return true
		} catch (e: any) {
			const msg = e.friendlyMessage ?? e.response?.data?.error ?? e.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to check wishlist: ${msg}`)
			return false
		}
	}

	async function bulkDelete(ids: number[]): Promise<number> {
		error.value = null
		try {
			const res = await api.delete('/wishlist/bulk', { data: { ids } })
			const deleted: number = res.data.deleted ?? 0
			items.value = items.value.filter((i) => !ids.includes(i.id))
			const toast = useToastStore()
			toast.success(`Deleted ${deleted} item${deleted !== 1 ? 's' : ''} from wishlist`)
			return deleted
		} catch (e: any) {
			const msg = e.friendlyMessage ?? e.response?.data?.error ?? e.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to bulk delete: ${msg}`)
			return 0
		}
	}

	async function exportCsv(): Promise<boolean> {
		error.value = null
		try {
			const res = await api.get('/wishlist/export', { responseType: 'blob' })
			const url = window.URL.createObjectURL(new Blob([res.data as BlobPart], { type: 'text/csv' }))
			const link = document.createElement('a')
			link.href = url
			link.setAttribute('download', 'wishlist.csv')
			document.body.appendChild(link)
			link.click()
			link.remove()
			window.URL.revokeObjectURL(url)
			const toast = useToastStore()
			toast.success('Wishlist exported')
			return true
		} catch (e: any) {
			const msg = e.friendlyMessage ?? e.response?.data?.error ?? e.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to export wishlist: ${msg}`)
			return false
		}
	}

	async function prospectAll(ids: number[]): Promise<number> {
		error.value = null
		try {
			const res = await api.post('/wishlist/prospect-all', { ids })
			const found: number = res.data.found ?? 0
			const toast = useToastStore()
			toast.success(`Found ${found} prospect${found !== 1 ? 's' : ''} for selected domains`)
			return found
		} catch (e: any) {
			const msg = e.friendlyMessage ?? e.response?.data?.error ?? e.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to find prospects: ${msg}`)
			return 0
		}
	}

	return {
		// State
		items,
		loading,
		error,
		// Getters
		sortedByPriority,
		// Actions
		fetchWishlist,
		addToWishlist,
		updateWishlistItem,
		removeFromWishlist,
		moveToPortfolio,
		bulkCheck,
		bulkDelete,
		exportCsv,
		prospectAll,
	}
})
