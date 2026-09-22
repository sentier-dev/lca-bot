import { describe, it, expect, vi } from 'vitest'
import { createTestUser } from '../helpers/seed'
import { makeRequest } from '../helpers/auth'

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
}))

const mockCookieStore = { get: vi.fn() }
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}))

const { GET, POST } = await import('@/app/api/auth/refresh/route')

describe('POST /api/auth/refresh', () => {
  it('issues new tokens from a valid refresh token', async () => {
    const user = await createTestUser()

    const request = makeRequest('/api/auth/refresh', {
      method: 'POST',
      refreshToken: user.refreshToken,
      accessToken: user.accessToken,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.user).toBeDefined()
    expect(data.user.id).toBe(user.id)
    expect(data.user.email).toBe(user.email)

    const setCookies = response.headers.getSetCookie()
    const accessCookie = setCookies.find((c: string) => c.includes('lw-access-token'))
    const refreshCookie = setCookies.find((c: string) => c.includes('lw-refresh-token'))
    expect(accessCookie).toBeDefined()
    expect(refreshCookie).toBeDefined()
  })

  it('returns 401 when refresh token is missing', async () => {
    const request = makeRequest('/api/auth/refresh', {
      method: 'POST',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toContain('refresh token')
  })

  it('rejects an access token presented in the refresh cookie', async () => {
    const user = await createTestUser()

    const request = makeRequest('/api/auth/refresh', {
      method: 'POST',
      refreshToken: user.accessToken, // laundering attempt: access token in the refresh slot
      accessToken: user.accessToken,
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('returns 401 when refresh token is invalid', async () => {
    const request = makeRequest('/api/auth/refresh', {
      method: 'POST',
      refreshToken: 'invalid-token-value',
      accessToken: 'fake-access',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBeDefined()
  })
})

describe('GET /api/auth/refresh', () => {
  it('sets fresh cookies and redirects to next for a valid refresh cookie', async () => {
    const user = await createTestUser()

    const request = makeRequest('/api/auth/refresh?next=%2Fchat%2Fabc', {
      method: 'GET',
      accessToken: 'unused', // the request helper only attaches cookies when this is set
      refreshToken: user.refreshToken,
    })

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/chat/abc')
    const setCookies = response.headers.getSetCookie()
    expect(setCookies.some((c) => c.startsWith('lw-access-token='))).toBe(true)
    expect(setCookies.some((c) => c.startsWith('lw-refresh-token='))).toBe(true)
  })

  it('falls back to /chat when next is not a safe internal path', async () => {
    const user = await createTestUser()

    const request = makeRequest(`/api/auth/refresh?next=${encodeURIComponent('https://evil.example')}`, {
      method: 'GET',
      accessToken: 'unused',
      refreshToken: user.refreshToken,
    })

    const response = await GET(request)

    expect(response.headers.get('location')).toBe('http://localhost:3000/chat')
  })

  it('clears both cookies and redirects to login with redirectedFrom=next when the refresh cookie is invalid', async () => {
    const request = makeRequest('/api/auth/refresh?next=%2Fchat', {
      method: 'GET',
      accessToken: 'unused',
      refreshToken: 'invalid-token-value',
    })

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/login?redirectedFrom=%2Fchat')
    const setCookies = response.headers.getSetCookie()
    const accessCookie = setCookies.find((c) => c.startsWith('lw-access-token='))
    const refreshCookie = setCookies.find((c) => c.startsWith('lw-refresh-token='))
    expect(accessCookie).toContain('lw-access-token=;')
    expect(refreshCookie).toContain('lw-refresh-token=;')
  })
})
