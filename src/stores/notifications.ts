import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToastStore } from '@/stores/toast'
import api from '@/lib/api'
import type { AppNotification } from '@/types'

export const useNotificationsStore = defineStore('notifications', () => {
	// ─── State ─────────────────────────────────────────────────────────────
	const items = ref<AppNotification[]>([])
	const loading = ref(false)
	const error = ref<string | null>(null)

	// ─── Getters ───────────────────────────────────────────────────────────

	/** Count of unread (not dismissed) notifications */
	const unreadCount = computed(() =>
		items.value.filter((n) => !n.dismissed).length,
	)

	/** Unread notifications only */
	const unreadItems = computed(() =>
		items.value.filter((n) => !n.dismissed),
	)

	// ─── Actions ───────────────────────────────────────────────────────────

	async function fetchNotifications() {
		loading.value = true
		error.value = null
		try {
			const res = await api.get('/notifications')
			items.value = res.data
		} catch (e: any) {
			const msg = e.friendlyMessage ?? e.response?.data?.error ?? e.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to fetch notifications: ${msg}`)
		} finally {
			loading.value = false
		}
	}

	async function dismissNotification(id: number): Promise<boolean> {
		error.value = null
		try {
			const res = await api.patch(`/notifications/${id}/dismiss`)
			const updated: AppNotification = res.data
			const idx = items.value.findIndex((n) => n.id === id)
			if (idx !== -1) items.value[idx] = updated
			return true
		} catch (e: any) {
			const msg = e.friendlyMessage ?? e.response?.data?.error ?? e.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to dismiss notification: ${msg}`)
			return false
		}
	}

	async function dismissAll(): Promise<boolean> {
		error.value = null
		try {
			await api.patch('/notifications/dismiss-all')
			items.value = items.value.map((n) => ({ ...n, dismissed: true }))
			return true
		} catch (e: any) {
			const msg = e.friendlyMessage ?? e.response?.data?.error ?? e.message
			error.value = msg
			const toast = useToastStore()
			toast.error(`Failed to dismiss all notifications: ${msg}`)
			return false
		}
	}

	return {
		// State
		items,
		loading,
		error,
		// Getters
		unreadCount,
		unreadItems,
		// Actions
		fetchNotifications,
		dismissNotification,
		dismissAll,
	}
})
