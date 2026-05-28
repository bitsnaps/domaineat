/**
 * Shared formatting utilities
 */

/** Format an ISO date string as "Jun 16, 2026" */
export function formatDate(d: string | null | undefined): string {
	if (!d) return '—'
	return new Date(d).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	})
}

/** Format an ISO date string as a short date "Jun 16" (no year) */
export function formatShortDate(d: string | null | undefined): string {
	if (!d) return '—'
	return new Date(d).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
	})
}
