import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockVerifyToken = vi.fn()

vi.mock('@/lib/auth/jwt', () => ({
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}))

vi.mock('@/lib/auth/cookies', () => ({
  ACCESS_TOKEN_COOKIE: 'lw-access-token',
  REFRESH_TOKEN_COOKIE: 'lw-refresh-token',
}))

import { updateSession } from '@/lib/auth/middleware'

function makeRequest(url: string, accessToken?: string, refreshToken?: string) {
  const req = new NextRequest(url)
  if (accessToken) req.cookies.set('lw-access-token', accessToken)
  if (refreshToken) req.cookies.set('lw-refresh-token', refreshToken)
  return req
}

/** verifyToken stub that only recognises a given refresh token value; anything else (missing, expired access token, garbage) reads as invalid. */
function verifiesOnlyRefreshToken(refreshTokenValue: string) {
  return async (token: string) => (token === refreshTokenValue ? { sub: 'u1', type: 'refresh' } : null)
}

describe('updateSession middleware', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each(['/chat', '/chat/abc', '/archive', '/settings'])('redirects an anonymous visitor from %s to /login', async (path) => {
    mockVerifyToken.mockResolvedValue(null)
    const response = await updateSession(makeRequest(`http://localhost:3000${path}`))
    expect(response.status).toBe(307)
    const location = response.headers.get('location')!
    expect(location).toContain('/login')
    expect(location).toContain(`redirectedFrom=${encodeURIComponent(path)}`)
  })

  it('lets an authenticated user through to /chat', async () => {
    mockVerifyToken.mockResolvedValue({ sub: 'u1', email: 'a@b.ch' })
    const response = await updateSession(makeRequest('http://localhost:3000/chat', 'tok'))
    expect(response.status).toBe(200)
  })

  it('sends an authenticated user away from /login to /chat', async () => {
    mockVerifyToken.mockResolvedValue({ sub: 'u1', email: 'a@b.ch' })
    const response = await updateSession(makeRequest('http://localhost:3000/login', 'tok'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/chat')
  })

  it('lets an anonymous visitor reach /login', async () => {
    mockVerifyToken.mockResolvedValue(null)
    const response = await updateSession(makeRequest('http://localhost:3000/login'))
    expect(response.status).toBe(200)
  })

  it('bounces an expired access token with a valid refresh cookie through /api/auth/refresh', async () => {
    mockVerifyToken.mockImplementation(verifiesOnlyRefreshToken('refresh-tok'))
    const response = await updateSession(makeRequest('http://localhost:3000/chat', 'expired-tok', 'refresh-tok'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/api/auth/refresh?next=%2Fchat')
  })

  it('preserves the query string of the protected route in next=', async () => {
    mockVerifyToken.mockImplementation(verifiesOnlyRefreshToken('refresh-tok'))
    const response = await updateSession(makeRequest('http://localhost:3000/chat/abc?x=1', 'expired-tok', 'refresh-tok'))
    expect(response.headers.get('location')).toBe('http://localhost:3000/api/auth/refresh?next=%2Fchat%2Fabc%3Fx%3D1')
  })

  it('bounces a returning visitor with a live refresh cookie away from /login through /api/auth/refresh', async () => {
    mockVerifyToken.mockImplementation(verifiesOnlyRefreshToken('refresh-tok'))
    const response = await updateSession(makeRequest('http://localhost:3000/login', undefined, 'refresh-tok'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/api/auth/refresh?next=%2Flogin')
  })

  it('falls back to the ordinary /login redirect when the refresh cookie does not verify either', async () => {
    mockVerifyToken.mockResolvedValue(null)
    const response = await updateSession(makeRequest('http://localhost:3000/chat', undefined, 'bad-refresh'))
    expect(response.status).toBe(307)
    const location = response.headers.get('location')!
    expect(location).toContain('/login')
    expect(location).toContain('redirectedFrom=%2Fchat')
  })

  it('falls back to /login (no refresh bounce) when there is no refresh cookie at all', async () => {
    mockVerifyToken.mockResolvedValue(null)
    const response = await updateSession(makeRequest('http://localhost:3000/settings'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/login')
  })
})
