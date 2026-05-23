/**
 * app.ts — Platform-agnostic Hono application
 *
 * This module defines routes and middleware ONLY — no runtime coupling.
 * It is imported by:
 *   - api/server.ts    → standalone Node server (Railway, Koyeb, VPS, Docker)
 *   - netlify/functions/api.ts → Netlify serverless adapter
 *
 * Environment variables (DATABASE_URL, etc.) must be loaded by the
 * entrypoint BEFORE importing this module.
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sequelize, Domain, Ledger, Prospect, User } from './models/index.js'
import { hashPassword, verifyPassword, signJwt, verifyJwt, TIER_LIMITS } from './auth.js'

export const app = new Hono()

// Middleware
app.use('/api/*', cors())

// ─── Auth Routes ───────────────────────────────────────────────────────

// Register
app.post('/api/auth/register', async (c) => {
  const { email, password } = await c.req.json()
  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400)
  }
  if (password.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters' }, 400)
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

  const token = await signJwt({ userId: user.id, email: user.email, tier: user.tier })
  return c.json({
    token,
    user: { id: user.id, email: user.email, tier: user.tier },
  }, 201)
})

// Login
app.post('/api/auth/login', async (c) => {
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

  const token = await signJwt({ userId: user.id, email: user.email, tier: user.tier })
  return c.json({
    token,
    user: { id: user.id, email: user.email, tier: user.tier },
  })
})

// Get current user from token
app.get('/api/auth/me', async (c) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: 'Authorization header required' }, 401)
  }

  const payload = await verifyJwt(auth.slice(7))
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
  const user = await User.findByPk(c.req.param('id'))
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

  const user = await User.findByPk(user_id)
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


