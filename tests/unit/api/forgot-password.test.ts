import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockCheckRateLimit,
  mockFindUserByEmail,
  mockIssueToken,
  mockSendEmail,
} = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn(),
  mockFindUserByEmail: vi.fn(),
  mockIssueToken: vi.fn(),
  mockSendEmail: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}))

vi.mock('@/db/queries/users', () => ({
  findUserByEmail: (...args: unknown[]) => mockFindUserByEmail(...args),
}))

vi.mock('@/db/queries/password-tokens', () => ({
  issueToken: (...args: unknown[]) => mockIssueToken(...args),
}))

vi.mock('@/lib/email/client', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

import { POST } from '@/app/api/auth/forgot-password/route'

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const EXISTING_USER = {
  id: 'u1',
  email: 'a@b.ch',
  passwordHash: 'hash',
  provider: 'email',
  providerId: null,
}

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.test')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 4 })
    mockFindUserByEmail.mockResolvedValue(EXISTING_USER)
    mockIssueToken.mockResolvedValue({ secret: 'token-secret', id: 't1' })
    mockSendEmail.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('returns 429 when the IP is rate limited', async () => {
    mockCheckRateLimit.mockResolvedValue({ success: false, remaining: 0 })

    const response = await POST(makeRequest({ email: 'a@b.ch' }))

    expect(response.status).toBe(429)
    expect(mockFindUserByEmail).not.toHaveBeenCalled()
  })

  it('returns 400 for a body that is not JSON', async () => {
    const response = await POST(makeRequest('not json'))

    expect(response.status).toBe(400)
  })

  it('returns 400 when email is missing or not an email', async () => {
    expect((await POST(makeRequest({}))).status).toBe(400)
    expect((await POST(makeRequest({ email: 42 }))).status).toBe(400)

    const response = await POST(makeRequest({ email: 'nope' }))
    expect(response.status).toBe(400)
    expect((await response.json()).error).toMatch(/valid email/i)
  })

  it('stays silent about an unknown email', async () => {
    mockFindUserByEmail.mockResolvedValue(null)

    const response = await POST(makeRequest({ email: 'ghost@b.ch' }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(mockIssueToken).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('issues a reset token and mails the reset link for an account with a password', async () => {
    const response = await POST(makeRequest({ email: '  A@B.ch  ' }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(mockFindUserByEmail).toHaveBeenCalledWith('a@b.ch')
    expect(mockIssueToken).toHaveBeenCalledWith('u1', 'reset')
    const message = mockSendEmail.mock.calls[0][0]
    expect(message.to).toBe('a@b.ch')
    expect(message.subject).toMatch(/reset/i)
    expect(message.text).toContain('https://app.test/set-password?token=token-secret')
  })

  it('issues a set_initial token for a passwordless account', async () => {
    mockFindUserByEmail.mockResolvedValue({ ...EXISTING_USER, passwordHash: null, provider: 'google' })

    const response = await POST(makeRequest({ email: 'a@b.ch' }))

    expect(response.status).toBe(200)
    expect(mockIssueToken).toHaveBeenCalledWith('u1', 'set_initial')
    const message = mockSendEmail.mock.calls[0][0]
    expect(message.subject).toMatch(/finish setting up/i)
    expect(message.text).toContain('/set-password?token=token-secret')
  })

  it('trims a trailing slash off the configured base url', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.test/')

    await POST(makeRequest({ email: 'a@b.ch' }))

    expect(mockSendEmail.mock.calls[0][0].text).toContain('https://app.test/set-password?token=')
  })

  it('falls back to a relative link when NEXT_PUBLIC_APP_URL is empty', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')

    await POST(makeRequest({ email: 'a@b.ch' }))

    expect(mockSendEmail.mock.calls[0][0].text).toContain('/set-password?token=token-secret')
  })

  it('falls back to a relative link when NEXT_PUBLIC_APP_URL is absent', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', undefined)

    await POST(makeRequest({ email: 'a@b.ch' }))

    expect(mockSendEmail.mock.calls[0][0].text).toContain('/set-password?token=token-secret')
  })

  it('still returns 200 when sending the email throws', async () => {
    mockSendEmail.mockRejectedValue(new Error('resend down'))

    const response = await POST(makeRequest({ email: 'a@b.ch' }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })
})
