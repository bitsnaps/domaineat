/**
 * smart-ctas.ts — Contextual primary actions per domain state.
 *
 * Returns the single most important action a user should take
 * based on the domain's current state, appraisal, and prospect pipeline.
 *
 * Priority order (highest first):
 *   1. Register Now  — available wishlist domain
 *   2. Renew         — expiring within 30 days or already expired
 *   3. List for Sale — status = sold
 *   4. Start Outreach — has uncontacted prospects
 *   5. View Prospects — has prospects but all contacted
 *   6. Find Prospects — high-value domain with no prospects
 *   7. Manage        — default fallback
 *
 * Pure function — no API calls, no side effects.
 */
import type { Domain, DomainAppraisal } from '@/types'

export interface SmartCta {
	key: string
	label: string
	icon: string
	variant: string // Bootstrap variant
	description: string
}

export interface SmartCtaInput {
	domain: Domain
	appraisal: DomainAppraisal
	/** Is the domain available for registration? (lookup context) */
	available?: boolean | null
	/** Is this a wishlist item? */
	isWishlist?: boolean
	/** Number of prospects */
	prospectCount?: number
	/** Are there any uncontacted prospects? */
	uncontactedProspects?: boolean
	/** Fixed "now" for deterministic tests */
	now?: Date
}

/**
 * Determine the smart primary CTA for a domain.
 * Returns exactly one CTA — the highest-priority applicable action.
 */
export function getSmartCta(input: SmartCtaInput): SmartCta {
	const { domain, appraisal, available, isWishlist, prospectCount, uncontactedProspects, now } = input
	const currentNow = now ?? new Date()

	// ─── 1. Register Now (available wishlist) ────────────────────
	if (available && isWishlist) {
		return {
			key: 'register_now',
			label: 'Register Now',
			icon: 'bi-cart-check',
			variant: 'success',
			description: 'This domain is available — register it before someone else does.',
		}
	}

	// ─── 2. Renew (expiring ≤30 days or expired) ────────────────
	const daysLeft = Math.ceil(
		(new Date(domain.expiry_date).getTime() - currentNow.getTime()) / (1000 * 60 * 60 * 24)
	)
	if (daysLeft <= 30) {
		return {
			key: 'renew',
			label: 'Renew',
			icon: 'bi-arrow-repeat',
			variant: 'warning',
			description: daysLeft <= 0
				? `This domain expired ${Math.abs(daysLeft)} days ago — renew immediately.`
				: `This domain expires in ${daysLeft} days — renew now.`,
		}
	}

	// ─── 3. List for Sale (sold status) ──────────────────────────
	if (domain.status === 'sold') {
		return {
			key: 'list_for_sale',
			label: 'List for Sale',
			icon: 'bi-tag',
			variant: 'primary',
			description: 'This domain is marked as sold — list it on a marketplace.',
		}
	}

	// ─── 4. Start Outreach (has uncontacted prospects) ───────────
	if ((prospectCount ?? 0) > 0 && uncontactedProspects) {
		return {
			key: 'start_outreach',
			label: 'Start Outreach',
			icon: 'bi-send',
			variant: 'primary',
			description: `You have ${prospectCount} prospect(s) waiting for outreach.`,
		}
	}

	// ─── 5. View Prospects (has prospects, all contacted) ────────
	if ((prospectCount ?? 0) > 0 && !uncontactedProspects) {
		return {
			key: 'view_prospects',
			label: 'View Prospects',
			icon: 'bi-people',
			variant: 'info',
			description: `All ${prospectCount} prospect(s) have been contacted — check responses.`,
		}
	}

	// ─── 6. Find Prospects (high-value, no prospects) ────────────
	const isHighValue = appraisal.grade === 'A' || appraisal.grade === 'A+' || appraisal.range.low >= 5000
	if (isHighValue && (prospectCount ?? 0) === 0) {
		return {
			key: 'find_prospects',
			label: 'Find Prospects',
			icon: 'bi-search',
			variant: 'primary',
			description: 'This high-value domain has no prospects yet — find potential buyers.',
		}
	}

	// ─── 7. Manage (fallback) ────────────────────────────────────
	return {
		key: 'manage',
		label: 'Manage',
		icon: 'bi-gear',
		variant: 'secondary',
		description: 'View and manage this domain\'s details.',
	}
}
