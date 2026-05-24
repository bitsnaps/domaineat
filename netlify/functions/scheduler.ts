/**
 * Netlify Scheduled Function — runs every 10 minutes.
 *
 * Triggers the background task scheduler which:
 * 1. Checks domain expirations and creates notifications
 * 2. Updates cached currency exchange rates
 * 3. Resets daily AI call counters (at midnight UTC)
 *
 * Configured in netlify.toml:
 *   [functions."scheduler"]
 *     schedule = "*/10 * * * *"
 */
import { runAllTasks } from '../../api/scheduler.js'
import { sequelize } from '../../api/models/index.js'

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
