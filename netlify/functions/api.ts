/**
 * api.ts — Netlify Functions adapter
 *
 * This is the ONLY Netlify-specific file. It loads env vars and
 * wraps the platform-agnostic Hono app from api/app.ts.
 *
 * For other hosting platforms, use api/server.ts instead.
 */
import 'dotenv/config'
import { handle } from 'hono/netlify'
import { app } from '../../api/app.js'

export default handle(app)
