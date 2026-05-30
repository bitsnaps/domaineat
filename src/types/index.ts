/**
 * TypeScript interfaces for Domaineat
 * Aligned with the Sequelize models in api/models/
 */

// ─── User & AI ────────────────────────────────────────────────────────────

export type UserTier = 'free' | 'premium' | 'enterprise'

export type LlmProvider = 'openai' | 'anthropic' | 'groq' | 'openrouter'

export interface User {
	id: number
	email: string
	/** Omitted in API responses — never sent to the client */
	password_hash?: never
	tier: UserTier
	llm_provider: LlmProvider | null
	llm_model: string | null
	llm_api_key_encrypted: string | null // masked — only last 4 chars
	daily_ai_calls: number
	preferred_registrar: string | null
	created_at: string
}

export interface AiStatus {
	configured: boolean
	provider: LlmProvider | null
	model: string | null
	daily_calls: number
	daily_limit: number
	tier: UserTier
}

export interface AiDraftRequest {
	user_id: number
	domain_name: string
	prospect_domain: string
	company_name?: string | null
	contact_email?: string | null
}

export interface AiDraftResponse {
	draft: string
	provider: string
	model: string
}

// ─── Domain ────────────────────────────────────────────────────────────────

export type DomainStatus = 'active' | 'expired' | 'sold' | 'pending_delete' | 'parked'

export interface DomainTag {
	id: number
	domain_id: number
	user_id: number
	tag: string
	created_at: string
}

export interface Domain {
	id: number
	user_id: number
	domain_name: string
	registrar: string
	acquisition_date: string
	expiry_date: string
	acquisition_cost: number
	renewal_cost: number
	nameservers: string | null
	status: DomainStatus
	appraisal_grade: AppraisalGrade | null
	tags?: DomainTag[]
	created_at: string
	updated_at: string
}

export type AppraisalGrade = 'A+' | 'A' | 'B' | 'C' | 'D'

export type SmartFolderKey = AppraisalGrade | 'all' | 'ungraded' | 'expiring' | 'undervalued' | 'outreach' | 'recent' | 'agent'

/** Payload for creating a new domain */
export interface DomainCreate {
	user_id: number
	domain_name: string
	registrar: string
	acquisition_date: string
	expiry_date: string
	acquisition_cost?: number
	renewal_cost?: number
	nameservers?: string | null
	status?: DomainStatus
	appraisal_grade?: AppraisalGrade | null
}

/** Payload for updating a domain — all fields optional */
export type DomainUpdate = Partial<DomainCreate>

// ─── Ledger ────────────────────────────────────────────────────────────────

export type TransactionType = 'purchase' | 'renewal' | 'transfer' | 'sale' | 'listing_fee' | 'other'

export interface LedgerEntry {
	id: number
	domain_id: number
	transaction_type: TransactionType
	amount: number
	transaction_date: string
	notes: string | null
}

/** Payload for creating a ledger entry */
export interface LedgerEntryCreate {
	domain_id: number
	transaction_type: TransactionType
	amount: number
	transaction_date: string
	notes?: string | null
}

// ─── Prospect ──────────────────────────────────────────────────────────────

export type OutreachStatus = 'uncontacted' | 'contacted' | 'responded' | 'negotiating' | 'closed' | 'lost'

export interface Prospect {
	id: number
	domain_id: number
	prospect_domain: string
	company_name: string | null
	contact_email: string | null
	outreach_status: OutreachStatus
	last_contact_date: string | null
	notes: string | null
}

/** Payload for creating a prospect */
export interface ProspectCreate {
	domain_id: number
	prospect_domain: string
	company_name?: string | null
	contact_email?: string | null
	outreach_status?: OutreachStatus
	last_contact_date?: string | null
}

/** Payload for updating a prospect */
export interface ProspectUpdate {
	outreach_status?: OutreachStatus
	company_name?: string | null
	contact_email?: string | null
	last_contact_date?: string | null
	notes?: string | null
}

// ─── DNS Check Result ─────────────────────────────────────────────────────

export interface DnsResult {
	domain: string
	resolved: boolean
	ip: string | null
	nameservers: string[]
	ssl_expiry: string | null
	checked_at: string
}

// ─── API helpers ───────────────────────────────────────────────────────────

export interface ApiError {
	error: string
}

