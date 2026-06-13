/**
 * Auth utilities — JWT signing/verification + password hashing.
 * Uses jsonwebtoken (JWT) + bcryptjs (hashing) — pure JS, no native deps.
 */
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'

const JWT_EXPIRES_IN = '7d'

/** Hash a plaintext password */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/** Verify a plaintext password against a hash */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/** Sign a JWT with user payload */
export function signJwt(payload: { userId: number; email: string; tier: string; role?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

/** Verify and decode a JWT — returns null if invalid/expired */
export function verifyJwt(token: string): { userId: number; email: string; tier: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number; email: string; tier: string; role: string }
  } catch {
    return null
  }
}

/** Tier-based limits */
export const TIER_LIMITS = {
	free: { domains: 10, rdapDaily: 10, aiDaily: 5, watchlist: 10, wishlist: 5 },
	premium: { domains: 1000, rdapDaily: 100, aiDaily: 100, watchlist: 100, wishlist: 50 },
	enterprise: { domains: Infinity, rdapDaily: Infinity, aiDaily: Infinity, watchlist: Infinity, wishlist: Infinity },
} as const

export type TierName = keyof typeof TIER_LIMITS
