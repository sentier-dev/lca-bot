import { randomUUID } from 'crypto'
import { cookies } from 'next/headers'
import { isSafeInternalPath } from './safe-internal-path'

const OAUTH_STATE_COOKIE = 'lw-oauth-state'
const STATE_MAX_AGE = 600 // 10 minutes

/**
 * Generate a cryptographic nonce, store it in a short-lived cookie,
 * and return a base64url-encoded state string for the OAuth flow.
 */
export async function createOAuthState(next: string): Promise<string> {
  const nonce = randomUUID()
  const state = Buffer.from(JSON.stringify({ nonce, next })).toString('base64url')

  const cookieStore = await cookies()
  cookieStore.set(OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: STATE_MAX_AGE,
  })

  return state
}

/**
 * Verify the state parameter from the OAuth callback matches the nonce
 * stored in the cookie. Returns the `next` redirect path if valid, null otherwise.
 * Always clears the cookie.
 */
export async function verifyOAuthState(stateParam: string | null): Promise<string | null> {
  const cookieStore = await cookies()
  const storedNonce = cookieStore.get(OAUTH_STATE_COOKIE)?.value

  // Always clear the state cookie
  cookieStore.set(OAUTH_STATE_COOKIE, '', { maxAge: 0, path: '/' })

  if (!stateParam || !storedNonce) {
    return null
  }

  try {
    const state = JSON.parse(Buffer.from(stateParam, 'base64url').toString())

    if (state.nonce !== storedNonce) {
      return null
    }

    if (typeof state.next === 'string' && isSafeInternalPath(state.next)) {
      return state.next
    }

    return '/chat'
  } catch {
    return null
  }
}
