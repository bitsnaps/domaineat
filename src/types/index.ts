/**
 * TypeScript interfaces for Domaineat
 * Aligned with the Sequelize models in api/models/
 */

// ─── User ──────────────────────────────────────────────────────────────────

export type UserTier = 'free' | 'premium' | 'enterprise'

export interface User {
  id: number
  email: string
  /** Omitted in API responses — never sent to the client */
  password_hash?: never
  tier: UserTier
  created_at: string
}

// ─── Domain ────────────────────────────────────────────────────────────────

export type DomainStatus = 'active' | 'expired' | 'sold' | 'pending_delete' | 'parked'

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
}

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

// ─── User & AI Settings ────────────────────────────────────────────────

export type LlmProvider = 'openai' | 'anthropic' | 'groq' | 'openrouter'

export interface User {
  id: number
  email: string
  tier: UserTier
  llm_provider: LlmProvider | null
  llm_model: string | null
  llm_api_key_encrypted: string | null  // masked — only last 4 chars
  daily_ai_calls: number
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
