/**
 * Cloudflare Registrar pricing adapter.
 *
 * API: GET https://api.cloudflare.com/client/v4/accounts/{account_id}/registrar/domains/{domain}
 * Auth: Bearer token (CLOUDFLARE_API_KEY)
 * Note: Cloudflare offers at-cost pricing — typically the cheapest option.
 *       However, the pricing API requires per-domain queries and an account ID.
 *       We fall back to a static TLD pricing list when API isn't fully configured.
 */
import type { PricingProvider, TldPricing, DomainPricingResult } from './providers.js'
import { getCachedTldPricing, setCachedTldPricing } from './cache.js'

const API_BASE = 'https://api.cloudflare.com/client/v4'

// Cloudflare at-cost TLD pricing (approximate — updated periodically)
// These are well-known at-cost prices Cloudflare charges
const CLOUDFLARE_TLD_PRICING: Record<string, { register: number; renew: number; transfer: number }> = {
	com: { register: 10.11, renew: 10.11, transfer: 8.11 },
	net: { register: 12.01, renew: 12.01, transfer: 10.01 },
	org: { register: 10.11, renew: 10.11, transfer: 8.11 },
	io: { register: 44.98, renew: 44.98, transfer: 44.98 },
	co: { register: 29.98, renew: 29.98, transfer: 29.98 },
	dev: { register: 12.01, renew: 12.01, transfer: 12.01 },
	app: { register: 14.01, renew: 14.01, transfer: 14.01 },
	ai: { register: 74.98, renew: 74.98, transfer: 74.98 },
	xyz: { register: 12.01, renew: 12.01, transfer: 12.01 },
	me: { register: 12.01, renew: 12.01, transfer: 12.01 },
	info: { register: 12.01, renew: 12.01, transfer: 10.01 },
	biz: { register: 12.01, renew: 12.01, transfer: 10.01 },
	tech: { register: 39.98, renew: 39.98, transfer: 39.98 },
	cloud: { register: 12.01, renew: 12.01, transfer: 12.01 },
	pro: { register: 12.01, renew: 12.01, transfer: 12.01 },
}

export class CloudflareProvider implements PricingProvider {
	name = 'Cloudflare'

	private apiToken: string
	private accountId: string

	constructor() {
		this.apiToken = process.env.CLOUDFLARE_API_KEY || ''
		this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || ''
	}

	isConfigured(): boolean {
		return !!this.apiToken
	}

	getBuyUrl(domain: string): string {
		return `https://www.cloudflare.com/products/registrar/?query=${encodeURIComponent(domain)}`
	}

	async getTldPricing(tld: string): Promise<TldPricing | null> {
		// Check cache first
		const cached = getCachedTldPricing(this.name)
		if (cached) {
			const entry = cached.get(tld.replace(/^\./, ''))
			if (entry) return entry
		}

		const cleanTld = tld.replace(/^\./, '')
		const staticPricing = CLOUDFLARE_TLD_PRICING[cleanTld]
		if (!staticPricing) return null

		const pricing: TldPricing = {
			provider: this.name,
			tld: cleanTld,
			register: staticPricing.register,
			renew: staticPricing.renew,
			transfer: staticPricing.transfer,
			currency: 'USD',
		}

		// Cache it
		const map = getCachedTldPricing(this.name) || new Map()
		map.set(cleanTld, pricing)
		setCachedTldPricing(this.name, map)

		return pricing
	}

	async getDomainPricing(domain: string): Promise<DomainPricingResult | null> {
		// Try live API if account ID is configured
		if (this.apiToken && this.accountId) {
			try {
				const res = await fetch(
					`${API_BASE}/accounts/${this.accountId}/registrar/domains/${encodeURIComponent(domain)}`,
					{
						headers: {
							Authorization: `Bearer ${this.apiToken}`,
							'Content-Type': 'application/json',
						},
						signal: AbortSignal.timeout(10_000),
					},
				)

				if (res.ok) {
					const data = await res.json() as any
					if (data.success && data.result) {
						const result = data.result
						return {
							provider: this.name,
							domain,
							available: result.status === 'available',
							register: result.price?.registration ?? null,
							renew: result.price?.renewal ?? null,
							transfer: result.price?.transfer ?? null,
							currency: 'USD',
							buyUrl: this.getBuyUrl(domain),
						}
					}
				}
			} catch {
				// Fall through to static pricing
			}
		}

		// Fall back to static TLD pricing
		const parts = domain.toLowerCase().split('.')
		const tld = parts[parts.length - 1] || 'com'
		const pricing = await this.getTldPricing(tld)
		if (!pricing) return null

		return {
			provider: this.name,
			domain,
			available: null,
			register: pricing.register,
			renew: pricing.renew,
			transfer: pricing.transfer,
			currency: pricing.currency,
			buyUrl: this.getBuyUrl(domain),
		}
	}
}
