import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

const routes = [
  { path: '/', name: 'dashboard', component: { template: '<div>Dashboard</div>' } },
  { path: '/domains', name: 'domains', component: { template: '<div>Domains</div>' } },
  { path: '/ledger', name: 'ledger', component: { template: '<div>Ledger</div>' } },
  { path: '/prospects', name: 'prospects', component: { template: '<div>Prospects</div>' } },
  { path: '/settings', name: 'settings', component: { template: '<div>Settings</div>' } },
]

describe('DefaultLayout', () => {
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

    // Mock localStorage
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    })
  })

  const mountLayout = () =>
    mount(DefaultLayout, {
      global: {
        plugins: [pinia, router],
        stubs: {
          RouterView: { template: '<div data-testid="router-view">routed</div>' },
        },
      },
    })

  it('renders the sidebar', () => {
    const wrapper = mountLayout()
    expect(wrapper.find('aside.sidebar').exists()).toBe(true)
  })

  it('renders the top navbar', () => {
    const wrapper = mountLayout()
    expect(wrapper.find('nav.navbar').exists()).toBe(true)
  })

  it('renders the main content area with RouterView', () => {
    const wrapper = mountLayout()
    expect(wrapper.find('[data-testid="router-view"]').exists()).toBe(true)
  })

  it('has navigation links for all 5 routes', () => {
    const wrapper = mountLayout()
    const links = wrapper.findAllComponents({ name: 'RouterLink' })
    const hrefs = links.map((l) => l.props('to'))
    expect(hrefs).toContain('/')
    expect(hrefs).toContain('/domains')
    expect(hrefs).toContain('/ledger')
    expect(hrefs).toContain('/prospects')
    expect(hrefs).toContain('/settings')
  })

  it('sidebar has a brand/app name', () => {
    const wrapper = mountLayout()
    expect(wrapper.find('.sidebar-brand').text()).toContain('Domaineat')
  })

  it('sidebar has a collapse toggle button', () => {
    const wrapper = mountLayout()
    const btn = wrapper.find('.sidebar-toggle-btn')
    expect(btn.exists()).toBe(true)
  })

  it('sidebar collapses when toggle is clicked', async () => {
    const wrapper = mountLayout()
    // Initially expanded
    expect(wrapper.find('aside.sidebar').classes()).not.toContain('sidebar-collapsed')

    // Click the sidebar toggle button
    const btn = wrapper.find('.sidebar-toggle-btn')
    await btn.trigger('click')

    // Now collapsed
    expect(wrapper.find('aside.sidebar').classes()).toContain('sidebar-collapsed')
  })

  it('hamburger button in navbar also toggles sidebar', async () => {
    const wrapper = mountLayout()
    const hamburger = wrapper.find('[data-testid="sidebar-hamburger"]')
    expect(hamburger.exists()).toBe(true)

    await hamburger.trigger('click')
    expect(wrapper.find('aside.sidebar').classes()).toContain('sidebar-collapsed')
  })

  it('has a dark mode toggle in the navbar', () => {
    const wrapper = mountLayout()
    expect(wrapper.find('[data-testid="theme-toggle"]').exists()).toBe(true)
  })

  it('sidebar labels are hidden when collapsed', async () => {
    const wrapper = mountLayout()
    // When expanded, labels are visible
    const labels = wrapper.findAll('.sidebar-label')
    expect(labels.length).toBeGreaterThan(0)

    // Collapse
    await wrapper.find('.sidebar-toggle-btn').trigger('click')

    // Labels should have opacity 0 via CSS class
    expect(wrapper.find('aside.sidebar').classes()).toContain('sidebar-collapsed')
  })
})
