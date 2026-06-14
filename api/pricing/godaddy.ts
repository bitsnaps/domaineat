/**
 * GoDaddy pricing adapter.
 *
 * API: GET https://api.godaddy.com/v1/domains/available?domain=example.com
 *      GET https://api.godaddy.com/v1/domains/tlds
 * Auth: Authorization: sso-key {API_KEY}:{SECRET_KEY}
 * GoDaddy already has env vars configured in the project.
 */
import type { PricingProvider, TldPricing, DomainPricingResult } from './providers'
import { getCachedTldPricing, setCachedTldPricing } from './cache'

const API_BASE = 'https://api.godaddy.com'

export class GoDaddyProvider implements PricingProvider {
	name = 'GoDaddy'

	private apiKey: string
	private secretKey: string

	constructor() {
		this.apiKey = process.env.GODADDY_API_KEY || ''
		this.secretKey = process.env.GODADDY_SECRET_KEY || ''
	}

	isConfigured(): boolean {
		return !!(this.apiKey && this.secretKey)
	}

	getBuyUrl(domain: string): string {
		return `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(domain)}`
	}

	async getTldPricing(tld: string): Promise<TldPricing | null> {
		const cleanTld = tld.replace(/^\./, '')

		// Check cache first
		const cached = getCachedTldPricing(this.name)
		if (cached) {
			const entry = cached.get(cleanTld)
			if (entry) return entry
		}

		if (!this.isConfigured()) return null

		try {
			// Fetch all TLDs from GoDaddy
			const allPricing = await this.fetchAllTlds()
			if (!allPricing) return null
			return allPricing.get(cleanTld) || null
		} catch {
			return null
		}
	}

	async getDomainPricing(domain: string): Promise<DomainPricingResult | null> {
		if (!this.isConfigured()) return null

		try {
			// Check availability
			const res = await fetch(
				`${API_BASE}/v1/domains/available?domain=${encodeURIComponent(domain)}`,
				{
					headers: {
						Authorization: `sso-key ${this.apiKey}:${this.secretKey}`,
						Accept: 'application/json',
					},
					signal: AbortSignal.timeout(10_000),
				},
			)

			if (!res.ok) return null

			const data = await res.json() as any
			const available = data.available ?? null

			// Get TLD pricing
			const parts = domain.toLowerCase().split('.')
			const tld = parts[parts.length - 1] || 'com'
			const pricing = await this.getTldPricing(tld)

			return {
				provider: this.name,
				domain,
				available,
				register: pricing?.register ?? null,
				renew: pricing?.renew ?? null,
				transfer: pricing?.transfer ?? null,
				currency: 'USD',
				buyUrl: this.getBuyUrl(domain),
			}
		} catch {
			return null
		}
	}

	private async fetchAllTlds(): Promise<Map<string, TldPricing> | null> {
		if (!this.isConfigured()) return null

		try {
			const res = await fetch(`${API_BASE}/v1/domains/tlds`, {
				headers: {
					Authorization: `sso-key ${this.apiKey}:${this.secretKey}`,
					Accept: 'application/json',
				},
				signal: AbortSignal.timeout(10_000),
			})

			if (!res.ok) return null

			const data = await res.json() as any[]
			const map = new Map<string, TldPricing>()

			for (const entry of data) {
				const tld = entry.tld?.replace('.', '') || ''
				if (!tld) continue

				const register = parseFloat(entry.price?.purchasePrice) || null
				const renew = parseFloat(entry.price?.renewPrice) || null
				const transfer = parseFloat(entry.price?.transferPrice) || null

				if (register !== null) {
					map.set(tld, {
						provider: this.name,
						tld,
						register: register / 1_000_000, // GoDaddy prices are in micros
						renew: renew ? renew / 1_000_000 : null,
						transfer: transfer ? transfer / 1_000_000 : null,
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
