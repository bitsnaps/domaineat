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
import { sequelize, Domain, Ledger, Prospect } from './models/index.js'

export const app = new Hono()

// Middleware
app.use('/api/*', cors())

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


