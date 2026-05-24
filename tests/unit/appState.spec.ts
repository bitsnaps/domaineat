import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAppStateStore } from '@/stores/appState'

describe('appState store', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    })
  })

  it('has default values', () => {
    const store = useAppStateStore()
    expect(store.sidebarCollapsed).toBe(false)
    expect(store.theme).toBe('light')
  })

  it('toggles sidebar collapsed state', () => {
    const store = useAppStateStore()
    expect(store.sidebarCollapsed).toBe(false)
    store.toggleSidebar()
    expect(store.sidebarCollapsed).toBe(true)
    store.toggleSidebar()
    expect(store.sidebarCollapsed).toBe(false)
  })

  it('persists sidebar state to localStorage', () => {
    const store = useAppStateStore()
    store.toggleSidebar()
    expect(localStorage.setItem).toHaveBeenCalledWith('app_sidebar_collapsed', 'true')
  })

  it('reads sidebar state from localStorage on init', () => {
    ;(localStorage.getItem as any).mockImplementation((key: string) => {
      if (key === 'app_sidebar_collapsed') return 'true'
      return null
    })
    const store = useAppStateStore()
    expect(store.sidebarCollapsed).toBe(true)
  })

  it('toggles theme between light and dark', () => {
    const store = useAppStateStore()
    expect(store.theme).toBe('light')
    store.toggleTheme()
    expect(store.theme).toBe('dark')
    store.toggleTheme()
    expect(store.theme).toBe('light')
  })

  it('persists theme to localStorage', () => {
    const store = useAppStateStore()
    store.toggleTheme()
    expect(localStorage.setItem).toHaveBeenCalledWith('app_theme', 'dark')
  })

  it('reads theme from localStorage on init', () => {
    ;(localStorage.getItem as any).mockImplementation((key: string) => {
      if (key === 'app_theme') return 'dark'
      return null
    })
    const store = useAppStateStore()
    expect(store.theme).toBe('dark')
  })

 it('detects system prefers-color-scheme: dark', () => {
 ;(window.matchMedia as any).mockImplementation((query: string) => ({
 matches: query === '(prefers-color-scheme: dark)',
 media: query,
 onchange: null,
 addListener: vi.fn(),
 removeListener: vi.fn(),
 addEventListener: vi.fn(),
 removeEventListener: vi.fn(),
 dispatchEvent: vi.fn(),
 }))
 const store = useAppStateStore()
 expect(store.theme).toBe('dark')
 })

 it('toggles mobile menu', () => {
 const store = useAppStateStore()
 expect(store.mobileMenuOpen).toBe(false)
 store.toggleMobileMenu()
 expect(store.mobileMenuOpen).toBe(true)
 store.toggleMobileMenu()
 expect(store.mobileMenuOpen).toBe(false)
 })

 it('closes mobile menu', () => {
 const store = useAppStateStore()
 store.toggleMobileMenu()
 expect(store.mobileMenuOpen).toBe(true)
 store.closeMobileMenu()
 expect(store.mobileMenuOpen).toBe(false)
 // closeMobileMenu is idempotent
 store.closeMobileMenu()
 expect(store.mobileMenuOpen).toBe(false)
 })
})
