/**
 * Tests for the 4 app views — each is a simple stub except DomainsView.
 * DomainsView requires Pinia, so we create a test store for it.
 * LedgerView, ProspectsView, SettingsView remain simple stubs.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// Simple stub views (no Pinia needed)
const stubViews = [
  { name: 'LedgerView', path: '@/views/LedgerView.vue', expected: 'Ledger' },
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

// DomainsView requires Pinia
describe('DomainsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders without error', async () => {
    const mod = await import('@/views/DomainsView.vue')
    const component = mod.default
    const wrapper = mount(component, {
      global: { plugins: [createPinia()] },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('contains "Domain" text', async () => {
    const mod = await import('@/views/DomainsView.vue')
    const component = mod.default
    const wrapper = mount(component, {
      global: { plugins: [createPinia()] },
    })
    expect(wrapper.text()).toContain('Domain')
  })
})
