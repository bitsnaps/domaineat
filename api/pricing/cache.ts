/**
 * In-memory cache for TLD pricing catalogs.
 *
 * Registrar pricing APIs return full TLD catalogs in a single call.
 * We cache these for 24 hours to minimize API requests.
 */

import type { TldPricing } from './providers'

interface CacheEntry<T> {
	data: T
	timestamp: number
}

const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

const tldCache = new Map<string, CacheEntry<Map<string, TldPricing>>>()

/**
 * Get cached TLD pricing for a provider.
 * Returns the cached map if valid, or null if expired/missing.
 */
export function getCachedTldPricing(provider: string): Map<string, TldPricing> | null {
	const entry = tldCache.get(provider)
	if (!entry) return null
	if (Date.now() - entry.timestamp > TTL_MS) {
		tldCache.delete(provider)
		return null
	}
	return entry.data
}

/**
 * Store TLD pricing for a provider in cache.
 */
export function setCachedTldPricing(provider: string, data: Map<string, TldPricing>): void {
	tldCache.set(provider, { data, timestamp: Date.now() })
}

/**
 * Get a single TLD price from cache (or null if not cached).
 */
export function getCachedTldPrice(provider: string, tld: string): TldPricing | null {
	const map = getCachedTldPricing(provider)
	if (!map) return null
	return map.get(tld) ?? null
}

/**
 * Set a single TLD price in cache.
 * If no cache entry exists for the provider, creates one.
 */
export function setCachedTldPrice(provider: string, tld: string, pricing: TldPricing): void {
	let map = getCachedTldPricing(provider)
	if (!map) {
		map = new Map()
	}
	map.set(tld, pricing)
	setCachedTldPricing(provider, map)
}

/**
 * Clear all cached pricing data.
 */
export function clearPricingCache(): void {
	tldCache.clear()
}
