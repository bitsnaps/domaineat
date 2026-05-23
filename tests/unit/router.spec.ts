import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, type RouteRecordRaw } from 'vue-router'
import App from '@/App.vue'

// Minimal views for testing
const DummyView = { template: '<div data-testid="routed-view">routed</div>' }
const AppLayout = { template: '<div data-testid="app-layout"><RouterView /></div>' }
const DefaultLayout = { template: '<div data-testid="default-layout"><RouterView /></div>' }

const routes: RouteRecordRaw[] = [
 {
  path: '/',
  component: AppLayout,
  children: [
   { path: '', name: 'dashboard', component: DummyView },
  ],
 },
 {
  path: '/login',
  name: 'login',
  component: DummyView,
  meta: { public: true },
 },
 {
  path: '/',
  component: DefaultLayout,
  meta: { requiresAuth: true },
  children: [
   { path: 'domains', name: 'domains', component: DummyView },
   { path: 'ledger', name: 'ledger', component: DummyView },
   { path: 'prospects', name: 'prospects', component: DummyView },
   { path: 'settings', name: 'settings', component: DummyView },
  ],
 },
]

describe('Vue Router integration', () => {
  let pinia: ReturnType<typeof createPinia>
  let router: ReturnType<typeof createRouter>

  beforeEach(async () => {
    pinia = createPinia()
    setActivePinia(pinia)

    router = createRouter({
      history: createMemoryHistory(),
      routes,
    })
    router.push('/')
    await router.isReady()

    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    })
  })

  it('installs the router plugin without error', () => {
    const app = mount(App, {
      global: { plugins: [pinia, router] },
    })
    expect(app).toBeDefined()
  })

  it('renders RouterView at the root', () => {
    const wrapper = mount(App, {
      global: { plugins: [pinia, router] },
    })
    // App.vue is just <RouterView /> — child layout renders
    expect(wrapper.element.children.length).toBeGreaterThan(0)
  })

  it('navigates to / (landing/dashboard)', async () => {
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('navigates to /domains', async () => {
    await router.push('/domains')
    expect(router.currentRoute.value.name).toBe('domains')
  })

  it('navigates to /ledger', async () => {
    await router.push('/ledger')
    expect(router.currentRoute.value.name).toBe('ledger')
  })

  it('navigates to /prospects', async () => {
    await router.push('/prospects')
    expect(router.currentRoute.value.name).toBe('prospects')
  })

 it('navigates to /settings', async () => {
  await router.push('/settings')
  expect(router.currentRoute.value.name).toBe('settings')
 })

 it('navigates to /login', async () => {
  await router.push('/login')
  expect(router.currentRoute.value.name).toBe('login')
 })
})
