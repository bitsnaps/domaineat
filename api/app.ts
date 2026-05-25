/**
 * app.ts — Platform-agnostic Hono application
 *
 * This module defines routes and middleware ONLY — no runtime coupling.
 * It is imported by:
 * - api/server.ts → standalone Node server (Railway, Koyeb, VPS, Docker)
 * - netlify/functions/api.ts → Netlify serverless adapter
 *
 * Environment variables (DATABASE_URL, etc.) must be loaded by the
 * entrypoint BEFORE importing this module.
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sequelize, Domain, Ledger, Prospect, User, Notification } from './models/index.js'
import { hashPassword, verifyPassword, signJwt, verifyJwt, TIER_LIMITS } from './auth.js'
import { runAllTasks } from './scheduler.js'
// Env validation is handled by the entrypoint (netlify/functions/api.ts or api/server.ts)
// BEFORE this module is imported, so that models/index.ts can safely read DATABASE_URL.
// Do NOT call validateEnvVars() here — static imports above already loaded models.

export const app = new Hono()
export { sequelize }

// ─── Security Middleware ─────────────────────────────────────────────────

// HTTPS enforcement in production (checks X-Forwarded-Proto for Netlify/proxy)
app.use('/api/*', async (c, next) => {
  if (process.env.NODE_ENV === 'production') {
    const proto = c.req.header('X-Forwarded-Proto')
    if (proto && proto !== 'https') {
      const url = new URL(c.req.url)
      url.protocol = 'https:'
      return c.redirect(url.toString(), 301)
    }
  }
  return next()
})

// Security headers
app.use('/api/*', async (c, next) => {
  await next()
  c.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'")
})

// Request size limiting (max 1MB body)
app.use('/api/*', async (c, next) => {
  const contentLength = c.req.header('Content-Length')
  if (contentLength && parseInt(contentLength, 10) > 1_048_576) {
    return c.json({ error: 'Request body too large (max 1MB)' }, 413)
  }
  return next()
})

// In-memory rate limiter for auth routes
const authRateLimitMap = new Map<string, { count: number; resetAt: number }>()
const AUTH_RATE_LIMIT = 10 // max requests per window
const AUTH_RATE_WINDOW = 60_000 // 1 minute window

app.use('/api/auth/*', async (c, next) => {
  const ip = c.req.header('X-Forwarded-For')?.split(',')[0]?.trim()
    || c.req.header('X-Real-IP')
    || 'unknown'
  const key = `auth:${ip}`
  const now = Date.now()

  let entry = authRateLimitMap.get(key)
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + AUTH_RATE_WINDOW }
    authRateLimitMap.set(key, entry)
  }

  entry.count++

  if (entry.count > AUTH_RATE_LIMIT) {
    return c.json({ error: 'Too many requests. Please try again later.' }, 429)
  }

  // Periodic cleanup of stale entries (every ~100 requests)
  if (Math.random() < 0.01) {
    for (const [k, v] of authRateLimitMap) {
      if (now > v.resetAt) authRateLimitMap.delete(k)
    }
  }

  return next()
})

// CORS
app.use('/api/*', cors())

// ─── Auth Middleware ──────────────────────────────────────────────────
// Public routes that skip authentication
const PUBLIC_PATHS = ['/api/health', '/api/auth/register', '/api/auth/login', '/api/auth/me']

app.use('/api/*', async (c, next) => {
  const path = new URL(c.req.url).pathname

  // Skip auth for public routes
  if (PUBLIC_PATHS.some((p) => path === p) || path.startsWith('/api/auth/')) {
    return next()
  }

  // Extract Bearer token
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: 'Authorization token required' }, 401)
  }

  const token = auth.slice(7)
  if (!token) {
    return c.json({ error: 'Authorization token required' }, 401)
  }

  // Verify JWT
  const payload = verifyJwt(token)
  if (!payload) {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }

  // Inject user context for downstream routes
  c.set('userId', payload.userId)
  c.set('email', payload.email)
  c.set('tier', payload.tier)
  c.set('user', payload)

  return next()
})

// ─── Auth Routes ───────────────────────────────────────────────────────

// Register
app.post('/api/auth/register', async (c) => {
	try {
		const { email, password, confirmPassword } = await c.req.json()
		if (!email || !password) {
			return c.json({ error: 'Email and password are required' }, 400)
		}
		if (password.length < 8) {
			return c.json({ error: 'Password must be at least 8 characters' }, 400)
		}
		if (!confirmPassword) {
			return c.json({ error: 'Password confirmation is required' }, 400)
		}
		if (password !== confirmPassword) {
			return c.json({ error: 'Passwords do not match' }, 400)
		}

		// Check if email already exists
		const existing = await User.findOne({ where: { email } })
		if (existing) {
			return c.json({ error: 'Email already registered' }, 409)
		}

		const hashed = await hashPassword(password)
		const user = await User.create({
			email,
			password_hash: hashed,
			tier: 'free',
		} as any)

		const token = signJwt({ userId: user.id, email: user.email, tier: user.tier })
		return c.json({
			token,
			user: { id: user.id, email: user.email, tier: user.tier },
		}, 201)
	} catch (err: any) {
		console.error('Register error:', err)
		return c.json({ error: 'Registration failed. Please try again.' }, 500)
	}
})

// Login
app.post('/api/auth/login', async (c) => {
	try {
		const { email, password } = await c.req.json()
		if (!email || !password) {
			return c.json({ error: 'Email and password are required' }, 400)
		}

		const user = await User.findOne({ where: { email } })
		if (!user) {
			return c.json({ error: 'Invalid email or password' }, 401)
		}

		const valid = await verifyPassword(password, user.password_hash)
		if (!valid) {
			return c.json({ error: 'Invalid email or password' }, 401)
		}

		const token = signJwt({ userId: user.id, email: user.email, tier: user.tier })
		return c.json({
			token,
			user: { id: user.id, email: user.email, tier: user.tier },
		})
	} catch (err: any) {
		console.error('Login error:', err)
		return c.json({ error: 'Login failed. Please try again.' }, 500)
	}
})

// Get current user from token
app.get('/api/auth/me', async (c) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: 'Authorization header required' }, 401)
  }

  const payload = verifyJwt(auth.slice(7))
  if (!payload) {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }

  const user = await User.findByPk(payload.userId, {
    attributes: { exclude: ['password_hash', 'llm_api_key_encrypted'] },
  })
  if (!user) return c.json({ error: 'User not found' }, 404)
  return c.json(user)
})

// Auth middleware helper — extracts user from Bearer token
async function getAuthUser(c: any): Promise<{ userId: number; email: string; tier: string } | null> {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return verifyJwt(auth.slice(7))
}

// Health check
app.get('/api/health', async (c) => {
  try {
    await sequelize.authenticate()
    return c.json({ status: 'ok', database: 'connected' })
  } catch (err: any) {
    return c.json({ status: 'error', database: 'disconnected', error: err.message }, 503)
  }
})

// ─── Domains ───────────────────────────────────────────────────────────

app.get('/api/domains', async (c) => {
  const userId = c.req.query('user_id')
  if (!userId) return c.json({ error: 'user_id query parameter required' }, 400)

  const domains = await Domain.findAll({
    where: { user_id: Number(userId) },
    order: [['created_at', 'DESC']],
  })
  return c.json(domains)
})

app.post('/api/domains', async (c) => {
  // Tier-based domain limit enforcement
  const user = c.get('user') as { userId: number; email: string; tier: string } | undefined
  if (user) {
    const tier = (user.tier || 'free') as keyof typeof TIER_LIMITS
    const limit = TIER_LIMITS[tier]?.domains ?? TIER_LIMITS.free.domains
    if (limit !== Infinity) {
      const currentCount = await Domain.count({ where: { user_id: user.userId } })
      if (currentCount >= limit) {
        return c.json({ error: `Domain limit reached (${limit} for ${tier} tier). Upgrade to add more.` }, 403)
      }
    }
  }

  const body = await c.req.json()
  try {
    const domain = await Domain.create(body)
    return c.json(domain, 201)
  } catch (err: any) {
    return c.json({ error: err.message }, 400)
  }
})

app.get('/api/domains/:id', async (c) => {
  const domain = await Domain.findByPk(c.req.param('id'))
  if (!domain) return c.json({ error: 'Domain not found' }, 404)
  return c.json(domain)
})

app.put('/api/domains/:id', async (c) => {
  const domain = await Domain.findByPk(c.req.param('id'))
  if (!domain) return c.json({ error: 'Domain not found' }, 404)

  const body = await c.req.json()
  await domain.update(body)
  return c.json(domain)
})

app.delete('/api/domains/:id', async (c) => {
  const domain = await Domain.findByPk(c.req.param('id'))
  if (!domain) return c.json({ error: 'Domain not found' }, 404)

  await domain.destroy()
  return c.json({ deleted: true }, 200)
})

// Domain-scoped ledger entries
app.get('/api/domains/:id/ledger', async (c) => {
  const domain = await Domain.findByPk(c.req.param('id'))
  if (!domain) return c.json({ error: 'Domain not found' }, 404)

  const entries = await Ledger.findAll({
    where: { domain_id: domain.id },
    order: [['transaction_date', 'DESC']],
  })
  return c.json(entries)
})

// Domain-scoped prospects
app.get('/api/domains/:id/prospects', async (c) => {
  const domain = await Domain.findByPk(c.req.param('id'))
  if (!domain) return c.json({ error: 'Domain not found' }, 404)

  const prospects = await Prospect.findAll({
    where: { domain_id: domain.id },
    order: [['created_at', 'DESC']],
  })
  return c.json(prospects)
})

// DNS + SSL check
app.get('/api/domains/:id/dns-check', async (c) => {
  const domain = await Domain.findByPk(c.req.param('id'))
  if (!domain) return c.json({ error: 'Domain not found' }, 404)

  const { fullDnsCheck } = await import('./dns-check.js')
  try {
    const result = await fullDnsCheck(domain.getDataValue('domain_name'))
    return c.json(result)
  } catch (err: any) {
    return c.json({ error: `DNS check failed: ${err.message}` }, 502)
  }
})

// Domain analysis (keyword parse, alt extensions, RDAP)
app.get('/api/domains/:id/analyze', async (c) => {
  const domain = await Domain.findByPk(c.req.param('id'))
  if (!domain) return c.json({ error: 'Domain not found' }, 404)

  const { analyzeDomain } = await import('./domain-analysis.js')
  try {
    const result = await analyzeDomain(domain.getDataValue('domain_name'))
    return c.json(result)
  } catch (err: any) {
    return c.json({ error: `Domain analysis failed: ${err.message}` }, 502)
  }
})

// Standalone domain analysis (no DB record needed)
app.post('/api/analyze-domain', async (c) => {
  const { domain } = await c.req.json()
  if (!domain || typeof domain !== 'string') {
    return c.json({ error: 'domain field is required' }, 400)
  }

  const { analyzeDomain } = await import('./domain-analysis.js')
  try {
    const result = await analyzeDomain(domain)
    return c.json(result)
  } catch (err: any) {
    return c.json({ error: `Domain analysis failed: ${err.message}` }, 502)
  }
})

// ─── Ledger ────────────────────────────────────────────────────────────

app.get('/api/ledger', async (c) => {
  const domainId = c.req.query('domain_id')
  const where = domainId ? { domain_id: Number(domainId) } : {}

  const entries = await Ledger.findAll({
    where,
    order: [['transaction_date', 'DESC']],
  })
  return c.json(entries)
})

app.post('/api/ledger', async (c) => {
  const body = await c.req.json()
  try {
    const entry = await Ledger.create(body)
    return c.json(entry, 201)
  } catch (err: any) {
    return c.json({ error: err.message }, 400)
  }
})

app.patch('/api/ledger/:id', async (c) => {
  const entry = await Ledger.findByPk(c.req.param('id'))
  if (!entry) return c.json({ error: 'Ledger entry not found' }, 404)

  const body = await c.req.json()
  await entry.update(body)
  return c.json(entry)
})

app.delete('/api/ledger/:id', async (c) => {
  const entry = await Ledger.findByPk(c.req.param('id'))
  if (!entry) return c.json({ error: 'Ledger entry not found' }, 404)

  await entry.destroy()
  return c.json({ ok: true })
})

// ─── Prospects ─────────────────────────────────────────────────────────

app.get('/api/prospects', async (c) => {
  const domainId = c.req.query('domain_id')
  const where = domainId ? { domain_id: Number(domainId) } : {}

  const prospects = await Prospect.findAll({
    where,
    order: [['created_at', 'DESC']],
  })
  return c.json(prospects)
})

app.post('/api/prospects', async (c) => {
  const body = await c.req.json()
  try {
    const prospect = await Prospect.create(body)
    return c.json(prospect, 201)
  } catch (err: any) {
    return c.json({ error: err.message }, 400)
  }
})

app.put('/api/prospects/:id', async (c) => {
  const prospect = await Prospect.findByPk(c.req.param('id'))
  if (!prospect) return c.json({ error: 'Prospect not found' }, 404)

  const body = await c.req.json()
  await prospect.update(body)
  return c.json(prospect)
})

app.delete('/api/prospects/:id', async (c) => {
  const prospect = await Prospect.findByPk(c.req.param('id'))
  if (!prospect) return c.json({ error: 'Prospect not found' }, 404)

 await prospect.destroy()
 return c.json({ deleted: true }, 200)
})

// ─── Exchange Rates ──────────────────────────────────────────────────────

app.get('/api/exchange-rates', async (c) => {
  // Fallback rates (updated periodically — in production use a real API)
  const fallbackRates = {
    USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.36, AUD: 1.53, JPY: 149.5, CNY: 7.24, INR: 83.1,
  }

  try {
    const res = await fetch('https://api.exchangerate.host/latest?base=USD', {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) throw new Error('Upstream error')
    const data = await res.json() as { rates?: Record<string, number> }
    return c.json({ rates: data.rates || fallbackRates, source: 'live' })
  } catch {
    return c.json({ rates: fallbackRates, source: 'fallback' })
  }
})

// ─── Domain Validation ─────────────────────────────────────────────────

app.get('/api/validate', async (c) => {
  const domain = c.req.query('domain')
  if (!domain || typeof domain !== 'string') {
    return c.json({ error: 'domain query parameter is required' }, 400)
  }

  const sanitized = domain.toLowerCase().replace(/^www\./, '').trim()
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+$/.test(sanitized)) {
    return c.json({ error: 'Invalid domain format' }, 400)
  }

  try {
    const { rdapLookup } = await import('./domain-analysis.js')
    const { fullDnsCheck } = await import('./dns-check.js')

    const [rdapResult, dnsResult] = await Promise.allSettled([
      rdapLookup(sanitized),
      fullDnsCheck(sanitized),
    ])

    const rdap = rdapResult.status === 'fulfilled' ? rdapResult.value : null
    const dns = dnsResult.status === 'fulfilled' ? dnsResult.value : null

    return c.json({
      status: 'ok',
      domain: sanitized,
      available: rdap === null,
      whois: rdap ? {
        registrar: rdap.registrar,
        creationDate: rdap.creationDate,
        expiryDate: rdap.expiryDate,
        nameservers: rdap.nameservers,
        status: rdap.status,
      } : null,
      dns: dns ? {
        resolved: dns.resolved,
        ip: dns.ip,
        nameservers: dns.nameservers,
        ssl_expiry: dns.ssl_expiry,
      } : null,
    })
  } catch (err: any) {
    return c.json({ error: `Validation failed: ${err.message}` }, 502)
  }
})

// ─── Domain Search (TLD expansion) ─────────────────────────────────────

app.get('/api/search', async (c) => {
  const domain = c.req.query('domain')
  const tldsParam = c.req.query('tlds')

  if (!domain || typeof domain !== 'string') {
    return c.json({ error: 'domain query parameter is required' }, 400)
  }

  const sld = domain.toLowerCase().replace(/^www\./, '').split('.')[0]
  if (!sld) {
    return c.json({ error: 'Invalid domain — could not extract SLD' }, 400)
  }

  const defaultTlds = ['com', 'net', 'org', 'io', 'co', 'dev', 'app', 'ai', 'xyz', 'me']
  const tlds = tldsParam
    ? tldsParam.split(',').map(t => t.trim().replace(/^\./, '')).filter(Boolean)
    : defaultTlds

  try {
    const { checkExtension } = await import('./domain-analysis.js')
    const results = await Promise.allSettled(
      tlds.map(tld => checkExtension(sld, tld))
    )

    const extensions = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value)

    return c.json({
      status: 'ok',
      sld,
      results: extensions,
    })
  } catch (err: any) {
    return c.json({ error: `Search failed: ${err.message}` }, 502)
  }
})

// ─── Bulk Domain Lookup ────────────────────────────────────────────────

app.post('/api/bulk', async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body || !Array.isArray(body.domains) || body.domains.length === 0) {
    return c.json({ error: 'domains array is required (e.g. {"domains":["example.com","test.io"]})' }, 400)
  }

  if (body.domains.length > 50) {
    return c.json({ error: 'Maximum 50 domains per bulk request' }, 400)
  }

  const domains = body.domains.map((d: string) =>
    String(d).toLowerCase().replace(/^www\./, '').trim()
  ).filter((d: string) => /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+$/.test(d))

  if (domains.length === 0) {
    return c.json({ error: 'No valid domains found in request' }, 400)
  }

  try {
    const { rdapLookup } = await import('./domain-analysis.js')
    const { fullDnsCheck } = await import('./dns-check.js')

    const results = await Promise.allSettled(
      domains.map(async (domain: string) => {
        const [rdapResult, dnsResult] = await Promise.allSettled([
          rdapLookup(domain),
          fullDnsCheck(domain),
        ])

        const rdap = rdapResult.status === 'fulfilled' ? rdapResult.value : null
        const dns = dnsResult.status === 'fulfilled' ? dnsResult.value : null

        return {
          domain,
          available: rdap === null,
          whois: rdap ? {
            registrar: rdap.registrar,
            creationDate: rdap.creationDate,
            expiryDate: rdap.expiryDate,
          } : null,
          dns: dns ? {
            resolved: dns.resolved,
            ip: dns.ip,
          } : null,
        }
      })
    )

    return c.json({
      status: 'ok',
      results: results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value),
    })
  } catch (err: any) {
    return c.json({ error: `Bulk lookup failed: ${err.message}` }, 502)
  }
})

// ─── User & AI Settings ────────────────────────────────────────────────

// Get user profile + AI settings
app.get('/api/users/:id', async (c) => {
  const user = await User.findByPk(c.req.param('id'), {
    attributes: { exclude: ['password_hash', 'llm_api_key_encrypted'] },
  })
  if (!user) return c.json({ error: 'User not found' }, 404)
  return c.json(user)
})

// Update user AI settings
app.patch('/api/users/:id/ai-settings', async (c) => {
  const user = await User.findByPk(c.req.param('id'))
  if (!user) return c.json({ error: 'User not found' }, 404)

  const body = await c.req.json()
  const allowed = ['llm_provider', 'llm_model', 'llm_api_key_encrypted']
  const updates: Record<string, any> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  await user.update(updates)
  // Return without sensitive fields
  const safe = user.toJSON() as any
  delete safe.password_hash
  // Mask API key — only show last 4 chars
  if (safe.llm_api_key_encrypted) {
    const key = String(safe.llm_api_key_encrypted)
    safe.llm_api_key_encrypted = key.length > 4 ? '••••' + key.slice(-4) : '••••'
  }
  return c.json(safe)
})

// Check if user has AI configured
app.get('/api/users/:id/ai-status', async (c) => {
  const user = await User.findByPk(c.req.param('id'), {
    attributes: { exclude: ['password_hash', 'llm_api_key_encrypted'] },
  })
  if (!user) return c.json({ error: 'User not found' }, 404)

  const configured = !!(user.llm_provider && user.llm_api_key_encrypted)
  const dailyLimit = user.tier === 'free' ? 5 : user.tier === 'premium' ? 100 : Infinity
  return c.json({
    configured,
    provider: user.llm_provider,
    model: user.llm_model,
    daily_calls: user.daily_ai_calls,
    daily_limit: dailyLimit,
    tier: user.tier,
  })
})

// ─── AI Draft Outreach ─────────────────────────────────────────────────

app.post('/api/ai/draft-outreach', async (c) => {
  const { user_id, domain_name, prospect_domain, company_name, contact_email } = await c.req.json()

  if (!user_id || !domain_name || !prospect_domain) {
    return c.json({ error: 'user_id, domain_name, and prospect_domain are required' }, 400)
  }

  const user = await User.findByPk(user_id, {
    attributes: { exclude: ['password_hash'] },
  })
  if (!user) return c.json({ error: 'User not found' }, 404)

  if (!user.llm_provider || !user.llm_api_key_encrypted) {
    return c.json({ error: 'AI not configured. Set your LLM provider and API key in Settings.' }, 400)
  }

  // Rate limiting
  const dailyLimit = user.tier === 'free' ? 5 : user.tier === 'premium' ? 100 : Infinity
  if (user.daily_ai_calls >= dailyLimit) {
    return c.json({ error: `Daily AI call limit reached (${dailyLimit}/day for ${user.tier} tier)` }, 429)
  }

  // Build prompt
  const prompt = `You are a professional domain broker. Write a brief, friendly outreach email to inquire about purchasing the domain "${prospect_domain}".

Context:
- I own the domain "${domain_name}" in the same niche
- ${company_name ? `The prospect's company is "${company_name}"` : 'The prospect company is unknown'}
- ${contact_email ? `Contact email: ${contact_email}` : 'Contact email is not available — suggest they reply to this email'}

Requirements:
- Keep it under 150 words
- Be professional and respectful
- Mention I own a related domain
- Express genuine interest
- Suggest a reasonable opening offer range
- End with a clear call-to-action

Return ONLY the email body text, no subject line needed.`

  try {
    // Increment daily call counter
    await user.update({ daily_ai_calls: user.daily_ai_calls + 1 })

    // Call the LLM provider
    const draft = await callLlm(user.llm_provider, user.llm_api_key_encrypted, user.llm_model, prompt)
    return c.json({ draft, provider: user.llm_provider, model: user.llm_model })
  } catch (err: any) {
    // Decrement counter on failure
    await user.update({ daily_ai_calls: Math.max(0, user.daily_ai_calls - 1) })
    return c.json({ error: `AI call failed: ${err.message}` }, 502)
  }
})

/**
 * Call an LLM provider with a prompt. Supports OpenAI-compatible APIs.
 */
