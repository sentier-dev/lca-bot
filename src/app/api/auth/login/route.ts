import { NextRequest, NextResponse } from 'next/server'
import { clientIp } from '@/lib/request-ip'
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import { accessTokenCookie, refreshTokenCookie } from '@/lib/auth/cookies'
import { verifyUserCredentials } from '@/lib/auth/session'
import { checkRateLimit, peekRateLimit } from '@/lib/rate-limit'
import { rateLimited, badRequest, apiError, serverError, parseJsonObject } from '@/lib/errors'

const INVALID = () => apiError('Invalid email or password', 401)

export async function POST(request: NextRequest) {
  try {
    const ipLimit = await checkRateLimit(clientIp(request), 'auth-login')
    if (!ipLimit.success) return rateLimited()

    const body = await parseJsonObject(request)
    if (!body) return badRequest('Invalid JSON body')
    const { email, password } = body
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return badRequest('Email and password are required')
    }
    const normalizedEmail = email.trim().toLowerCase()

    // Per-email brute-force cap: peek first, consume a slot only on failure,
    // so a correct password never counts against the account.
    const emailLimit = await peekRateLimit(normalizedEmail, 'auth-login-email')
    if (!emailLimit.success) return INVALID()

    const user = await verifyUserCredentials(normalizedEmail, password)
    if (!user) {
      await checkRateLimit(normalizedEmail, 'auth-login-email')
      return INVALID()
    }

    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(user.id, user.email),
      signRefreshToken(user.id),
    ])
    const response = NextResponse.json({ user: { id: user.id, email: user.email } })
    response.cookies.set(accessTokenCookie(accessToken))
    response.cookies.set(refreshTokenCookie(refreshToken))
    return response
  } catch (err) {
    console.error('[auth/login] unexpected error:', err)
    return serverError()
  }
}
