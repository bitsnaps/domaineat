/**
 * scheduler.ts — Background task scheduler logic
 *
 * Pure functions for scheduled tasks, designed to be called from:
 * - Netlify scheduled function (every 10 min)
 * - POST /api/scheduler/run (manual trigger)
 *
 * Tasks:
 * 1. Domain expiration checks — mark expired, create notifications
 * 2. Currency exchange rate updates — cache rates
 * 3. Daily AI call counter resets
 * 4. Watchlist auto-check — RDAP availability checks, status change notifications
 * 5. Wishlist auto-check — RDAP availability checks, status change notifications
 */
import { Domain, User, Notification, Watchlist, Wishlist, Prospect } from './models/index.js'

// ─── Cached Exchange Rates ────────────────────────────────────────────

const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.36, AUD: 1.53, JPY: 149.5, CNY: 7.24, INR: 83.1,
}

let cachedRates: Record<string, number> | null = null
let ratesCachedAt: Date | null = null

/** Get currently cached exchange rates (null if never fetched) */
export function getCachedRates(): Record<string, number> | null {
  return cachedRates
}

// ─── 1. Domain Expiration Checks ──────────────────────────────────────

export interface ExpirationCheckResult {
  checked: number
  expired: number
  notifications: number
}

export async function runExpirationChecks(): Promise<ExpirationCheckResult> {
  const now = new Date()
  const thirtyDays = new Date(now)
  thirtyDays.setDate(thirtyDays.getDate() + 30)
  const sevenDays = new Date(now)
  sevenDays.setDate(sevenDays.getDate() + 7)

  // Find all active domains
  const allDomains = await Domain.findAll({ where: { status: 'active' } })
  let expiredCount = 0
  let notificationCount = 0

  for (const domain of allDomains) {
    const raw = domain.get({ plain: true }) as any
    const expiryDate = raw.expiry_date ? new Date(raw.expiry_date) : null
    if (!expiryDate) continue

    // 1. Mark as expired if past due
    if (expiryDate <= now) {
      await domain.update({ status: 'expired' })
      expiredCount++
    }

    // 2. Create notification if expiring within 30 days
    if (expiryDate <= thirtyDays && expiryDate > now) {
      // Check for existing undismissed notification for this domain
      const existing = await Notification.findAll({
        where: { domain_id: raw.id, type: 'expiration_warning', dismissed: false },
      })
      if (existing.length === 0) {
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        const level = expiryDate <= sevenDays ? 'urgent' : 'warning'
        await Notification.create({
          user_id: raw.user_id,
          domain_id: raw.id,
          type: 'expiration_warning',
          level,
          message: `${raw.domain_name} expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`,
          dismissed: false,
        })
        notificationCount++
      }
    }
  }

  return { checked: allDomains.length, expired: expiredCount, notifications: notificationCount }
}

// ─── 2. Currency Exchange Rate Update ──────────────────────────────────

export interface CurrencyUpdateResult {
  rates: Record<string, number>
  source: 'live' | 'fallback'
}