async function callLlm(provider: string, apiKey: string, model: string | null, prompt: string): Promise<string> {
  const defaultModels: Record<string, string> = {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-haiku-20240307',
    groq: 'llama-3.1-8b-instant',
    openrouter: 'openai/gpt-4o-mini',
  }

  const useModel = model || defaultModels[provider] || 'gpt-4o-mini'

  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: useModel,
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`)
    const data = await res.json() as any
    return data.content?.[0]?.text || ''
  }

  // OpenAI-compatible (openai, groq, openrouter)
  const baseUrls: Record<string, string> = {
    openai: 'https://api.openai.com',
    groq: 'https://api.groq.com/openai',
    openrouter: 'https://openrouter.ai/api',
  }
  const baseUrl = baseUrls[provider] || baseUrls.openai

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: useModel,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`${provider} API ${res.status}: ${await res.text()}`)
  const data = await res.json() as any
  return data.choices?.[0]?.message?.content || ''
}

// ─── Scheduler ──────────────────────────────────────────────────────

// Manual trigger for scheduler tasks (authenticated)
app.post('/api/scheduler/run', async (c) => {
  let body: { tasks?: string[] } = {}
  try {
    body = await c.req.json()
  } catch { /* empty body is fine — runs all tasks */ }

  const result = await runAllTasks(body.tasks)
  return c.json(result)
})

// ─── Notifications ──────────────────────────────────────────────────

app.get('/api/notifications', async (c) => {
  const userId = c.req.query('user_id')
  const where: any = userId ? { user_id: Number(userId) } : {}

  const notifications = await Notification.findAll({
    where,
    order: [['created_at', 'DESC']],
  })
  return c.json(notifications)
})

app.patch('/api/notifications/:id/dismiss', async (c) => {
  const notification = await Notification.findByPk(c.req.param('id'))
  if (!notification) return c.json({ error: 'Notification not found' }, 404)

  await notification.update({ dismissed: true })
  return c.json(notification)
})