/**
 * Tests for the 4 placeholder views — each is a simple stub.
 * These tests ensure the views render and contain expected route text.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

// Simple direct mount of each placeholder view
const views = [
  { name: 'DomainsView', path: '@/views/DomainsView.vue', expected: 'Domains' },
  { name: 'LedgerView', path: '@/views/LedgerView.vue', expected: 'Ledger' },
  { name: 'ProspectsView', path: '@/views/ProspectsView.vue', expected: 'Prospects' },
  { name: 'SettingsView', path: '@/views/SettingsView.vue', expected: 'Settings' },
]

for (const view of views) {
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
