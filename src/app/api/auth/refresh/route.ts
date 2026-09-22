import { NextRequest, NextResponse } from 'next/server'
import { clientIp } from '@/lib/request-ip'
import { verifyToken, signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import {
  accessTokenCookie,
  refreshTokenCookie,
  clearAuthCookies,
  REFRESH_TOKEN_COOKIE,
} from '@/lib/auth/cookies'
import { findUserById } from '@/lib/auth/session'
import { checkRateLimit } from '@/lib/rate-limit'
import { rateLimited } from '@/lib/errors'
import { isSafeInternalPath } from '@/lib/auth/safe-internal-path'

const DEFAULT_NEXT = '/chat'

interface RefreshSuccess {
  user: { id: string; email: string }
  accessToken: string
  refreshToken: string
}

interface RefreshFailure {
  error: string
}

async function performRefresh(request: NextRequest): Promise<RefreshSuccess | RefreshFailure> {
  const refreshTokenValue = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value
  if (!refreshTokenValue) {
    return { error: 'No refresh token' }
  }

  const payload = await verifyToken(refreshTokenValue)
  // type check: an access token also passes signature verification — only a
  // token minted by signRefreshToken carries type: 'refresh'. Without this,
  // a leaked 1h access token could be laundered into a fresh 7d pair.
  if (!payload?.sub || payload.type !== 'refresh') {
    return { error: 'Invalid refresh token' }
  }

  const user = await findUserById(payload.sub)
  if (!user) {
    return { error: 'User not found' }
  }

  const [accessToken, newRefreshToken] = await Promise.all([
    signAccessToken(user.id, user.email),
    signRefreshToken(user.id),
  ])

  return { user: { id: user.id, email: user.email }, accessToken, refreshToken: newRefreshToken }
}

export async function POST(request: NextRequest) {
  try {
    // Same generous per-IP ceiling as the mobile refresh route — this is an
    // unauthenticated endpoint doing a JWT verify + DB read per request.
    const ipLimit = await checkRateLimit(clientIp(request), 'auth-refresh')
    if (!ipLimit.success) return rateLimited()

    const result = await performRefresh(request)
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }

    const response = NextResponse.json({ user: result.user })
    response.cookies.set(accessTokenCookie(result.accessToken))
    response.cookies.set(refreshTokenCookie(result.refreshToken))

    return response
  } catch (err) {
    console.error('[auth/refresh] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/auth/refresh?next=<path>: the redirect target for the edge
 * middleware, which sends a request here when the access token cookie is
 * missing or expired but the refresh cookie still verifies. Mints a fresh
 * cookie pair and 307s to `next` (default /chat); on any failure it clears
 * both cookies and 307s to /login instead. Never reached for API routes
 * themselves — the middleware matcher excludes /api/*, so this handler
 * cannot redirect into a loop through itself.
 */
export async function GET(request: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  const nextParam = request.nextUrl.searchParams.get('next')
  const next = isSafeInternalPath(nextParam) ? nextParam : DEFAULT_NEXT

  const toLogin = () => {
    const loginUrl = new URL('/login', origin)
    loginUrl.searchParams.set('redirectedFrom', next)
    const response = NextResponse.redirect(loginUrl)
    for (const cookie of clearAuthCookies()) response.cookies.set(cookie)
    return response
  }

  try {
    const ipLimit = await checkRateLimit(clientIp(request), 'auth-refresh')
    if (!ipLimit.success) return rateLimited()

    const result = await performRefresh(request)
    if ('error' in result) return toLogin()

    const response = NextResponse.redirect(new URL(next, origin))
    response.cookies.set(accessTokenCookie(result.accessToken))
    response.cookies.set(refreshTokenCookie(result.refreshToken))

    return response
  } catch (err) {
    console.error('[auth/refresh] unexpected error:', err)
    return toLogin()
  }
}
