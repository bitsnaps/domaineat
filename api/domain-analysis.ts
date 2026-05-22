/**
 * Domain analysis utilities — keyword parsing, alt extension checking, RDAP lookup.
 * Uses Node.js built-ins (dns, https) — no external deps.
 * Loaded dynamically by the API route to avoid browser bundling.
 */
import dns from 'node:dns/promises'
import https from 'node:https'

// ─── Keyword Parser ─────────────────────────────────────────────────────

/** Common TLDs to strip when parsing keywords */
const KNOWN_TLDS = ['com', 'net', 'org', 'io', 'co', 'dev', 'app', 'ai', 'xyz', 'me', 'info', 'biz', 'us', 'uk', 'de', 'fr', 'eu', 'cc', 'tv', 'ly']

interface ParsedDomain {
  sld: string           // second-level domain (e.g. "domaineat" from "domaineat.com")
  tld: string           // top-level domain (e.g. "com")
  keywords: string[]    // split keywords (e.g. ["domain", "eat"])
  altExtensions: string[] // suggested alternative TLDs
}

/**
 * Parse a domain name into its components and extracted keywords.
 * Handles hyphenated domains (my-domain) and camelCase-ish (domaineat).
 */
export function parseDomain(domain: string): ParsedDomain {
  const parts = domain.toLowerCase().replace(/^www\./, '').split('.')
  const tld = parts.length > 1 ? parts[parts.length - 1] : ''
  const sld = parts.length > 1 ? parts.slice(0, -1).join('.') : parts[0]

  // Split SLD into keywords by hyphens first
  let keywords: string[] = []
  if (sld.includes('-')) {
    keywords = sld.split('-').filter(Boolean)
  } else {
    // Try to split camelCase-ish names into recognizable words
    // Simple approach: split on transitions from vowel-cons clusters
    keywords = splitIntoWords(sld)
  }

  // Generate alternative extensions
  const altExtensions = KNOWN_TLDS.filter(t => t !== tld)

  return { sld, tld, keywords, altExtensions }
}

/**
 * Simple word splitter — tries to identify sub-words in a concatenated string.
 * Uses a greedy approach with a small dictionary of common domain words.
 */
const COMMON_WORDS = new Set([
  'domain', 'eat', 'web', 'site', 'app', 'cloud', 'host', 'tech', 'data',
  'code', 'dev', 'hub', 'lab', 'net', 'pro', 'go', 'my', 'the', 'get',
  'try', 'use', 'buy', 'sell', 'market', 'shop', 'store', 'link', 'bit',
  'byte', 'ping', 'dns', 'api', 'ssl', 'key', 'hash', 'node', 'stack',
  'flow', 'base', 'kit', 'box', 'run', 'fit', 'map', 'log', 'chat',
  'book', 'name', 'brand', 'lead', 'tool', 'craft', 'build', 'launch',
  'start', 'smart', 'fast', 'open', 'free', 'love', 'top', 'best', 'new',
  'mail', 'feed', 'news', 'blog', 'wiki', 'page', 'card', 'pass', 'port',
])

function splitIntoWords(s: string): string[] {
  // Try greedy match from left against common words
  const result: string[] = []
  let remaining = s.toLowerCase()

  while (remaining.length > 0) {
    let found = false
    // Try longest match first (up to 8 chars)
    for (let len = Math.min(remaining.length, 8); len >= 2; len--) {
      const candidate = remaining.slice(0, len)
      if (COMMON_WORDS.has(candidate)) {
        result.push(candidate)
        remaining = remaining.slice(len)
        found = true
        break
      }
    }
    if (!found) {
      // No word found — take one character and move on
      if (result.length > 0 && result[result.length - 1].length === 1) {
        result[result.length - 1] += remaining[0]
      } else {
        result.push(remaining[0])
      }
      remaining = remaining.slice(1)
    }
  }

  // Merge single-char tokens into neighbors
  return result.filter(w => w.length > 0)
}

// ─── Alternative Extension Checker ──────────────────────────────────────

export interface ExtensionCheckResult {
  domain: string
  tld: string
  available: boolean | null   // null = unknown/error
  registrar: string | null
  expiryDate: string | null
}

