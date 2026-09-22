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

function makeRawRequest(body: string): NextRequest {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
    body,
  })
}

describe('POST /api/auth/login body shape guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRateLimit.mockResolvedValue({ success: true })
    mockPeekRateLimit.mockResolvedValue({ success: true, remaining: 5 })
  })

  it.each([
    ['null', 'null'],
    ['a number', '42'],
    ['a string', '"hello"'],
  ])('returns 400 when the body parses to %s', async (_label, raw) => {
    const response = await POST(makeRawRequest(raw))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ error: 'Invalid JSON body' })
    expect(mockPeekRateLimit).not.toHaveBeenCalled()
    expect(mockVerifyUserCredentials).not.toHaveBeenCalled()
  })

  it('returns 400 on unparseable JSON', async () => {
    const response = await POST(makeRawRequest('{not json'))

    expect(response.status).toBe(400)
    expect(mockVerifyUserCredentials).not.toHaveBeenCalled()
  })
})
