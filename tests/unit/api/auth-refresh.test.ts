import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockCheckRateLimit,
  mockVerifyToken,
  mockSignAccessToken,
  mockSignRefreshToken,
  mockFindUserById,
} = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn(),
  mockVerifyToken: vi.fn(),
  mockSignAccessToken: vi.fn(),
  mockSignRefreshToken: vi.fn(),
  mockFindUserById: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}))

vi.mock('@/lib/auth/jwt', () => ({
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
  signAccessToken: (...args: unknown[]) => mockSignAccessToken(...args),
  signRefreshToken: (...args: unknown[]) => mockSignRefreshToken(...args),
}))

vi.mock('@/lib/auth/session', () => ({
  findUserById: (...args: unknown[]) => mockFindUserById(...args),
}))

import { GET, POST } from '@/app/api/auth/refresh/route'

function makeRequest(refreshToken?: string): NextRequest {
  const request = new NextRequest('http://localhost:3000/api/auth/refresh', { method: 'POST' })
  if (refreshToken !== undefined) request.cookies.set('lw-refresh-token', refreshToken)
  return request
}

function makeGetRequest(opts: { refreshToken?: string; next?: string } = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/auth/refresh')
  if (opts.next !== undefined) url.searchParams.set('next', opts.next)
  const request = new NextRequest(url, { method: 'GET' })
  if (opts.refreshToken !== undefined) request.cookies.set('lw-refresh-token', opts.refreshToken)
  return request
}

describe('POST /api/auth/refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 59 })
    mockVerifyToken.mockResolvedValue({ sub: 'u1', type: 'refresh' })
    mockFindUserById.mockResolvedValue({ id: 'u1', email: 'a@b.ch' })
    mockSignAccessToken.mockResolvedValue('new-access-token')
    mockSignRefreshToken.mockResolvedValue('new-refresh-token')
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 429 when the IP is rate limited', async () => {
    mockCheckRateLimit.mockResolvedValue({ success: false, remaining: 0 })

    const response = await POST(makeRequest('tok'))

    expect(response.status).toBe(429)
    expect(mockVerifyToken).not.toHaveBeenCalled()
  })

  it('returns 401 when the refresh cookie is missing', async () => {
    const response = await POST(makeRequest())

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('No refresh token')
  })

  it('returns 401 when the token does not verify', async () => {
    mockVerifyToken.mockResolvedValue(null)

    const response = await POST(makeRequest('bad'))

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('Invalid refresh token')
  })

  it('refuses an access token laundered as a refresh token', async () => {
    mockVerifyToken.mockResolvedValue({ sub: 'u1', email: 'a@b.ch' })

    const response = await POST(makeRequest('access-token'))

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('Invalid refresh token')
    expect(mockFindUserById).not.toHaveBeenCalled()
  })

  it('returns 401 when the account no longer exists', async () => {
    mockFindUserById.mockResolvedValue(null)

    const response = await POST(makeRequest('tok'))

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('User not found')
  })

  it('mints a fresh cookie pair on the happy path', async () => {
    const response = await POST(makeRequest('tok'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ user: { id: 'u1', email: 'a@b.ch' } })
    expect(mockSignAccessToken).toHaveBeenCalledWith('u1', 'a@b.ch')
    expect(mockSignRefreshToken).toHaveBeenCalledWith('u1')
    expect(response.cookies.get('lw-access-token')?.value).toBe('new-access-token')
    expect(response.cookies.get('lw-refresh-token')?.value).toBe('new-refresh-token')
  })

  it('returns 500 when a dependency throws', async () => {
    mockFindUserById.mockRejectedValue(new Error('db down'))

    const response = await POST(makeRequest('tok'))

    expect(response.status).toBe(500)
    expect((await response.json()).error).toBe('Internal server error')
  })
})

describe('GET /api/auth/refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 59 })
    mockVerifyToken.mockResolvedValue({ sub: 'u1', type: 'refresh' })
    mockFindUserById.mockResolvedValue({ id: 'u1', email: 'a@b.ch' })
    mockSignAccessToken.mockResolvedValue('new-access-token')
    mockSignRefreshToken.mockResolvedValue('new-refresh-token')
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 429 when the IP is rate limited', async () => {
    mockCheckRateLimit.mockResolvedValue({ success: false, remaining: 0 })

    const response = await GET(makeGetRequest({ refreshToken: 'tok', next: '/chat' }))

    expect(response.status).toBe(429)
    expect(mockVerifyToken).not.toHaveBeenCalled()
  })

  it('sets fresh cookies and redirects to next on the happy path', async () => {
    const response = await GET(makeGetRequest({ refreshToken: 'tok', next: '/chat/abc' }))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/chat/abc')
    expect(response.cookies.get('lw-access-token')?.value).toBe('new-access-token')
    expect(response.cookies.get('lw-refresh-token')?.value).toBe('new-refresh-token')
  })

  it('defaults to /chat when next is missing', async () => {
    const response = await GET(makeGetRequest({ refreshToken: 'tok' }))

    expect(response.headers.get('location')).toBe('http://localhost:3000/chat')
  })

  it('falls back to /chat when next is not a safe internal path', async () => {
    const response = await GET(makeGetRequest({ refreshToken: 'tok', next: 'https://evil.example/' }))

    expect(response.headers.get('location')).toBe('http://localhost:3000/chat')
  })

  it('clears both cookies and redirects to login with redirectedFrom=next when the refresh cookie is missing', async () => {
    const response = await GET(makeGetRequest({ next: '/settings' }))

    expect(response.status).toBe(307)
    const location = response.headers.get('location')!
    expect(location).toBe('http://localhost:3000/login?redirectedFrom=%2Fsettings')
    expect(response.cookies.get('lw-access-token')?.value).toBe('')
    expect(response.cookies.get('lw-refresh-token')?.value).toBe('')
  })

  it('clears cookies and redirects to login when the refresh token does not verify', async () => {
    mockVerifyToken.mockResolvedValue(null)

    const response = await GET(makeGetRequest({ refreshToken: 'bad', next: '/chat' }))

    expect(response.headers.get('location')).toBe('http://localhost:3000/login?redirectedFrom=%2Fchat')
    expect(response.cookies.get('lw-access-token')?.value).toBe('')
    expect(response.cookies.get('lw-refresh-token')?.value).toBe('')
  })

  it('clears cookies and redirects to login when the account no longer exists', async () => {
    mockFindUserById.mockResolvedValue(null)

    const response = await GET(makeGetRequest({ refreshToken: 'tok', next: '/chat' }))

    expect(response.headers.get('location')).toBe('http://localhost:3000/login?redirectedFrom=%2Fchat')
  })

  it('redirects to login on an unexpected error instead of throwing', async () => {
    mockFindUserById.mockRejectedValue(new Error('db down'))

    const response = await GET(makeGetRequest({ refreshToken: 'tok', next: '/chat' }))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/login?redirectedFrom=%2Fchat')
  })
})
