import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { testSql, createTestUser } from '../helpers/seed'

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('@/lib/auth/oauth-state', () => ({
  verifyOAuthState: vi.fn().mockResolvedValue('/chat'),
}))

function stubGoogleFetch(userinfo: Record<string, unknown>) {
  return vi.fn(async (url: RequestInfo | URL) => {
    if (String(url).includes('oauth2.googleapis.com/token')) {
      return new Response(JSON.stringify({ access_token: 'ga', id_token: 'gi', token_type: 'Bearer' }), { status: 200 })
    }
    return new Response(JSON.stringify(userinfo), { status: 200 })
  })
}

const originalFetch = global.fetch
const { GET } = await import('@/app/api/auth/google/callback/route')

const callbackRequest = () => new NextRequest('http://localhost:3000/api/auth/google/callback?code=abc&state=xyz')

describe('GET /api/auth/google/callback (existing accounts only)', () => {
  beforeEach(() => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'web-client-id')
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'web-client-secret')
  })
  afterAll(() => {
    global.fetch = originalFetch
    vi.unstubAllEnvs()
  })

  it('refuses an unverified Google email', async () => {
    const email = `unverified-${Date.now()}@notgmail.test`
    global.fetch = stubGoogleFetch({ sub: 's1', email, email_verified: false }) as typeof fetch
    const response = await GET(callbackRequest())
    expect(response.headers.get('location')).toContain('error=google_no_email')
    expect(await testSql`SELECT id FROM auth.users WHERE email = ${email}`).toHaveLength(0)
  })

  it('refuses a verified email with no account and creates nothing', async () => {
    const email = `stranger-${Date.now()}@gmail.test`
    global.fetch = stubGoogleFetch({ sub: 's2', email, email_verified: true }) as typeof fetch
    const response = await GET(callbackRequest())
    expect(response.headers.get('location')).toContain('/login?error=no_account')
    expect(response.headers.getSetCookie().find((c) => c.includes('lw-access-token'))).toBeUndefined()
    expect(await testSql`SELECT id FROM auth.users WHERE email = ${email}`).toHaveLength(0)
  })

  it('signs an existing account in and links the Google subject', async () => {
    const user = await createTestUser()
    const sub = `g-${Date.now()}`
    global.fetch = stubGoogleFetch({ sub, email: user.email, email_verified: true }) as typeof fetch
    const response = await GET(callbackRequest())
    expect(response.headers.get('location')).toBe('http://localhost:3000/chat')
    expect(response.headers.getSetCookie().find((c) => c.includes('lw-access-token'))).toBeDefined()
    const [row] = await testSql`SELECT provider, provider_id FROM auth.users WHERE id = ${user.id}`
    expect(row.provider).toBe('google')
    expect(row.provider_id).toBe(sub)
  })
})
