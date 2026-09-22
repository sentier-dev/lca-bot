import { cache } from 'react'
import { cookies } from 'next/headers'
import { ACCESS_TOKEN_COOKIE } from './cookies'
import { verifyToken } from './jwt'
import * as userQueries from '@/db/queries/users'

export interface SessionUser {
  id: string
  email: string
}

// cache() dedupes within one React render pass (layout + page + nested server
// components share a single verification).
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value
  if (!accessToken) return null

  const payload = await verifyToken(accessToken)
  // Refresh tokens carry no email and are typed; refuse them as access tokens.
  if (!payload?.sub || !payload?.email || payload.type === 'refresh') return null

  return { id: payload.sub, email: payload.email }
})

export async function verifyUserCredentials(email: string, password: string) {
  return userQueries.verifyCredentials(email, password)
}

export async function findUserById(userId: string) {
  return userQueries.findUserById(userId)
}

/**
 * Google sign-in for EXISTING accounts only (D6). Subject first, then the
 * verified email; on an email match the subject is stored so later logins
 * are subject-stable. Returns null when no account exists; never inserts.
 */
export async function findOAuthUserForLogin(
  email: string,
  provider: 'google',
  providerId: string,
): Promise<SessionUser | null> {
  const bySubject = await userQueries.findUserByProviderSubject(provider, providerId)
  if (bySubject) return { id: bySubject.id, email: bySubject.email }

  const existing = await userQueries.findUserByEmail(email)
  if (!existing) return null

  const linked = await userQueries.linkOAuthProvider(existing.id, provider, providerId)
  if (!linked && existing.providerId !== providerId) {
    console.warn(`[auth/oauth] google subject not linked for user ${existing.id}: already bound to ${existing.providerId}`)
  }
  return { id: existing.id, email: existing.email }
}
