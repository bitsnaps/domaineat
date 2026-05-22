/**
 * api.ts — Main API handler (Hono on Netlify Functions)
 * 
 * Routes:
 *   GET  /api/health          — health check
 *   POST /api/domains          — create a domain
 *   GET  /api/domains/:id      — get domain by ID
 *   PUT  /api/domains/:id      — update domain
 *   DELETE /api/domains/:id    — delete domain
 *   GET  /api/ledger           — list ledger entries
 *   POST /api/ledger           — create ledger entry
 *   GET  /api/prospects        — list prospects
 *   POST /api/prospects        — create prospect
 *   PUT  /api/prospects/:id    — update prospect outreach status
 *   DELETE /api/prospects/:id  — delete prospect
 */
import { Hono } from 'hono'
import { handle } from 'hono/netlify'
import { cors } from 'hono/cors'
import { sequelize, Domain, Ledger, Prospect } from './_shared/db.js'

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

// Netlify handler — separate export so app can be tested directly
export default handle(app)
