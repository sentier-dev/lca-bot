import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockCheckRateLimit,
  mockVerifyOAuthState,
  mockFindOAuthUserForLogin,
  mockSignAccessToken,
  mockSignRefreshToken,
} = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn(),
  mockVerifyOAuthState: vi.fn(),
  mockFindOAuthUserForLogin: vi.fn(),
  mockSignAccessToken: vi.fn(),
  mockSignRefreshToken: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}))

vi.mock('@/lib/auth/oauth-state', () => ({
  verifyOAuthState: (...args: unknown[]) => mockVerifyOAuthState(...args),
}))

vi.mock('@/lib/auth/session', () => ({
  findOAuthUserForLogin: (...args: unknown[]) => mockFindOAuthUserForLogin(...args),
}))

vi.mock('@/lib/auth/jwt', () => ({
  signAccessToken: (...args: unknown[]) => mockSignAccessToken(...args),
  signRefreshToken: (...args: unknown[]) => mockSignRefreshToken(...args),
}))

import { GET } from '@/app/api/auth/google/callback/route'

const ORIGIN = 'https://app.test'

function makeRequest(query: Record<string, string> = { code: 'auth-code', state: 'state-token' }): NextRequest {
  const url = new URL('/api/auth/google/callback', ORIGIN)
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
  return new NextRequest(url, { method: 'GET' })
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function location(response: Response): string {
  return response.headers.get('location') ?? ''
}

describe('GET /api/auth/google/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_APP_URL', ORIGIN)
    vi.stubEnv('GOOGLE_CLIENT_ID', 'client-id')
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'client-secret')
    vi.spyOn(console, 'error').mockImplementation(() => {})

    mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 19 })
    mockVerifyOAuthState.mockResolvedValue('/chat')
    mockFindOAuthUserForLogin.mockResolvedValue({ id: 'u1', email: 'a@b.ch' })
    mockSignAccessToken.mockResolvedValue('access-token')
    mockSignRefreshToken.mockResolvedValue('refresh-token')

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const target = String(input)
        if (target.includes('oauth2.googleapis.com/token')) {
          return jsonResponse({ access_token: 'google-access', id_token: 'id', token_type: 'Bearer' })
        }
        return jsonResponse({ sub: 'google-sub', email: 'A@B.ch', email_verified: true })
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('redirects with rate_limited when the IP is over the ceiling', async () => {
    mockCheckRateLimit.mockResolvedValue({ success: false, remaining: 0 })

    const response = await GET(makeRequest())

    expect(response.status).toBe(307)
    expect(location(response)).toBe(`${ORIGIN}/login?error=rate_limited`)
  })

  it('redirects with google_auth_denied when Google reports an error', async () => {
    const response = await GET(makeRequest({ error: 'access_denied' }))

    expect(location(response)).toBe(`${ORIGIN}/login?error=google_auth_denied`)
  })

  it('redirects with missing_code when no code is present', async () => {
    const response = await GET(makeRequest({ state: 'state-token' }))

    expect(location(response)).toBe(`${ORIGIN}/login?error=missing_code`)
  })

  it('redirects with invalid_state when the state does not verify', async () => {
    mockVerifyOAuthState.mockResolvedValue(null)

    const response = await GET(makeRequest())

    expect(location(response)).toBe(`${ORIGIN}/login?error=invalid_state`)
  })

  it('redirects with google_token_exchange_failed when the token endpoint rejects', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('bad request', { status: 400 })))

    const response = await GET(makeRequest())

    expect(location(response)).toBe(`${ORIGIN}/login?error=google_token_exchange_failed`)
  })

  it('redirects with google_userinfo_failed when userinfo rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes('oauth2.googleapis.com/token')) {
          return jsonResponse({ access_token: 'google-access', id_token: 'id', token_type: 'Bearer' })
        }
        return new Response('nope', { status: 401 })
      }),
    )

    const response = await GET(makeRequest())

    expect(location(response)).toBe(`${ORIGIN}/login?error=google_userinfo_failed`)
  })

  it('refuses an unverified Google email', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes('oauth2.googleapis.com/token')) {
          return jsonResponse({ access_token: 'google-access', id_token: 'id', token_type: 'Bearer' })
        }
        return jsonResponse({ sub: 'google-sub', email: 'a@b.ch', email_verified: false })
      }),
    )

    const response = await GET(makeRequest())

    expect(location(response)).toBe(`${ORIGIN}/login?error=google_no_email`)
    expect(mockFindOAuthUserForLogin).not.toHaveBeenCalled()
  })

  it('refuses a userinfo payload without an email', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes('oauth2.googleapis.com/token')) {
          return jsonResponse({ access_token: 'google-access', id_token: 'id', token_type: 'Bearer' })
        }
        return jsonResponse({ sub: 'google-sub', email_verified: true })
      }),
    )

    const response = await GET(makeRequest())

    expect(location(response)).toBe(`${ORIGIN}/login?error=google_no_email`)
  })

  it('redirects with no_account when no local account matches', async () => {
    mockFindOAuthUserForLogin.mockResolvedValue(null)

    const response = await GET(makeRequest())

    expect(location(response)).toBe(`${ORIGIN}/login?error=no_account`)
  })

  it('signs the user in and sets both cookies on the happy path', async () => {
    mockVerifyOAuthState.mockResolvedValue('/settings')

    const response = await GET(makeRequest())

    expect(response.status).toBe(307)
    expect(location(response)).toBe(`${ORIGIN}/settings`)
    expect(mockFindOAuthUserForLogin).toHaveBeenCalledWith('a@b.ch', 'google', 'google-sub')
    expect(response.cookies.get('lw-access-token')?.value).toBe('access-token')
    expect(response.cookies.get('lw-refresh-token')?.value).toBe('refresh-token')
  })

  it('falls back to the request origin when NEXT_PUBLIC_APP_URL is unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    mockFindOAuthUserForLogin.mockResolvedValue(null)

    const response = await GET(makeRequest())

    expect(location(response)).toBe(`${ORIGIN}/login?error=no_account`)
  })

  it('redirects with auth_callback_failed when the token request throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down') }))

    const response = await GET(makeRequest())

    expect(location(response)).toBe(`${ORIGIN}/login?error=auth_callback_failed`)
  })
})
