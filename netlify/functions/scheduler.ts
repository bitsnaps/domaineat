/**
 * Netlify Scheduled Function — runs every 10 minutes.
 *
 * Triggers the background task scheduler which:
 * 1. Checks domain expirations and creates notifications
 * 2. Updates cached currency exchange rates
 * 3. Resets daily AI call counters (at midnight UTC)
 *
 * Configured in netlify.toml:
 * [functions."scheduler"]
 * schedule = "0-59/10 * * * *" (every 10 min)
 */
import 'dotenv/config'
import { validateEnvVars } from '../../api/env.validation.js'

// Force esbuild to include pg in the bundle — Sequelize loads it dynamically
import 'pg'
import 'pg-hstore'

// Validate env vars BEFORE importing models (which need DATABASE_URL)
validateEnvVars()

const { runAllTasks } = await import('../../api/scheduler.js')
const { sequelize } = await import('../../api/models/index.js')

// Ensure DB connection is ready
await sequelize.authenticate()

export default async () => {
	console.log('[scheduler] Starting scheduled run...')

	const now = new Date()
	const isMidnight = now.getUTCHours() === 0 && now.getUTCMinutes() < 10

	// Always run expiration + currency; only reset AI counters near midnight
	const tasks = isMidnight
		? ['expiration', 'currency', 'ai_reset']
		: ['expiration', 'currency']

	const result = await runAllTasks(tasks)

	console.log('[scheduler] Completed:', JSON.stringify(result, null, 2))
	return { statusCode: 200, body: JSON.stringify(result) }
}
