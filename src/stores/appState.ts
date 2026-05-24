import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStateStore = defineStore('appState', () => {
 const sidebarCollapsed = ref(false)
 const mobileMenuOpen = ref(false)
 const theme = ref<'light' | 'dark'>('light')

 const toggleSidebar = () => {
 sidebarCollapsed.value = !sidebarCollapsed.value
 localStorage.setItem('app_sidebar_collapsed', String(sidebarCollapsed.value))
 }

 const toggleMobileMenu = () => {
 mobileMenuOpen.value = !mobileMenuOpen.value
 }

 const closeMobileMenu = () => {
 mobileMenuOpen.value = false
 }

 const toggleTheme = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-bs-theme', theme.value)
    localStorage.setItem('app_theme', theme.value)
  }

  // Initialize from localStorage
  const savedSidebar = localStorage.getItem('app_sidebar_collapsed')
  if (savedSidebar === 'true') sidebarCollapsed.value = true

  const savedTheme = localStorage.getItem('app_theme') as 'light' | 'dark' | null
  if (savedTheme) {
    theme.value = savedTheme
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-bs-theme', savedTheme)
    }
  } else if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    theme.value = 'dark'
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-bs-theme', 'dark')
    }
  }

  return { sidebarCollapsed, mobileMenuOpen, theme, toggleSidebar, toggleMobileMenu, closeMobileMenu, toggleTheme }
})
