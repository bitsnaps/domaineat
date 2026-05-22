/**
 * Tests for the app views.
 * DomainsView and LedgerView require Pinia.
 * ProspectsView and SettingsView remain simple stubs.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// Simple stub views (no Pinia needed)
const stubViews = [
  { name: 'ProspectsView', path: '@/views/ProspectsView.vue', expected: 'Prospects' },
  { name: 'SettingsView', path: '@/views/SettingsView.vue', expected: 'Settings' },
]

for (const view of stubViews) {
  describe(`${view.name}`, () => {
    it('renders without error', async () => {
      const mod = await import(view.path)
      const component = mod.default
      const wrapper = mount(component)
      expect(wrapper.exists()).toBe(true)
    })

    it(`contains "${view.expected}" text`, async () => {
      const mod = await import(view.path)
      const component = mod.default
      const wrapper = mount(component)
      expect(wrapper.text()).toContain(view.expected)
    })
  })
}

// Views that require Pinia
const piniaViews = [
  { name: 'DomainsView', path: '@/views/DomainsView.vue', expected: 'Domain' },
  { name: 'LedgerView', path: '@/views/LedgerView.vue', expected: 'Total Costs' },
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
