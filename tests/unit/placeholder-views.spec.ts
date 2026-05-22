/**
 * Tests for the app views.
 * DomainsView, LedgerView, ProspectsView require Pinia.
 * SettingsView fetches data on mount (no Pinia needed but has async setup).
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// SettingsView — no Pinia but has async data fetch
describe('SettingsView', () => {
  it('renders without error', async () => {
    const mod = await import('@/views/SettingsView.vue')
    const component = mod.default
    const wrapper = mount(component, {
      global: {
        stubs: { teleport: true },
      },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('contains "Settings" heading', async () => {
    const mod = await import('@/views/SettingsView.vue')
    const component = mod.default
    const wrapper = mount(component, {
      global: {
        stubs: { teleport: true },
      },
    })
    expect(wrapper.text()).toContain('Settings')
  })

  it('shows AI Configuration section', async () => {
    const mod = await import('@/views/SettingsView.vue')
    const component = mod.default
    const wrapper = mount(component, {
      global: {
        stubs: { teleport: true },
      },
    })
    expect(wrapper.text()).toContain('AI Configuration')
  })
})

// Views that require Pinia
const piniaViews = [
  { name: 'DomainsView', path: '@/views/DomainsView.vue', expected: 'Domain' },
  { name: 'LedgerView', path: '@/views/LedgerView.vue', expected: 'Total Costs' },
  { name: 'ProspectsView', path: '@/views/ProspectsView.vue', expected: 'Total Prospects' },
]

for (const view of piniaViews) {
  describe(`${view.name}`, () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    it('renders without error', async () => {
      const mod = await import(view.path)
      const component = mod.default
      const wrapper = mount(component, {
        global: { plugins: [createPinia()] },
      })
      expect(wrapper.exists()).toBe(true)
    })

    it(`contains "${view.expected}" text`, async () => {
      const mod = await import(view.path)
      const component = mod.default
      const wrapper = mount(component, {
        global: { plugins: [createPinia()] },
      })
      expect(wrapper.text()).toContain(view.expected)
    })
  })
}
