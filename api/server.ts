/**
 * server.ts — Standalone Node.js entrypoint
 *
 * Use this for any non-Netlify hosting:
 *   Railway, Koyeb, Fly.io, Render, SiteGround, VPS, Docker, PM2, etc.
 *
 *   pnpm start          → node dist/server.js (after build)
 *   npx tsx api/server.ts  → run directly in dev
 *
 * Environment:
 *   PORT        — HTTP port (default: 3000)
 *   DATABASE_URL — PostgreSQL connection string
 */
import 'dotenv/config'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { app } from './app.js'

// Serve Vite build output as static files (SPA fallback via index.html)
// On Netlify this is handled by the CDN — this code only runs on standalone servers.
app.get('/assets/*', serveStatic({ root: './' }))
app.get('/*', serveStatic({ root: './dist' }))
app.get('*', async (c) => {
  // SPA fallback: serve index.html for any unmatched non-API route
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const indexPath = path.resolve('./dist/index.html')
  try {
    const html = await fs.readFile(indexPath, 'utf-8')
    return c.html(html)
  } catch {
    return c.text('Frontend not built — run pnpm build first', 503)
  }
})

const port = Number(process.env.PORT) || 3000

console.log(`🚀 Starting Domaineat on port ${port}`)
serve({ fetch: app.fetch, port })
