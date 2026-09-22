import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockCheckRateLimit,
  mockConsumeToken,
  mockRevokeActiveTokens,
  mockSetPasswordForUser,
  mockSignAccessToken,
  mockSignRefreshToken,
} = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn(),
  mockConsumeToken: vi.fn(),
  mockRevokeActiveTokens: vi.fn(),
  mockSetPasswordForUser: vi.fn(),
  mockSignAccessToken: vi.fn(),
  mockSignRefreshToken: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}))

vi.mock('@/db/queries/password-tokens', () => ({
  consumeToken: (...args: unknown[]) => mockConsumeToken(...args),
  revokeActiveTokens: (...args: unknown[]) => mockRevokeActiveTokens(...args),
}))

vi.mock('@/db/queries/users', () => ({
  setPasswordForUser: (...args: unknown[]) => mockSetPasswordForUser(...args),
}))

vi.mock('@/lib/auth/jwt', () => ({
  signAccessToken: (...args: unknown[]) => mockSignAccessToken(...args),
  signRefreshToken: (...args: unknown[]) => mockSignRefreshToken(...args),
}))

import { POST } from '@/app/api/auth/set-password/route'

const GOOD_PASSWORD = 'Newpassword1!'

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/set-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('POST /api/auth/set-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 9 })
    mockConsumeToken.mockResolvedValue({ id: 't1', userId: 'u1', purpose: 'reset' })
    mockSetPasswordForUser.mockResolvedValue({ id: 'u1', email: 'a@b.ch' })
    mockRevokeActiveTokens.mockResolvedValue(1)
    mockSignAccessToken.mockResolvedValue('access-token')
    mockSignRefreshToken.mockResolvedValue('refresh-token')
  })

  it('returns 429 when the IP is rate limited', async () => {
    mockCheckRateLimit.mockResolvedValue({ success: false, remaining: 0 })

    const response = await POST(makeRequest({ token: 'tok', password: GOOD_PASSWORD }))

    expect(response.status).toBe(429)
    expect(mockConsumeToken).not.toHaveBeenCalled()
  })

  it('returns 400 for a body that is not JSON', async () => {
    const response = await POST(makeRequest('not json'))

    expect(response.status).toBe(400)
  })

  it('returns 400 when token or password is missing', async () => {
    expect((await POST(makeRequest({ password: GOOD_PASSWORD }))).status).toBe(400)

    const response = await POST(makeRequest({ token: 'tok' }))
    expect(response.status).toBe(400)
    expect((await response.json()).error).toMatch(/token and password/i)
  })

  it('returns 400 when the password fails the requirements', async () => {
    const response = await POST(makeRequest({ token: 'tok', password: 'short' }))

    expect(response.status).toBe(400)
    expect((await response.json()).error).toMatch(/at least 10 characters/i)
    expect(mockConsumeToken).not.toHaveBeenCalled()
  })

  it('returns 410 when the link is expired or already used', async () => {
    mockConsumeToken.mockResolvedValue(null)

    const response = await POST(makeRequest({ token: 'stale', password: GOOD_PASSWORD }))

    expect(response.status).toBe(410)
    expect((await response.json()).error).toMatch(/expired or already used/i)
    expect(mockSetPasswordForUser).not.toHaveBeenCalled()
  })

  it('returns 400 for a token issued for another purpose', async () => {
    // Defensive branch: today every issued token is set_initial or reset, so an
    // unexpected purpose can only come from a future issuer or a stale row.
    mockConsumeToken.mockResolvedValue({ id: 't1', userId: 'u1', purpose: 'delete_account' })

    const response = await POST(makeRequest({ token: 'tok', password: GOOD_PASSWORD }))

    expect(response.status).toBe(400)
    expect((await response.json()).error).toMatch(/wrong token type/i)
    expect(mockSetPasswordForUser).not.toHaveBeenCalled()
  })

  it('returns 410 when the account disappeared between issue and use', async () => {
    mockSetPasswordForUser.mockResolvedValue(null)

    const response = await POST(makeRequest({ token: 'tok', password: GOOD_PASSWORD }))

    expect(response.status).toBe(410)
    expect((await response.json()).error).toMatch(/no longer exists/i)
    expect(mockRevokeActiveTokens).not.toHaveBeenCalled()
  })

  it('accepts a set_initial token, revokes the other links and signs the user in', async () => {
    mockConsumeToken.mockResolvedValue({ id: 't1', userId: 'u1', purpose: 'set_initial' })

    const response = await POST(makeRequest({ token: 'tok', password: GOOD_PASSWORD }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ user: { id: 'u1', email: 'a@b.ch' } })
    expect(mockSetPasswordForUser).toHaveBeenCalledWith('u1', GOOD_PASSWORD)
    expect(mockRevokeActiveTokens).toHaveBeenCalledWith('u1')
    expect(response.cookies.get('lw-access-token')?.value).toBe('access-token')
    expect(response.cookies.get('lw-refresh-token')?.value).toBe('refresh-token')
  })

  it('accepts a reset token as well', async () => {
    const response = await POST(makeRequest({ token: 'tok', password: GOOD_PASSWORD }))

    expect(response.status).toBe(200)
    expect(mockRevokeActiveTokens).toHaveBeenCalledWith('u1')
  })
})
