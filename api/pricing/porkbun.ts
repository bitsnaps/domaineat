/**
 * Porkbun pricing adapter.
 *
 * API: POST https://api.porkbun.com/api/json/v3/pricing/get
 * Auth: API key + secret in request body
 * Returns: Full TLD pricing catalog (cached 24h)
 */
import type { PricingProvider, TldPricing, DomainPricingResult } from './providers'
import { getCachedTldPricing, setCachedTldPricing } from './cache'

const API_URL = 'https://api.porkbun.com/api/json/v3/pricing/get'

export class PorkbunProvider implements PricingProvider {
	name = 'Porkbun'

	private apiKey: string
	private secretKey: string

	constructor() {
		this.apiKey = process.env.PORKBUN_API_KEY || ''
		this.secretKey = process.env.PORKBUN_SECRET_KEY || ''
	}

	isConfigured(): boolean {
		return !!(this.apiKey && this.secretKey)
	}

	getBuyUrl(domain: string): string {
		return `https://porkbun.com/checkout/search?q=${encodeURIComponent(domain)}`
	}

	async getTldPricing(tld: string): Promise<TldPricing | null> {
		try {
			const allPricing = await this.fetchAllPricing()
			if (!allPricing) return null

			const cleanTld = tld.replace(/^\./, '')
			const pricing = allPricing.get(cleanTld)
			if (!pricing) return null

			return pricing
		} catch {
			return null
		}
	}

	async getDomainPricing(domain: string): Promise<DomainPricingResult | null> {
		const parts = domain.toLowerCase().split('.')
		const tld = parts[parts.length - 1] || 'com'

		const pricing = await this.getTldPricing(tld)
		if (!pricing) return null

		return {
			provider: this.name,
			domain,
			available: null, // Porkbun pricing API doesn't tell us availability
			register: pricing.register,
			renew: pricing.renew,
			transfer: pricing.transfer,
			currency: pricing.currency,
			buyUrl: this.getBuyUrl(domain),
		}
	}

	private async fetchAllPricing(): Promise<Map<string, TldPricing> | null> {
		// Check cache first
		const cached = getCachedTldPricing(this.name)
		if (cached) return cached

		if (!this.isConfigured()) return null

		try {
			const res = await fetch(API_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					apikey: this.apiKey,
					secretapikey: this.secretKey,
				}),
				signal: AbortSignal.timeout(10_000),
			})

			if (!res.ok) return null

			const data = await res.json() as any
			if (data.status !== 'SUCCESS') return null

			const pricing = data.pricing as Record<string, any>
			const map = new Map<string, TldPricing>()

			for (const [tld, entry] of Object.entries(pricing)) {
				if (tld === 'pricing') continue // Skip nested key if present
				const register = parseFloat(entry?.registration ?? '0') || null
				const renew = parseFloat(entry?.renewal ?? '0') || null
				const transfer = parseFloat(entry?.transfer ?? '0') || null

				if (register !== null) {
					map.set(tld, {
						provider: this.name,
						tld,
						register,
						renew,
						transfer,
						currency: 'USD',
					})
				}
			}

			setCachedTldPricing(this.name, map)
			return map
		} catch {
			return null
		}
	}
}
