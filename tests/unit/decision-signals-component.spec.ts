/**
 * Tests for DecisionSignals and SmartCtaButton Vue components.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DecisionSignals from '@/components/DecisionSignals.vue'
import SmartCtaButton from '@/components/SmartCtaButton.vue'
import type { DecisionSignal } from '@/lib/decision-signals'
import type { SmartCta } from '@/lib/smart-ctas'

// ─── DecisionSignals ────────────────────────────────────────────────

describe('DecisionSignals component', () => {
	const mockSignals: DecisionSignal[] = [
		{ key: 'hot_buy', label: 'Hot Buy', icon: 'bi-fire', variant: 'danger' },
		{ key: 'expiring_watch', label: 'Expiring Watch', icon: 'bi-clock-history', variant: 'warning' },
	]

	it('renders all signals as badges', () => {
		const wrapper = mount(DecisionSignals, { props: { signals: mockSignals } })
		const badges = wrapper.findAll('.decision-signal')
		expect(badges.length).toBe(2)
	})

	it('renders signal labels', () => {
		const wrapper = mount(DecisionSignals, { props: { signals: mockSignals } })
		expect(wrapper.text()).toContain('Hot Buy')
		expect(wrapper.text()).toContain('Expiring Watch')
	})

	it('renders signal icons', () => {
		const wrapper = mount(DecisionSignals, { props: { signals: mockSignals } })
		const icons = wrapper.findAll('.decision-signal i')
		expect(icons[0].classes()).toContain('bi-fire')
		expect(icons[1].classes()).toContain('bi-clock-history')
	})

	it('applies variant classes', () => {
		const wrapper = mount(DecisionSignals, { props: { signals: mockSignals } })
		const badges = wrapper.findAll('.decision-signal')
		expect(badges[0].classes()).toContain('bg-danger')
		expect(badges[1].classes()).toContain('bg-warning')
	})

	it('renders nothing when signals array is empty', () => {
		const wrapper = mount(DecisionSignals, { props: { signals: [] } })
		expect(wrapper.find('.decision-signals').exists()).toBe(false)
	})

	it('adds text-dark to warning variant for contrast', () => {
		const wrapper = mount(DecisionSignals, { props: { signals: mockSignals } })
		const badges = wrapper.findAll('.decision-signal')
		expect(badges[1].classes()).toContain('text-dark')
	})
})

// ─── SmartCtaButton ─────────────────────────────────────────────────

describe('SmartCtaButton component', () => {
	const mockCta: SmartCta = {
		key: 'find_prospects',
		label: 'Find Prospects',
		icon: 'bi-search',
		variant: 'primary',
		description: 'Find potential buyers for this domain.',
	}

	it('renders the CTA label', () => {
		const wrapper = mount(SmartCtaButton, { props: { cta: mockCta } })
		expect(wrapper.text()).toContain('Find Prospects')
	})

	it('renders the CTA icon', () => {
		const wrapper = mount(SmartCtaButton, { props: { cta: mockCta } })
		expect(wrapper.find('i').classes()).toContain('bi-search')
	})

	it('applies the variant class', () => {
		const wrapper = mount(SmartCtaButton, { props: { cta: mockCta } })
		expect(wrapper.find('button').classes()).toContain('btn-primary')
	})

	it('sets title from description', () => {
		const wrapper = mount(SmartCtaButton, { props: { cta: mockCta } })
		expect(wrapper.find('button').attributes('title')).toBe('Find potential buyers for this domain.')
	})

	it('emits action with cta key on click', async () => {
		const wrapper = mount(SmartCtaButton, { props: { cta: mockCta } })
		await wrapper.find('button').trigger('click')
		expect(wrapper.emitted('action')).toBeTruthy()
		expect(wrapper.emitted('action')![0]).toEqual(['find_prospects'])
	})

	it('renders different variants correctly', () => {
		const renewCta: SmartCta = {
			key: 'renew',
			label: 'Renew',
			icon: 'bi-arrow-repeat',
			variant: 'warning',
			description: 'Renew this domain.',
		}
		const wrapper = mount(SmartCtaButton, { props: { cta: renewCta } })
		expect(wrapper.find('button').classes()).toContain('btn-warning')
	})
})
