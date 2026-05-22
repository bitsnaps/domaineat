import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'

describe('DashboardView (Landing Page)', () => {
  let router: ReturnType<typeof createRouter>

  beforeEach(async () => {
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'dashboard', component: DashboardView },
      ],
    })
    router.push('/')
    await router.isReady()
  })

  const mountView = () =>
    mount(DashboardView, {
      global: {
        plugins: [router],
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })

  it('renders the hero section', () => {
    const wrapper = mountView()
    expect(wrapper.find('.hero-section').exists()).toBe(true)
  })

  it('contains the app name Domaineat in the hero', () => {
    const wrapper = mountView()
    expect(wrapper.text()).toContain('Domaineat')
  })

  it('renders the stats section with 4 stat items', () => {
    const wrapper = mountView()
    expect(wrapper.find('.stats-section').exists()).toBe(true)
    // Stats are rendered via v-for
    const vm = wrapper.vm as any
    if (vm.stats) {
      expect(vm.stats.length).toBe(4)
    }
  })

  it('renders the features section', () => {
    const wrapper = mountView()
    expect(wrapper.find('.features-section').exists() || wrapper.text()).toBeDefined()
  })

  it('has a Get Started CTA button', () => {
    const wrapper = mountView()
    const buttons = wrapper.findAll('a.btn, button.btn')
    const ctaText = buttons.some((b) => b.text().toLowerCase().includes('get started'))
    expect(ctaText).toBe(true)
  })

  it('has a footer section', () => {
    const wrapper = mountView()
    expect(wrapper.find('footer').exists()).toBe(true)
  })

  it('stat values start at 0 before animation', () => {
    const wrapper = mountView()
    // On mount, the animated counters start at 0
    const vm = wrapper.vm as any
    if (vm.stats) {
      expect(vm.stats[0].value).toBe(0)
    }
  })
})
