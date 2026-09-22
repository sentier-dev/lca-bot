import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const ORIGINAL_CLIENT_ID = process.env.GOOGLE_CLIENT_ID

vi.mock('@/lib/auth/oauth-state', () => ({
  createOAuthState: vi.fn().mockResolvedValue('stub-state-token'),
}))

function makeRequest(url = 'http://localhost/api/auth/google'): NextRequest {
  return new NextRequest(url, { method: 'GET' })
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  if (ORIGINAL_CLIENT_ID === undefined) {
    delete process.env.GOOGLE_CLIENT_ID
  } else {
    process.env.GOOGLE_CLIENT_ID = ORIGINAL_CLIENT_ID
  }
})

describe('GET /api/auth/google', () => {
  it('returns 500 with "Google OAuth not configured" when GOOGLE_CLIENT_ID is empty', async () => {
    process.env.GOOGLE_CLIENT_ID = ''
    const { GET } = await import('@/app/api/auth/google/route')

    const response = await GET(makeRequest())

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Google OAuth not configured')
  })

  it('returns 500 with "Google OAuth not configured" when GOOGLE_CLIENT_ID is missing entirely', async () => {
    delete process.env.GOOGLE_CLIENT_ID
    const { GET } = await import('@/app/api/auth/google/route')

    const response = await GET(makeRequest())

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Google OAuth not configured')
  })

  it('redirects to Google consent screen when GOOGLE_CLIENT_ID is set', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
    const { GET } = await import('@/app/api/auth/google/route')

    const response = await GET(makeRequest())

    expect(response.status).toBe(307)
    const location = response.headers.get('location') ?? ''
    expect(location).toContain('https://accounts.google.com/o/oauth2/v2/auth')
    expect(location).toContain('client_id=test-client-id.apps.googleusercontent.com')
    expect(location).toContain('response_type=code')
    expect(location).toContain('state=stub-state-token')
  })
})
