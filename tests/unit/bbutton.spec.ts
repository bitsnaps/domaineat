import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BButton from '@/components/BButton.vue'

describe('BButton', () => {
  it('renders with variant class', () => {
    const wrapper = mount(BButton, {
      props: { variant: 'primary' },
      slots: { default: 'Click Me' },
    })
    expect(wrapper.find('button').classes()).toContain('btn-primary')
    expect(wrapper.text()).toBe('Click Me')
  })

  it('renders with danger variant', () => {
    const wrapper = mount(BButton, {
      props: { variant: 'danger' },
      slots: { default: 'Delete' },
    })
    expect(wrapper.find('button').classes()).toContain('btn-danger')
  })

  it('emits click event when clicked', async () => {
    const wrapper = mount(BButton, {
      props: { variant: 'primary' },
      slots: { default: 'OK' },
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