export async function runCurrencyUpdate(): Promise<CurrencyUpdateResult> {
  try {
    const res = await fetch('https://api.exchangerate.host/latest?base=USD', {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) throw new Error('Upstream error')
    const data = await res.json() as { rates?: Record<string, number> }
    const rates = data.rates || FALLBACK_RATES
    cachedRates = rates
    ratesCachedAt = new Date()
    return { rates, source: 'live' }
  } catch {
    cachedRates = FALLBACK_RATES
    ratesCachedAt = new Date()
    return { rates: FALLBACK_RATES, source: 'fallback' }
  }
}

// ─── 3. Daily Counter Resets ──────────────────────────────────────────

export interface DailyAiResetResult {
	reset: number
}

export interface DailyRdapResetResult {
	reset: number
}

export async function runDailyAiReset(): Promise<DailyAiResetResult> {
	const [count] = await User.update(
		{ daily_ai_calls: 0 },
		{ where: {} }
	)
	return { reset: count }
}

export async function runDailyRdapReset(): Promise<DailyRdapResetResult> {
	const [count] = await User.update(
		{ daily_rdap_calls: 0 },
		{ where: {} }
	)
	return { reset: count }
}

// ─── 4. Watchlist Auto-Check ──────────────────────────────────────────

export interface WatchlistCheckResult {
	checked: number
	notifications: number
}

export async function runWatchlistCheck(): Promise<WatchlistCheckResult> {
	const allItems = await Watchlist.findAll()
	let notificationCount = 0

	const { rdapLookup } = await import('./domain-analysis.js')
	const results = await Promise.allSettled(
		allItems.map(async (item) => {
			try {
				const rdap = await rdapLookup(item.domain_name)
				const nowAvailable = rdap === null
				const prevAvailable = item.available
				await item.update({ available: nowAvailable, last_checked_at: new Date() })
				if (prevAvailable !== null && prevAvailable !== nowAvailable) {
					await Notification.create({
						user_id: item.user_id,
						type: 'status_change',
						level: nowAvailable ? 'urgent' : 'info',
						message: `${item.domain_name} is now ${nowAvailable ? 'available' : 'taken'}`,
					})
					notificationCount++
				}
			} catch {
				await item.update({ last_checked_at: new Date() })
			}
		})
	)

	return { checked: allItems.length, notifications: notificationCount }
}

// ─── 5. Wishlist Auto-Check ───────────────────────────────────────────

export interface WishlistCheckResult {
	checked: number
	notifications: number
}

export async function runWishlistCheck(): Promise<WishlistCheckResult> {
	const allItems = await Wishlist.findAll()
	let notificationCount = 0

	const { rdapLookup } = await import('./domain-analysis.js')
	const results = await Promise.allSettled(
		allItems.map(async (item) => {
			try {
				const rdap = await rdapLookup(item.domain_name)
				const nowAvailable = rdap === null
				const prevAvailable = item.available
				await item.update({ available: nowAvailable, last_checked_at: new Date() })
				if (prevAvailable !== null && prevAvailable !== nowAvailable) {
					await Notification.create({
						user_id: item.user_id,
						type: 'status_change',
						level: nowAvailable ? 'urgent' : 'info',
						message: `${item.domain_name} is now ${nowAvailable ? 'available' : 'taken'}`,
					})
					notificationCount++
				}
			} catch {
				await item.update({ last_checked_at: new Date() })
			}
		})
	)

	return { checked: allItems.length, notifications: notificationCount }
}

// ─── 6. AI Agent Auto-Prospect ────────────────────────────────────────

export interface AiAgentResult {
	processed: number
	prospectsFound: number
	notifications: number
}

/**
 * Process wishlist items with ai_agent = true.
 * For each such item, find or create a portfolio domain, then generate
 * prospects from alternative TLD extensions (similar to the prospect-all endpoint).
 */
export async function runAiAgent(): Promise<AiAgentResult> {
	const ALT_TLDS = ['com', 'net', 'org', 'io', 'co', 'dev', 'app', 'ai', 'xyz', 'me']
	let processed = 0
	let prospectsFound = 0
	let notificationCount = 0

	// Find all wishlist items with ai_agent enabled
	const aiItems = await Wishlist.findAll({ where: { ai_agent: true } })

	for (const item of aiItems) {
		const raw = item.get({ plain: true }) as any
		const domainName = raw.domain_name as string
		const sld = domainName.replace(/\.[^.]+$/, '')
		const currentTld = (domainName.split('.').pop() || 'com')

		// Find or create a portfolio domain to link prospects to
		let domain = await Domain.findOne({ where: { domain_name: domainName, user_id: raw.user_id } })
		if (!domain) {
			domain = await Domain.create({
				user_id: raw.user_id,
				domain_name: domainName,
				registrar: 'Auto-created by AI Agent',
				acquisition_date: new Date().toISOString().split('T')[0],
				expiry_date: '',
				acquisition_cost: 0,
				renewal_cost: 0,
				nameservers: null,
				status: 'parked',
			} as any)
		}

		const domainId = (domain.get({ plain: true }) as any).id

		for (const tld of ALT_TLDS) {
			if (tld === currentTld) continue
			const prospectDomain = `${sld}.${tld}`

			// Skip if prospect already exists
			const existing = await Prospect.findOne({
				where: { domain_id: domainId, prospect_domain: prospectDomain },
			})
			if (existing) continue

			await Prospect.create({
				domain_id: domainId,
				prospect_domain: prospectDomain,
				company_name: null,
				contact_email: null,
				outreach_status: 'uncontacted',
				last_contact_date: null,
			})
			prospectsFound++
		}

		// Create notification for the user
		if (prospectsFound > 0) {
			await Notification.create({
				user_id: raw.user_id,
				domain_id: domainId,
				type: 'agent_action',
				level: 'info',
				message: `AI Agent found ${prospectsFound} prospect${prospectsFound !== 1 ? 's' : ''} for ${domainName}`,
			})
			notificationCount++
		}

		processed++
	}

	return { processed, prospectsFound, notifications: notificationCount }
}

// ─── Run All Tasks ─────────────────────────────────────────────────────

export interface SchedulerRunResult {
	expirationChecks: ExpirationCheckResult
	currencyUpdate: CurrencyUpdateResult
	dailyAiReset: DailyAiResetResult
	dailyRdapReset: DailyRdapResetResult
	watchlistCheck: WatchlistCheckResult
	wishlistCheck: WishlistCheckResult
	aiAgent: AiAgentResult
	runAt: string
}

export async function runAllTasks(tasks?: string[]): Promise<Partial<SchedulerRunResult> & { runAt: string }> {
	const runAt = new Date().toISOString()
	const result: Partial<SchedulerRunResult> & { runAt: string } = { runAt }

	const shouldRun = (task: string) => !tasks || tasks.length === 0 || tasks.includes(task)

	if (shouldRun('expiration')) {
		result.expirationChecks = await runExpirationChecks()
	}
	if (shouldRun('currency')) {
		result.currencyUpdate = await runCurrencyUpdate()
	}
	if (shouldRun('ai_reset')) {
		result.dailyAiReset = await runDailyAiReset()
	}
	if (shouldRun('rdap_reset')) {
		result.dailyRdapReset = await runDailyRdapReset()
	}
	if (shouldRun('watchlist_check')) {
		result.watchlistCheck = await runWatchlistCheck()
	}
	if (shouldRun('wishlist_check')) {
		result.wishlistCheck = await runWishlistCheck()
	}
	if (shouldRun('ai_agent')) {
		result.aiAgent = await runAiAgent()
	}

	return result
}
