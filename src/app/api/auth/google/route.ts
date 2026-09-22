import { NextRequest, NextResponse } from 'next/server'
import { clientIp } from '@/lib/request-ip'
import { createOAuthState } from '@/lib/auth/oauth-state'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/auth/google — redirect to Google OAuth consent screen
 */
export async function GET(request: NextRequest) {
  const ip = clientIp(request)
  const rl = await checkRateLimit(ip, 'oauth-init')
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const origin = appUrl || request.nextUrl.origin
  const redirectUri = `${origin}/api/auth/google/callback`

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 })
  }

  const next = request.nextUrl.searchParams.get('next') ?? '/chat'
  const state = await createOAuthState(next)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