export interface HealthCheck {
	status: 'ok' | 'error'
	database: 'connected' | 'disconnected'
	error?: string
}

// ─── Domain Analysis ────────────────────────────────────────────────────

export interface ParsedDomain {
	sld: string
	tld: string
	keywords: string[]
	altExtensions: string[]
}

export interface ExtensionCheckResult {
	domain: string
	tld: string
	available: boolean | null
	registrar: string | null
	expiryDate: string | null
}

export interface RdapResult {
	domain: string
	registrar: string | null
	creationDate: string | null
	expiryDate: string | null
	nameservers: string[]
	status: string[]
}

export interface DomainAnalysis {
	parsed: ParsedDomain
	extensions: ExtensionCheckResult[]
	rdap: RdapResult | null
}

/** Lead score classification */
export type LeadScore = 'hot' | 'warm' | 'cold'

// ─── RDAP Lookup API Responses ──────────────────────────────────────────

export interface ValidateResponse {
	status: 'ok'
	domain: string
	available: boolean
	whois: {
		registrar: string | null
		creationDate: string | null
		expiryDate: string | null
		nameservers: string[]
		status: string[]
	} | null
	dns: {
		resolved: boolean
		ip: string | null
		nameservers: string[]
		ssl_expiry: string | null
	} | null
}

export interface SearchResponse {
	status: 'ok'
	sld: string
	results: ExtensionCheckResult[]
}

export interface RateLimitInfo {
	limit: number
	used: number
	tier: string
}

// ─── Domain Appraisal ─────────────────────────────────────────────────

export type AppraisalGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'

export interface AppraisalSignal {
	score: number		// 0–10
	label: string		// e.g. "3 chars (excellent)", "Contains hyphen (penalty)"
	passed: boolean		// green check vs red X in UI
}

export interface DomainAppraisal {
	grade: AppraisalGrade
	range: { low: number; high: number }
	signals: {
		length: AppraisalSignal
		tld: AppraisalSignal
		dictionary: AppraisalSignal
		brandable: AppraisalSignal
		clean: AppraisalSignal
	}
}

export interface EnhancedAppraisal extends DomainAppraisal {
	enhanced: true
	comparableSales: { domain: string; price: number; date: string }[]
	searchVolume: number | null
	externalAppraisal: { source: string; value: number } | null
}

// ─── Watchlist ─────────────────────────────────────────────────────────────

export interface WatchlistItem {
	id: number
	user_id: number
	domain_name: string
	tld: string
	available: boolean | null
	appraisal_grade: AppraisalGrade | null
	notes: string | null
	notify_on: string
	last_checked_at: string | null
	created_at: string
	updated_at: string
}

export interface WatchlistCreate {
	domain_name: string
	tld: string
	available?: boolean | null
	appraisal_grade?: AppraisalGrade | null
	notes?: string | null
	notify_on?: string
}

// ─── Wishlist ──────────────────────────────────────────────────────────────

export type WishlistPriority = 'low' | 'medium' | 'high' | 'critical'

export interface WishlistItem {
	id: number
	user_id: number
	domain_name: string
	tld: string
	max_budget: number | null
	available: boolean | null
	appraisal_grade: AppraisalGrade | null
	auto_prospect: boolean
	ai_agent: boolean
	priority: WishlistPriority
	notes: string | null
	last_checked_at: string | null
	created_at: string
	updated_at: string
}

export interface WishlistCreate {
	domain_name: string
	tld: string
	max_budget?: number | null
	available?: boolean | null
	appraisal_grade?: AppraisalGrade | null
	auto_prospect?: boolean
	ai_agent?: boolean
	priority?: WishlistPriority
	notes?: string | null
}

export interface WishlistUpdate {
	max_budget?: number | null
	auto_prospect?: boolean
	ai_agent?: boolean
	priority?: WishlistPriority
	notes?: string | null
}

// ─── Notification ──────────────────────────────────────────────────────────

export type NotificationType = 'status_change' | 'expiry_warning' | 'appraisal_shift' | 'new_prospect' | 'agent_action' | 'outreach_reply'

export type NotificationLevel = 'info' | 'warning' | 'urgent'

export interface AppNotification {
	id: number
	user_id: number
	domain_id: number | null
	type: NotificationType
	level: NotificationLevel
	message: string
	dismissed: boolean
	created_at: string
	updated_at: string
}
