/**
 * decision-signals.ts — Compute decision signal badges for a domain.
 *
 * Signals are visual indicators shown on domain cards and detail views
 * to help users quickly identify actionable states:
 *   - Hot Buy: available + good appraisal (not F grade + low >= $500)
 *   - Expiring Watch: ≤30 days to expiry (or already expired)
 *   - Undervalued: appraisal low > 2× acquisition cost
 *   - Prospect Ready: domain has at least 1 prospect
 *   - Sold: domain status is "sold"
 *
 * Pure functions — no API calls, no side effects.
 */
import type { Domain, DomainAppraisal } from '@/types'

export interface DecisionSignal {
	key: string
	label: string
	icon: string
	variant: string // Bootstrap variant: danger, warning, info, success, primary
}

export interface DecisionSignalsInput {
	domain: Domain
	appraisal: DomainAppraisal
	/** Lookup context: is the domain available for registration? */
	available?: boolean | null
	/** Number of prospects for this domain */
	prospectCount?: number
	/** Fixed "now" timestamp for deterministic tests */
	now?: Date
}

/**
 * Compute all decision signals for a given domain context.
 * Returns an array of active signals (empty if none apply).
 */
export function getDecisionSignals(input: DecisionSignalsInput): DecisionSignal[] {
	const { domain, appraisal, available, prospectCount, now } = input
	const signals: DecisionSignal[] = []

	// ─── Hot Buy ──────────────────────────────────────────────────
	// Available + not F grade + low range >= $500
	if (available && appraisal.grade !== 'F' && appraisal.range.low >= 500) {
		signals.push({
			key: 'hot_buy',
			label: 'Hot Buy',
			icon: 'bi-fire',
			variant: 'danger',
		})
	}

	// ─── Expiring Watch ───────────────────────────────────────────
	// ≤30 days to expiry (or already expired)
	const currentNow = now ?? new Date()
	const daysLeft = Math.ceil(
		(new Date(domain.expiry_date).getTime() - currentNow.getTime()) / (1000 * 60 * 60 * 24)
	)
	if (daysLeft <= 30) {
		signals.push({
			key: 'expiring_watch',
			label: 'Expiring Watch',
			icon: 'bi-clock-history',
			variant: 'warning',
		})
	}

	// ─── Undervalued ──────────────────────────────────────────────
	// Appraisal low > 2× acquisition cost
	if (domain.acquisition_cost > 0 && appraisal.range.low > 2 * domain.acquisition_cost) {
		signals.push({
			key: 'undervalued',
			label: 'Undervalued',
			icon: 'bi-graph-up-arrow',
			variant: 'success',
		})
	}

	// ─── Prospect Ready ───────────────────────────────────────────
	// Has at least 1 prospect
	if ((prospectCount ?? 0) > 0) {
		signals.push({
			key: 'prospect_ready',
			label: 'Prospect Ready',
			icon: 'bi-people-fill',
			variant: 'info',
		})
	}

	// ─── Sold ─────────────────────────────────────────────────────
	if (domain.status === 'sold') {
		signals.push({
			key: 'sold',
			label: 'Sold',
			icon: 'bi-tag-fill',
			variant: 'primary',
		})
	}

	return signals
}
