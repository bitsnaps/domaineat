import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: number
  message: string
  type: ToastType
  duration: number
}

let nextId = 0

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])

  function addToast(message: string, type: ToastType = 'info', duration: number = 4000) {
    const id = nextId++
    toasts.value.push({ id, message, type, duration })

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }
  }

  function removeToast(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function success(message: string) { addToast(message, 'success') }
  function error(message: string) { addToast(message, 'error', 6000) }
  function warning(message: string) { addToast(message, 'warning', 5000) }
  function info(message: string) { addToast(message, 'info') }

  return { toasts, addToast, removeToast, success, error, warning, info }
})
