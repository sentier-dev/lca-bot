import { randomBytes, createHash } from 'node:crypto'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { passwordResetTokens, type TokenPurpose } from '@/db/schema'
import { PASSWORD_TOKEN_TTL_HOURS } from '@/lib/auth/token-ttl'

const TOKEN_LIFETIME_MS = PASSWORD_TOKEN_TTL_HOURS * 60 * 60 * 1000

export function generateTokenSecret(): string {
  return randomBytes(32).toString('base64url')
}

export function hashTokenSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex')
}

export interface IssuedToken {
  secret: string  // goes in the URL — never stored
  id: string
}

export async function issueToken(
  userId: string,
  purpose: TokenPurpose,
): Promise<IssuedToken> {
  const secret = generateTokenSecret()
  const tokenHash = hashTokenSecret(secret)
  const expiresAt = new Date(Date.now() + TOKEN_LIFETIME_MS)
  const [row] = await db.insert(passwordResetTokens).values({
    userId,
    tokenHash,
    purpose,
    expiresAt,
  }).returning({ id: passwordResetTokens.id })
  return { secret, id: row.id }
}

export interface ValidToken {
  id: string
  userId: string
  purpose: TokenPurpose
}

/**
 * Atomic consume: marks the token used and returns it only if it was
 * previously valid (unused + unexpired). Returns null on any miss.
 */
export async function consumeToken(secret: string): Promise<ValidToken | null> {
  const tokenHash = hashTokenSecret(secret)
  const [row] = await db.update(passwordResetTokens)
    .set({ usedAt: sql`now()` })
    .where(and(
      eq(passwordResetTokens.tokenHash, tokenHash),
      isNull(passwordResetTokens.usedAt),
      sql`${passwordResetTokens.expiresAt} > now()`,
    ))
    .returning({
      id: passwordResetTokens.id,
      userId: passwordResetTokens.userId,
      purpose: passwordResetTokens.purpose,
    })
  return row ? (row as ValidToken) : null
}

/**
 * Marks every unused token for an account as used. Called after a successful
 * password change so a second outstanding reset link cannot be redeemed.
 * Returns the number of tokens revoked.
 */
export async function revokeActiveTokens(userId: string): Promise<number> {
  const rows = await db.update(passwordResetTokens)
    .set({ usedAt: sql`now()` })
    .where(and(
      eq(passwordResetTokens.userId, userId),
      isNull(passwordResetTokens.usedAt),
    ))
    .returning({ id: passwordResetTokens.id })
  return rows.length
}
