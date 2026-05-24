<script setup lang="ts">
import { useToastStore } from '@/stores/toast'
import type { ToastType } from '@/stores/toast'

const toastStore = useToastStore()

const iconMap: Record<ToastType, string> = {
  success: 'bi-check-circle-fill',
  error: 'bi-exclamation-triangle-fill',
  warning: 'bi-exclamation-circle-fill',
  info: 'bi-info-circle-fill',
}

function typeClass(type: ToastType): string {
  return `toast-${type}`
}

function progressBarColor(type: ToastType): string {
  const map: Record<ToastType, string> = {
    success: 'var(--success)',
    error: 'var(--danger)',
    warning: 'var(--warning)',
    info: 'var(--primary)',
  }
  return map[type]
}
</script>

<template>
  <div class="toast-container" aria-live="polite">
    <TransitionGroup name="toast-slide">
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        class="toast-item"
        :class="typeClass(toast.type)"
      >
        <div class="toast-content">
          <i :class="'bi ' + iconMap[toast.type]" class="toast-icon"></i>
          <span class="toast-message">{{ toast.message }}</span>
          <button class="toast-close" @click="toastStore.removeToast(toast.id)" aria-label="Close">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="toast-progress">
          <div
            class="toast-progress-bar"
            :style="{
              backgroundColor: progressBarColor(toast.type),
              animationDuration: toast.duration + 'ms',
            }"
          ></div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 400px;
  width: 100%;
  pointer-events: none;
}

.toast-item {
  border-radius: 0.5rem;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
  pointer-events: auto;
  backdrop-filter: blur(8px);
}

.toast-success { background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); }
.toast-error { background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); }
.toast-warning { background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.3); }
.toast-info { background: rgba(99, 102, 241, 0.12); border: 1px solid rgba(99, 102, 241, 0.3); }

.toast-content {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.75rem 1rem;
}

.toast-icon { font-size: 1.1rem; flex-shrink: 0; }
.toast-success .toast-icon { color: var(--success); }
.toast-error .toast-icon { color: var(--danger); }
.toast-warning .toast-icon { color: var(--warning); }
.toast-info .toast-icon { color: var(--primary); }

.toast-message {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--gray-800);
  line-height: 1.4;
}

.toast-close {
  background: none;
  border: none;
  color: var(--gray-400);
  cursor: pointer;
  padding: 0.125rem;
  font-size: 0.75rem;
  flex-shrink: 0;
  transition: color 0.2s;
}

.toast-close:hover { color: var(--gray-700); }

.toast-progress {
  height: 3px;
  background: var(--gray-100);
  overflow: hidden;
}

.toast-progress-bar {
  height: 100%;
  animation: toast-shrink linear forwards;
}

@keyframes toast-shrink {
  from { width: 100%; }
  to { width: 0%; }
}

/* Transition group animations */
.toast-slide-enter-active {
  transition: all 0.3s ease-out;
}
.toast-slide-leave-active {
  transition: all 0.25s ease-in;
}
.toast-slide-enter-from {
  opacity: 0;
  transform: translateX(100%);
}
.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
.toast-slide-move {
  transition: transform 0.3s ease;
}
</style>
