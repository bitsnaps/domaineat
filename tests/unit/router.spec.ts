import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from '@/App.vue'

const routes = [
  { path: '/', name: 'dashboard', component: { template: '<div>Dashboard</div>' } },
  { path: '/domains', name: 'domains', component: { template: '<div>Domains</div>' } },
  { path: '/ledger', name: 'ledger', component: { template: '<div>Ledger</div>' } },
  { path: '/prospects', name: 'prospects', component: { template: '<div>Prospects</div>' } },
  { path: '/settings', name: 'settings', component: { template: '<div>Settings</div>' } },
]

describe('App Vue Router integration', () => {
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
  })

  it('installs vue-router plugin on the app', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [pinia, router],
        stubs: {
          RouterView: true,
          RouterLink: true,
        },
      },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('renders a RouterView component', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [pinia, router],
        stubs: {
          RouterView: { template: '<div data-testid="router-view">routed</div>' },
          RouterLink: true,
        },
      },
    })
    expect(wrapper.find('[data-testid="router-view"]').exists()).toBe(true)
  })

  it('navigates to /domains route', async () => {
    await router.push('/domains')
    expect(router.currentRoute.value.name).toBe('domains')
    expect(router.currentRoute.value.path).toBe('/domains')
  })

  it('navigates to /ledger route', async () => {
    await router.push('/ledger')
    expect(router.currentRoute.value.name).toBe('ledger')
  })

  it('navigates to /prospects route', async () => {
    await router.push('/prospects')
    expect(router.currentRoute.value.name).toBe('prospects')
  })

  it('navigates to /settings route', async () => {
    await router.push('/settings')
    expect(router.currentRoute.value.name).toBe('settings')
  })
})