/**
 * Check a domain's availability via RDAP.
 * Returns { available: true } if no RDAP record found.
 */
export async function checkExtension(
  sld: string,
  tld: string
): Promise<ExtensionCheckResult> {
  const domain = `${sld}.${tld}`
  try {
    const rdap = await rdapLookup(domain)
    return {
      domain,
      tld,
      available: false,
      registrar: rdap.registrar,
      expiryDate: rdap.expiryDate,
    }
  } catch {
    // No RDAP record = likely available
    return { domain, tld, available: true, registrar: null, expiryDate: null }
  }
}

/**
 * Check multiple alternative extensions for a domain.
 */
export async function checkAltExtensions(
  sld: string,
  excludeTld: string,
  tlds?: string[]
): Promise<ExtensionCheckResult[]> {
  const targets = tlds || KNOWN_TLDS.filter(t => t !== excludeTld).slice(0, 8)
  const results = await Promise.allSettled(
    targets.map(tld => checkExtension(sld, tld))
  )
  return results
    .filter((r): r is PromiseFulfilledResult<ExtensionCheckResult> => r.status === 'fulfilled')
    .map(r => r.value)
}

// ─── RDAP Lookup ────────────────────────────────────────────────────────

export interface RdapResult {
  domain: string
  registrar: string | null
  creationDate: string | null
  expiryDate: string | null
  nameservers: string[]
  status: string[]
}

/**
 * Query the IANA RDAP bootstrap to find the right RDAP server for a TLD,
 * then query that server for domain details.
 */
export async function rdapLookup(domain: string): Promise<RdapResult> {
  // 1. Get the RDAP server URL for this TLD from IANA
  const tld = domain.split('.').pop()!
  const bootstrapUrl = `https://data.iana.org/rdap/dns.json`

  const bootstrap = await httpGetJson<{ services: string[][] }>(bootstrapUrl)
  const service = bootstrap.services.find(s => s[0].includes(tld) || s[0].includes(`.${tld}`))
  if (!service || !service[1]) throw new Error(`No RDAP server for .${tld}`)

  const rdapBase = service[1][0].replace(/\/$/, '')

  // 2. Query the RDAP server for this domain
  const rdapUrl = `${rdapBase}/domain/${domain}`
  const data = await httpGetJson<any>(rdapUrl)

  // 3. Extract useful fields
  const registrar = data.entities?.find((e: any) =>
    e.roles?.includes('registrar')
  )?.vcardArray?.[1]?.find((v: any) => v[0] === 'fn')?.[3] || null

  const events = data.events || []
  const creationDate = events.find((e: any) => e.eventAction === 'registration')?.eventDate || null
  const expiryDate = events.find((e: any) => e.eventAction === 'expiration')?.eventDate || null

  const nameservers = (data.nameservers || []).map((ns: any) => ns.ldhName).filter(Boolean)
  const status = data.status || []

  return { domain, registrar, creationDate, expiryDate, nameservers, status }
}

// ─── HTTP helpers ───────────────────────────────────────────────────────

function httpGetJson<T>(url: string, timeout = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        return httpGetJson<T>(res.headers.location, timeout).then(resolve, reject)
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} from ${url}`))
        res.resume()
        return
      }
      const chunks: Buffer[] = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')))
        } catch (e) {
          reject(new Error(`Invalid JSON from ${url}`))
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${url}`)) })
  })
}

// ─── Full Domain Analysis ──────────────────────────────────────────────

export interface DomainAnalysis {
  parsed: ParsedDomain
  extensions: ExtensionCheckResult[]
  rdap: RdapResult | null
}

/**
 * Run a complete domain analysis: parse keywords, check alt extensions, RDAP lookup.
 */
export async function analyzeDomain(domain: string): Promise<DomainAnalysis> {
  const parsed = parseDomain(domain)

  // Run extension check and RDAP in parallel
  const [extensions, rdap] = await Promise.allSettled([
    checkAltExtensions(parsed.sld, parsed.tld),
    rdapLookup(domain),
  ])

  return {
    parsed,
    extensions: extensions.status === 'fulfilled' ? extensions.value : [],
    rdap: rdap.status === 'fulfilled' ? rdap.value : null,
  }
}
