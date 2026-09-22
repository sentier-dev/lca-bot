import { NextRequest, NextResponse } from 'next/server'
import { clientIp } from '@/lib/request-ip'
import { consumeToken, revokeActiveTokens } from '@/db/queries/password-tokens'
import { setPasswordForUser } from '@/db/queries/users'
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import { accessTokenCookie, refreshTokenCookie } from '@/lib/auth/cookies'
import { checkRateLimit } from '@/lib/rate-limit'
import { rateLimited, badRequest, parseJsonObject } from '@/lib/errors'
import { isPasswordValid, PASSWORD_REQUIREMENTS_TEXT } from '@/lib/validation/password'

export async function POST(request: NextRequest) {
  const ip = clientIp(request)
  const rl = await checkRateLimit(ip, 'set-password')
  if (!rl.success) return rateLimited()

  const body = await parseJsonObject(request)
  if (!body) return badRequest('Invalid JSON body')

  const { token, password } = body
  if (typeof token !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'token and password are required' }, { status: 400 })
  }
  if (!isPasswordValid(password)) {
    return NextResponse.json({ error: PASSWORD_REQUIREMENTS_TEXT }, { status: 400 })
  }

  const consumed = await consumeToken(token)
  if (!consumed) {
    return NextResponse.json({ error: 'This link is expired or already used. Request a new one.' }, { status: 410 })
  }
  if (consumed.purpose !== 'set_initial' && consumed.purpose !== 'reset') {
    return NextResponse.json({ error: 'Wrong token type for this endpoint' }, { status: 400 })
  }

  const updated = await setPasswordForUser(consumed.userId, password)
  if (!updated) {
    return NextResponse.json({ error: 'User no longer exists' }, { status: 410 })
  }

  // Any other outstanding link for this account is now stale.
  await revokeActiveTokens(consumed.userId)

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(updated.id, updated.email),
    signRefreshToken(updated.id),
  ])

  const response = NextResponse.json({ user: { id: updated.id, email: updated.email } })
  response.cookies.set(accessTokenCookie(accessToken))
  response.cookies.set(refreshTokenCookie(refreshToken))
  return response
}
