/**
 * rate-limit.ts — RDAP rate-limit enforcement middleware for Hono.
 *
 * Two modes:
 *   1. Authenticated user: check User.daily_rdap_calls against plan limits from DB
 *   2. Anonymous (public): IP-based tracking via X-Forwarded-For / c.req.header, 
 *      with ANON_RDAP_DAILY limit (higher than free-tier).
 *
 * Usage: app.use('/api/validate', rdapRateLimit())
 *        app.use('/api/search',  rdapRateLimit())
 */
import type { Context, Next } from 'hono'
import { getPlanLimits } from './plan-cache.js'

/** Anonymous daily limit — generous for public use, encourages sign-up for more */
export const ANON_RDAP_DAILY = 30

/** In-memory IP→count map for anonymous rate limiting (resets on server restart) */
const anonCounts = new Map<string, { count: number; resetAt: number }>()

/** Milliseconds in a day */
const DAY_MS = 24 * 60 * 60 * 1000

/** Get or create an anon counter for an IP */
function getAnonCount(ip: string): { count: number; resetAt: number } {
	const now = Date.now()
	let entry = anonCounts.get(ip)
	if (!entry || now >= entry.resetAt) {
		entry = { count: 0, resetAt: now + DAY_MS }
		anonCounts.set(ip, entry)
	}
	return entry
}

/** Extract client IP from request (X-Forwarded-For or fallback) */
function extractIp(c: Context): string {
	const xff = c.req.header('X-Forwarded-For')
	if (xff) {
		// Take the first (leftmost) IP — most trusted proxy
		return xff.split(',')[0].trim()
	}
	// Fallback: Hono doesn't expose remoteAddress in all runtimes
	return 'unknown'
}

/**
 * RDAP rate-limit middleware.
 * Must run AFTER auth middleware (so c.get('userId') / c.get('tier') are available).
 * If no auth → anonymous mode (IP-based).
 */
export function rdapRateLimit() {
	return async (c: Context, next: Next) => {
		const userId = c.get('userId') as number | undefined
		const tier = c.get('tier') as string | undefined

		if (userId && tier) {
			// ─── Authenticated path ───────────────────────────────
			const { User } = await import('./models/index.js')
			const user = await User.findByPk(userId)
			if (!user) {
				return c.json({ error: 'User not found' }, 401)
			}

			const planLimits = await getPlanLimits(tier)
			const limit = planLimits.rdapDaily
			const current = (user as any).daily_rdap_calls ?? 0

			if (limit !== Infinity && current >= limit) {
				return c.json({
					error: 'RDAP daily limit reached',
					limit,
					used: current,
					tier,
				}, 429)
			}

			// Increment counter
			await (user as any).increment('daily_rdap_calls')
		} else {
			// ─── Anonymous path (IP-based) ────────────────────────
			const ip = extractIp(c)
			const entry = getAnonCount(ip)

			if (entry.count >= ANON_RDAP_DAILY) {
				return c.json({
					error: 'RDAP daily limit reached',
					limit: ANON_RDAP_DAILY,
					used: entry.count,
					tier: 'anonymous',
				}, 429)
			}

			entry.count++
		}

		return next()
	}
}

/**
 * Reset all anonymous counters (for testing).
 * Also used by a daily cron to reset IP counters.
 */
export function resetAnonCounters() {
	anonCounts.clear()
}
