/**
 * Pricing aggregator — queries all configured providers in parallel
 * and returns results sorted by registration price (lowest first).
 */
import type { PricingProvider, DomainPricingResult } from './providers'
import { PorkbunProvider } from './porkbun'
import { CloudflareProvider } from './cloudflare'
import { GoDaddyProvider } from './godaddy'

export interface PricingResponse {
	domain: string
	available: boolean | null
	prices: DomainPricingResult[]
	providersConfigured: string[]
}

/** All available provider instances */
function getProviders(): PricingProvider[] {
	return [
		new PorkbunProvider(),
		new CloudflareProvider(),
		new GoDaddyProvider(),
	]
}

/**
 * Get pricing for a domain from all configured providers.
 * Results are sorted by registration price (lowest first).
 *
 * @param domain - Full domain name (e.g. "example.com")
 * @returns PricingResponse with sorted prices array
 */
export async function getDomainPricing(domain: string): Promise<PricingResponse> {
	const providers = getProviders()
	const configuredProviders = providers.filter(p => p.isConfigured())

	// Query all providers in parallel
	const results = await Promise.allSettled(
		configuredProviders.map(provider =>
			provider.getDomainPricing(domain).catch(() => null)
		)
	)

	// Filter successful results
	const prices = results
		.filter((r): r is PromiseFulfilledResult<DomainPricingResult | null> => r.status === 'fulfilled')
		.map(r => r.value)
		.filter((p): p is DomainPricingResult => p !== null)

	// Sort by registration price (lowest first), null prices at the end
	prices.sort((a, b) => {
		if (a.register === null && b.register === null) return 0
		if (a.register === null) return 1
		if (b.register === null) return -1
		return a.register - b.register
	})

	// Determine availability from GoDaddy (most reliable for this)
	const godaddyResult = prices.find(p => p.provider === 'GoDaddy')
	const available = godaddyResult?.available ?? prices.length > 0 ? null : null

	return {
		domain,
		available,
		prices,
		providersConfigured: configuredProviders.map(p => p.name),
	}
}

/**
 * Get pricing for a specific TLD from all configured providers.
 */
export async function getTldPricing(tld: string) {
	const providers = getProviders()
	const configuredProviders = providers.filter(p => p.isConfigured())

	const results = await Promise.allSettled(
		configuredProviders.map(provider =>
			provider.getTldPricing(tld).catch(() => null)
		)
	)

	return results
		.filter((r) => r.status === 'fulfilled')
		.map((r) => (r as PromiseFulfilledResult<any>).value)
		.filter(Boolean)
}

/**
 * Get list of configured providers and their status.
 */
export function getProviderStatus() {
	const providers = getProviders()
	return providers.map(p => ({
		name: p.name,
		configured: p.isConfigured(),
	}))
}
