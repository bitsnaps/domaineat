/**
 * plan-cache.ts — In-memory TTL cache for DB-backed tier limits.
 *
 * Loads plan data from the `plans` table, converts to limits shape,
 * and caches for 5 minutes. Falls back to hardcoded TIER_LIMITS
 * if DB is unavailable.
 */
import { Plan } from './models/index.js'
import { TIER_LIMITS } from './auth.js'
import type { PlanLimits } from './models/Plan.js'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

let cache: Map<string, PlanLimits> = new Map()
let cacheLoadedAt = 0

/** Convert a raw DB row to PlanLimits (handles -1 → Infinity) */
function rowToLimits(row: any): PlanLimits {
	const unlimited = (v: number) => (v < 0 ? Infinity : v)
	return {
		domains: unlimited(row.domains),
		rdapDaily: unlimited(row.rdap_daily),
		aiDaily: unlimited(row.ai_daily),
		watchlist: unlimited(row.watchlist),
		wishlist: unlimited(row.wishlist),
	}
}

/** Fallback limits from hardcoded TIER_LIMITS */
function fallbackLimits(tier: string): PlanLimits {
	const key = tier as keyof typeof TIER_LIMITS
	const raw = TIER_LIMITS[key] || TIER_LIMITS.free
	return {
		domains: raw.domains,
		rdapDaily: raw.rdapDaily,
		aiDaily: raw.aiDaily,
		watchlist: raw.watchlist,
		wishlist: raw.wishlist,
	}
}

/** Check if cache is still valid */
function isCacheValid(): boolean {
	return cache.size > 0 && Date.now() - cacheLoadedAt < CACHE_TTL_MS
}

/** Load all plans from DB into cache */
async function loadCache(): Promise<void> {
	try {
		const plans = await Plan.findAll()
		const newCache = new Map<string, PlanLimits>()
		for (const plan of plans) {
			newCache.set(plan.tier, planToLimits(plan))
		}
		cache = newCache
		cacheLoadedAt = Date.now()
	} catch {
		// DB unavailable — keep existing cache or leave empty for fallback
	}
}

function planToLimits(plan: any): PlanLimits {
	const unlimited = (v: number) => (v < 0 ? Infinity : v)
	return {
		domains: unlimited(plan.domains),
		rdapDaily: unlimited(plan.rdap_daily),
		aiDaily: unlimited(plan.ai_daily),
		watchlist: unlimited(plan.watchlist),
		wishlist: unlimited(plan.wishlist),
	}
}

/**
 * Get tier limits, using cached DB data with fallback to hardcoded values.
 * Results are cached for 5 minutes.
 */
export async function getPlanLimits(tier: string): Promise<PlanLimits> {
	if (!isCacheValid()) {
		await loadCache()
	}

	const cached = cache.get(tier)
	if (cached) return cached

	// Unknown tier — try loading again, then fall back to free
	if (!isCacheValid()) {
		await loadCache()
		const retry = cache.get(tier)
		if (retry) return retry
	}

	// Final fallback: hardcoded TIER_LIMITS for the tier, or free
	return fallbackLimits(tier)
}

/**
 * Invalidate the plan cache, forcing a reload from DB on next access.
 * Call this after admin updates a plan.
 */
export function invalidatePlanCache(): void {
	cache = new Map()
	cacheLoadedAt = 0
}
