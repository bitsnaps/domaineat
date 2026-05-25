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

// Validate env vars synchronously before any model code runs
validateEnvVars()

// Dynamic import ensures the app (and its transitive model imports)
// only loads AFTER env validation has passed.
const { app } = await import('../../api/app.js')

export default handle(app)
