/**
 * env.validation.ts — Startup environment variable validation
 *
 * Checks all required environment variables and logs warnings for missing ones.
 * Called at app startup before any routes are registered.
 *
 * Required Netlify environment variables (set in Netlify UI → Site settings → Environment):
 *   DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY, GODADDY_API_KEY, GODADDY_SECRET_KEY, NODE_ENV
 */

interface EnvVarDef {
  name: string
  required: boolean
  description: string
}

const ENV_VARS: EnvVarDef[] = [
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL connection string (e.g. postgres://user:pass@host:5432/dbname)',
  },
  {
    name: 'JWT_SECRET',
    required: true,
    description: 'Secret key for signing JWT tokens (min 32 chars in production)',
  },
  {
    name: 'ENCRYPTION_KEY',
    required: true,
    description: 'AES-256 encryption key for encrypting stored API keys (32-byte hex string)',
  },
  {
    name: 'GODADDY_API_KEY',
    required: true,
    description: 'GoDaddy API key for domain registration/management',
  },
  {
    name: 'GODADDY_SECRET_KEY',
    required: true,
    description: 'GoDaddy API secret key (paired with GODADDY_API_KEY)',
  },
  {
    name: 'NODE_ENV',
    required: false,
    description: 'Application environment: development | production | test (defaults to development)',
  },
]

export function validateEnvVars(): void {
  const missing: string[] = []
  const warnings: string[] = []

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name]

    if (!value || value === '') {
      if (envVar.required) {
        missing.push(envVar.name)
      } else {
        warnings.push(`${envVar.name} — ${envVar.description} (optional, using default)`)
      }
    }
  }

  // Extra production checks
  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      warnings.push('JWT_SECRET should be at least 32 characters in production')
    }
    if (process.env.JWT_SECRET === 'dev-secret-change-in-production') {
      missing.push('JWT_SECRET (still using default dev value)')
    }
  }

  // Log warnings
  for (const w of warnings) {
    console.warn(`[env] ⚠  ${w}`)
  }

  // Log missing required vars
  if (missing.length > 0) {
    const message = `[env] ✘  Missing required environment variables: ${missing.join(', ')}`
    if (process.env.NODE_ENV === 'production') {
      console.error(message)
      // In production, missing required vars are a fatal error
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
    } else {
      console.warn(`${message} — allowed in development, but MUST be set before deploying`)
    }
  } else {
    console.log('[env] ✓  All required environment variables are set')
  }
}
