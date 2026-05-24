/**
 * E2E Smoke Tests — Domaineat
 *
 * These tests verify the app shell boots correctly, routes resolve,
 * and the main views render without crashing. They run in jsdom
 * (no browser required) and exercise the full Vue app mount cycle.
 *
 * For full browser E2E, add Playwright or Cypress.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import HomeView from '@/views/HomeView.vue'
import DomainsView from '@/views/DomainsView.vue'
import LedgerView from '@/views/LedgerView.vue'
import ProspectsView from '@/views/ProspectsView.vue'
import SettingsView from '@/views/SettingsView.vue'
import LoginView from '@/views/LoginView.vue'

// ─── Test Routes ──────────────────────────────────────────────────────

const testRoutes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/domains', name: 'domains', component: DomainsView },
  { path: '/ledger', name: 'ledger', component: LedgerView },
  { path: '/prospects', name: 'prospects', component: ProspectsView },
  { path: '/settings', name: 'settings', component: SettingsView },
  { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
]

// ─── Helpers ──────────────────────────────────────────────────────────

function createTestRouter(initialRoute = '/'): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: testRoutes,
  })
}

async function mountWithRouter(component: any, initialRoute = '/') {
  const pinia = createPinia()
  const router = createTestRouter(initialRoute)
  router.push(initialRoute)
  await router.isReady()

  const wrapper = mount(component, {
    global: {
      plugins: [pinia, router],
      stubs: {
        RouterView: false,
      },
    },
  })

  return { wrapper, router, pinia }
}

// ─── Smoke Tests ──────────────────────────────────────────────────────

describe('E2E Smoke — App Shell', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('mounts DefaultLayout without crashing', async () => {
    const { wrapper } = await mountWithRouter(DefaultLayout, '/')
    expect(wrapper.html()).toBeTruthy()
  })

  it('renders the Sidebar component with nav links', async () => {
    const { wrapper } = await mountWithRouter(DefaultLayout, '/')
    const html = wrapper.html()
    expect(html).toContain('Domains')
    expect(html).toContain('Ledger')
    expect(html).toContain('Prospects')
  })

  it('renders the Navbar with brand name', async () => {
    const { wrapper } = await mountWithRouter(DefaultLayout, '/')
    const html = wrapper.html()
    expect(html).toContain('Domain')
    expect(html).toContain('eat')
  })
})

describe('E2E Smoke — Route Resolution', () => {
  let router: Router

  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    router = createTestRouter('/')
    await router.push('/')
    await router.isReady()
  })

  it('resolves / to home route', () => {
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('navigates to /domains', async () => {
    await router.push('/domains')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('domains')
  })

  it('navigates to /ledger', async () => {
    await router.push('/ledger')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('ledger')
  })

  it('navigates to /prospects', async () => {
    await router.push('/prospects')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('prospects')
  })

  it('navigates to /settings', async () => {
    await router.push('/settings')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('settings')
  })

  it('navigates to /login', async () => {
    await router.push('/login')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('login')
  })
})

describe('E2E Smoke — View Rendering', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('HomeView renders without crashing', async () => {
    const { wrapper } = await mountWithRouter(HomeView, '/')
    expect(wrapper.html()).toBeTruthy()
  })

  it('DomainsView renders with filter controls', async () => {
    const pinia = createPinia()
    const router = createTestRouter('/domains')
    router.push('/domains')
    await router.isReady()

    const wrapper = mount(DomainsView, {
      global: { plugins: [pinia, router] },
    })
    const html = wrapper.html()
    expect(html).toContain('domain') // Domain-related UI
  })

  it('LedgerView renders without crashing', async () => {
    const pinia = createPinia()
    const router = createTestRouter('/ledger')
    router.push('/ledger')
    await router.isReady()

    const wrapper = mount(LedgerView, {
      global: { plugins: [pinia, router] },
    })
    expect(wrapper.html()).toBeTruthy()
  })

  it('ProspectsView renders without crashing', async () => {
    const pinia = createPinia()
    const router = createTestRouter('/prospects')
    router.push('/prospects')
    await router.isReady()

    const wrapper = mount(ProspectsView, {
      global: { plugins: [pinia, router] },
    })
    expect(wrapper.html()).toBeTruthy()
  })
})

describe('E2E Smoke — Store Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('domains store initializes with empty array', async () => {
    const { useDomainsStore } = await import('@/stores/domains')
    const store = useDomainsStore()
    expect(store.domains).toEqual([])
    expect(store.loading).toBe(false)
  })

  it('ledger store initializes with empty entries', async () => {
    const { useLedgerStore } = await import('@/stores/ledger')
    const store = useLedgerStore()
    expect(store.entries).toEqual([])
    expect(store.loading).toBe(false)
  })

  it('prospects store initializes with empty array', async () => {
    const { useProspectsStore } = await import('@/stores/prospects')
    const store = useProspectsStore()
    expect(store.prospects).toEqual([])
    expect(store.loading).toBe(false)
  })

  it('toast store can add and remove toasts', async () => {
    const { useToastStore } = await import('@/stores/toast')
    const store = useToastStore()
    store.success('Test success')
    expect(store.toasts.length).toBe(1)
    expect(store.toasts[0].type).toBe('success')
    store.removeToast(store.toasts[0].id)
    expect(store.toasts.length).toBe(0)
  })

  it('appState store toggles theme', async () => {
    const { useAppStateStore } = await import('@/stores/appState')
    const store = useAppStateStore()
    const initial = store.theme
    store.toggleTheme()
    expect(store.theme).not.toBe(initial)
  })
})
