/**
 * Pricing provider interface and types.
 *
 * Each registrar adapter implements PricingProvider.
 * The aggregator queries all configured providers in parallel
 * and returns results sorted by registration price (lowest first).
 */

export interface TldPricing {
	provider: string
	tld: string
	register: number | null
	renew: number | null
	transfer: number | null
	currency: string
}

export interface DomainPricingResult {
	provider: string
	domain: string
	available: boolean | null
	register: number | null
	renew: number | null
	transfer: number | null
	currency: string
	buyUrl?: string
}

export interface PricingProvider {
	/** Provider display name */
	name: string
	/** Whether the provider is configured (env vars present) */
	isConfigured(): boolean
	/** Get registration pricing for a specific TLD */
	getTldPricing(tld: string): Promise<TldPricing | null>
	/** Get pricing for a full domain (optional — some providers support this) */
	getDomainPricing(domain: string): Promise<DomainPricingResult | null>
	/** Get a registration URL for a domain */
	getBuyUrl(domain: string): string
}
