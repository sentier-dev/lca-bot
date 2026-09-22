import { NextRequest, NextResponse } from 'next/server'
import { clientIp } from '@/lib/request-ip'
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import { accessTokenCookie, refreshTokenCookie } from '@/lib/auth/cookies'
import { findOAuthUserForLogin } from '@/lib/auth/session'
import { verifyOAuthState } from '@/lib/auth/oauth-state'
import { checkRateLimit } from '@/lib/rate-limit'

interface GoogleTokenResponse { access_token: string; id_token: string; token_type: string }
interface GoogleUserInfo { sub: string; email: string; email_verified: boolean }

/** GET /api/auth/google/callback: Google redirect target. Existing accounts only. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  const fail = (code: string) => NextResponse.redirect(`${origin}/login?error=${code}`)

  const rl = await checkRateLimit(clientIp(request), 'oauth-callback')
  if (!rl.success) return fail('rate_limited')

  if (searchParams.get('error')) return fail('google_auth_denied')
  const code = searchParams.get('code')
  if (!code) return fail('missing_code')

  const next = await verifyOAuthState(searchParams.get('state'))
  if (!next) return fail('invalid_state')

  try {
    const redirectUri = `${origin}/api/auth/google/callback`
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenRes.ok) {
      console.error('[auth/google/callback] token exchange failed:', await tokenRes.text())
      return fail('google_token_exchange_failed')
    }
    const tokens: GoogleTokenResponse = await tokenRes.json()

    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (!userInfoRes.ok) {
      console.error('[auth/google/callback] userinfo failed:', await userInfoRes.text())
      return fail('google_userinfo_failed')
    }
    const googleUser: GoogleUserInfo = await userInfoRes.json()

    // Google allows non-Gmail accounts with unverified emails; an unproven
    // email must never reach the email-match path.
    if (!googleUser.email || googleUser.email_verified !== true) return fail('google_no_email')

    const user = await findOAuthUserForLogin(googleUser.email.trim().toLowerCase(), 'google', googleUser.sub)
    if (!user) return fail('no_account')

    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(user.id, user.email),
      signRefreshToken(user.id),
    ])
    const response = NextResponse.redirect(`${origin}${next}`)
    response.cookies.set(accessTokenCookie(accessToken))
    response.cookies.set(refreshTokenCookie(refreshToken))
    return response
  } catch (err) {
    console.error('[auth/google/callback] unexpected error:', err)
    return fail('auth_callback_failed')
  }
}
