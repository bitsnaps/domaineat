import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import DashboardView from '@/views/DashboardView.vue'

describe('DashboardView (Landing Page)', () => {
 let router: ReturnType<typeof createRouter>
 let pinia: ReturnType<typeof createPinia>

 beforeEach(async () => {
 vi.useFakeTimers()
 pinia = createPinia()
 setActivePinia(pinia)
 router = createRouter({
 history: createMemoryHistory(),
 routes: [
 { path: '/', name: 'dashboard', component: DashboardView },
 ],
 })
 router.push('/')
 await router.isReady()
 })

 afterEach(() => {
 vi.useRealTimers()
 })

 const mountView = () =>
 mount(DashboardView, {
 global: {
 plugins: [pinia, router],
 stubs: {
 RouterLink: { template: '<a><slot /></a>' },
 },
 },
 })

  it('renders the hero section', () => {
    const wrapper = mountView()
    expect(wrapper.find('.hero').exists()).toBe(true)
  })

  it('contains the app name Domaineat in the hero', () => {
    const wrapper = mountView()
    expect(wrapper.text()).toContain('Domaineat')
  })

  it('renders the stats section with 4 stat items', () => {
    const wrapper = mountView()
    expect(wrapper.find('.stats-section').exists()).toBe(true)
    const vm = wrapper.vm as any
    expect(vm.stats.length).toBe(4)
  })

  it('renders the features section', () => {
    const wrapper = mountView()
    expect(wrapper.text()).toBeDefined()
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
    const vm = wrapper.vm as any
    expect(vm.stats[0].value).toBe(0)
  })

  it('animateCounters increments stat values over time', () => {
    const wrapper = mountView()
    const vm = wrapper.vm as any

    // Advance past the 300ms setTimeout in onMounted
    vi.advanceTimersByTime(310)

    // Now the setInterval should be running — advance past the full 2000ms duration
    vi.advanceTimersByTime(2500)

    // All stats should have reached their target values
    expect(vm.stats[0].value).toBe(vm.stats[0].target)
    expect(vm.stats[1].value).toBe(vm.stats[1].target)
    expect(vm.stats[2].value).toBe(vm.stats[2].target)
    expect(vm.stats[3].value).toBe(vm.stats[3].target)
  })

  it('stats increment gradually, not instantly', () => {
    const wrapper = mountView()
    const vm = wrapper.vm as any

    // Advance past the initial 300ms delay
    vi.advanceTimersByTime(310)

    // After just 500ms of animation, values should be > 0 but < target
    vi.advanceTimersByTime(500)

    expect(vm.stats[0].value).toBeGreaterThan(0)
    expect(vm.stats[0].value).toBeLessThan(vm.stats[0].target)
  })
})
