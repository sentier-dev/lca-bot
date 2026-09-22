import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockVerifyUserCredentials = vi.fn()
const mockCheckRateLimit = vi.fn()
const mockPeekRateLimit = vi.fn()

vi.mock('@/lib/auth/jwt', () => ({
  signAccessToken: vi.fn().mockResolvedValue('access-token'),
  signRefreshToken: vi.fn().mockResolvedValue('refresh-token'),
}))

vi.mock('@/lib/auth/cookies', () => ({
  accessTokenCookie: (token: string) => ({ name: 'lw-access-token', value: token }),
  refreshTokenCookie: (token: string) => ({ name: 'lw-refresh-token', value: token }),
}))

vi.mock('@/lib/auth/session', () => ({
  verifyUserCredentials: (...args: unknown[]) => mockVerifyUserCredentials(...args),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  peekRateLimit: (...args: unknown[]) => mockPeekRateLimit(...args),
}))

import { POST } from '@/app/api/auth/login/route'

function makeRequest(body: Record<string, unknown>, xForwardedFor = '1.2.3.4'): NextRequest {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': xForwardedFor,
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/login — email-keyed rate limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: IP limit passes, email peek shows slots available.
    mockCheckRateLimit.mockResolvedValue({ success: true })
    mockPeekRateLimit.mockResolvedValue({ success: true, remaining: 5 })
  })

  it('returns 401 without verifying credentials when email limit is exhausted', async () => {
    mockPeekRateLimit.mockResolvedValueOnce({ success: false, remaining: 0 })

    const response = await POST(makeRequest({ email: 'victim@example.com', password: 'correct-horse-battery-staple' }))

    expect(response.status).toBe(401)
    // Critical: the password was NEVER checked — that's the distributed
    // brute-force defense. The attacker cannot distinguish this from a
    // genuine wrong-password response.
    expect(mockVerifyUserCredentials).not.toHaveBeenCalled()
  })

  it('consumes an email slot on wrong password', async () => {
    mockVerifyUserCredentials.mockResolvedValueOnce(null)

    const response = await POST(makeRequest({ email: 'alice@example.com', password: 'wrong' }))

    expect(response.status).toBe(401)
    // Verify the email limiter was hit with the normalized email key.
    expect(mockCheckRateLimit).toHaveBeenCalledWith('alice@example.com', 'auth-login-email')
  })

  it('does NOT consume an email slot on correct password', async () => {
    mockVerifyUserCredentials.mockResolvedValueOnce({ id: 'user-1', email: 'alice@example.com' })

    const response = await POST(makeRequest({ email: 'alice@example.com', password: 'correct' }))

    expect(response.status).toBe(200)
    // Only the IP limiter should have been consumed — legit users never
    // burn an email slot by logging in successfully.
    const emailCalls = mockCheckRateLimit.mock.calls.filter(([, key]) => key === 'auth-login-email')
    expect(emailCalls).toHaveLength(0)
  })

  it('normalizes email before keying so casing/whitespace variants share a bucket', async () => {
    mockVerifyUserCredentials.mockResolvedValueOnce(null)

    await POST(makeRequest({ email: '  ALICE@Example.COM  ', password: 'wrong' }))

    // Peek and checkRateLimit should both have been called with the
    // lowercased, trimmed email — NOT the raw variant.
    expect(mockPeekRateLimit).toHaveBeenCalledWith('alice@example.com', 'auth-login-email')
    expect(mockCheckRateLimit).toHaveBeenCalledWith('alice@example.com', 'auth-login-email')
  })

  it('returns 429 immediately when IP limit is exhausted (email limit never consulted)', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ success: false })

    const response = await POST(makeRequest({ email: 'alice@example.com', password: 'whatever' }))

    expect(response.status).toBe(429)
    expect(mockPeekRateLimit).not.toHaveBeenCalled()
    expect(mockVerifyUserCredentials).not.toHaveBeenCalled()
  })

  it('returns 400 without touching the email limiter when password is missing', async () => {
    const response = await POST(makeRequest({ email: 'alice@example.com' }))

    expect(response.status).toBe(400)
    expect(mockPeekRateLimit).not.toHaveBeenCalled()
    expect(mockVerifyUserCredentials).not.toHaveBeenCalled()
  })
})
