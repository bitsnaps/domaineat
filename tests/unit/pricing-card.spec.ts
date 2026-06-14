import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PricingCard from '@/components/PricingCard.vue'
import type { PricingResponse } from '@/types'

function makePricing(overrides: Partial<PricingResponse> = {}): PricingResponse {
	return {
		domain: 'example.com',
		available: true,
		prices: [
			{ provider: 'Porkbun', domain: 'example.com', available: true, register: 9.58, renew: 9.58, transfer: 9.58, currency: 'USD', buyUrl: 'https://porkbun.com/checkout/example.com' },
			{ provider: 'Cloudflare', domain: 'example.com', available: true, register: 10.11, renew: 10.11, transfer: 10.11, currency: 'USD' },
			{ provider: 'GoDaddy', domain: 'example.com', available: true, register: 11.99, renew: 21.99, transfer: null, currency: 'USD' },
		],
		providersConfigured: ['Porkbun', 'Cloudflare', 'GoDaddy'],
		...overrides,
	}
}

describe('PricingCard', () => {
	it('renders domain pricing header', () => {
		const wrapper = mount(PricingCard, { props: { pricing: makePricing() } })
		expect(wrapper.text()).toContain('Domain Pricing')
	})

	it('shows Available badge when domain is available', () => {
		const wrapper = mount(PricingCard, { props: { pricing: makePricing({ available: true }) } })
		const badge = wrapper.find('.badge')
		expect(badge.text()).toBe('Available')
		expect(badge.classes()).toContain('bg-success')
	})

	it('shows Taken badge when domain is not available', () => {
		const wrapper = mount(PricingCard, { props: { pricing: makePricing({ available: false }) } })
		const badge = wrapper.find('.badge')
		expect(badge.text()).toBe('Taken')
		expect(badge.classes()).toContain('bg-secondary')
	})

	it('shows Unknown badge when availability is null', () => {
		const wrapper = mount(PricingCard, { props: { pricing: makePricing({ available: null }) } })
		const badge = wrapper.find('.badge')
		expect(badge.text()).toBe('Unknown')
		expect(badge.classes()).toContain('bg-warning')
	})

	it('renders price table with all providers', () => {
		const wrapper = mount(PricingCard, { props: { pricing: makePricing() } })
		const rows = wrapper.findAll('tbody tr')
		expect(rows).toHaveLength(3)
		expect(rows[0].text()).toContain('Porkbun')
		expect(rows[1].text()).toContain('Cloudflare')
		expect(rows[2].text()).toContain('GoDaddy')
	})

	it('sorts prices lowest first (Porkbun < Cloudflare < GoDaddy)', () => {
		const wrapper = mount(PricingCard, { props: { pricing: makePricing() } })
		const rows = wrapper.findAll('tbody tr')
		expect(rows[0].text()).toContain('Porkbun')
		expect(rows[1].text()).toContain('Cloudflare')
		expect(rows[2].text()).toContain('GoDaddy')
	})

	it('shows Best badge on cheapest provider', () => {
		const wrapper = mount(PricingCard, { props: { pricing: makePricing() } })
		const firstRow = wrapper.find('tbody tr')
		expect(firstRow.text()).toContain('Best')
		expect(firstRow.classes()).toContain('best-row')
	})

	it('shows best price banner', () => {
		const wrapper = mount(PricingCard, { props: { pricing: makePricing() } })
		expect(wrapper.find('.best-price-banner').text()).toContain('$9.58')
		expect(wrapper.find('.best-price-banner').text()).toContain('Porkbun')
	})

	it('does not show best price banner when no prices available', () => {
		const wrapper = mount(PricingCard, { props: { pricing: makePricing({ prices: [] }) } })
		expect(wrapper.find('.best-price-banner').exists()).toBe(false)
	})

	it('shows Register links for available domains', () => {
		const wrapper = mount(PricingCard, { props: { pricing: makePricing({ available: true }) } })
		const links = wrapper.findAll('a[target="_blank"]')
		expect(links.length).toBe(3)
		links.forEach(link => {
			expect(link.text()).toContain('Register')
		})
	})

	it('does not show Register links for taken domains', () => {
		const wrapper = mount(PricingCard, { props: { pricing: makePricing({ available: false }) } })
		const links = wrapper.findAll('a[target="_blank"]')
		expect(links).toHaveLength(0)
	})

	it('shows taken domain message when unavailable', () => {
		const wrapper = mount(PricingCard, { props: { pricing: makePricing({ available: false }) } })
		expect(wrapper.text()).toContain('This domain is registered')
	})

	it('handles null prices in table', () => {
		const pricing = makePricing({
			prices: [
				{ provider: 'Porkbun', domain: 'example.com', available: true, register: 9.58, renew: null, transfer: null, currency: 'USD' },
			],
		})
		const wrapper = mount(PricingCard, { props: { pricing } })
		const row = wrapper.find('tbody tr')
		expect(row.text()).toContain('$9.58')
		expect(row.text()).toContain('—')
	})

	it('shows no pricing message when prices array is empty', () => {
		const wrapper = mount(PricingCard, { props: { pricing: makePricing({ prices: [] }) } })
		expect(wrapper.text()).toContain('No pricing data available')
	})

	it('uses buyUrl when available for register link', () => {
		const pricing = makePricing({
			prices: [
				{ provider: 'Porkbun', domain: 'example.com', available: true, register: 9.58, renew: 9.58, transfer: null, currency: 'USD', buyUrl: 'https://porkbun.com/custom' },
			],
		})
		const wrapper = mount(PricingCard, { props: { pricing } })
		const link = wrapper.find('a[target="_blank"]')
		expect(link.attributes('href')).toBe('https://porkbun.com/custom')
	})
})
