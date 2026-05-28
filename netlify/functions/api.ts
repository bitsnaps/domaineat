/**
 * api.ts — Netlify Functions adapter
 *
 * This is the ONLY Netlify-specific file. It loads env vars and
 * wraps the platform-agnostic Hono app from api/app.ts.
 *
 * IMPORTANT: Env validation MUST run before models/index.ts is imported,
 * because the Sequelize constructor requires DATABASE_URL at module level.
 * Static imports are hoisted, so we use dynamic import() to guarantee ordering.
 *
 * For other hosting platforms, use api/server.ts instead.
 */
import 'dotenv/config'
import { validateEnvVars } from '../../api/env.validation.js'
import { handle } from 'hono/netlify'

// Force esbuild to include pg in the bundle — Sequelize loads it dynamically
import 'pg'
import 'pg-hstore'

// Validate env vars synchronously before any model code runs
validateEnvVars()

// Dynamic import ensures the app (and its transitive model imports)
// only loads AFTER env validation has passed.
const { app, sequelize } = await import('../../api/app.js')

// Ensure DB tables exist on cold start.
// Uses sync({ alter: true }) to create missing tables and add missing columns
// without dropping data. Safe for serverless where migrations may not have run.
try {
	await sequelize.sync({ alter: true })
} catch (err) {
	console.error('DB sync failed:', err)
}

export default handle(app)
