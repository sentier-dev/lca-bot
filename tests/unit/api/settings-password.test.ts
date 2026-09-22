import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { TEST_USER } from '../../helpers/fixtures'

const {
  mockGetSessionUser,
  mockVerifyUserPassword,
  mockUpdateUserPassword,
  mockCheckRateLimit,
} = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
  mockVerifyUserPassword: vi.fn(),
  mockUpdateUserPassword: vi.fn(),
  mockCheckRateLimit: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: (...args: unknown[]) => mockGetSessionUser(...args),
}))

vi.mock('@/db/queries/users', () => ({
  verifyUserPassword: (...args: unknown[]) => mockVerifyUserPassword(...args),
  updateUserPassword: (...args: unknown[]) => mockUpdateUserPassword(...args),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}))

import { POST } from '@/app/api/settings/password/route'

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/settings/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('POST /api/settings/password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 9 })
    mockVerifyUserPassword.mockResolvedValue(true)
    mockUpdateUserPassword.mockResolvedValue(true)
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetSessionUser.mockResolvedValue(null)
    const res = await POST(makeRequest({ currentPassword: 'old', newPassword: 'Newpassword1!' }))
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited', async () => {
    mockGetSessionUser.mockResolvedValue({ id: TEST_USER.id, email: TEST_USER.email })
    mockCheckRateLimit.mockResolvedValue({ success: false, remaining: 0 })
    const res = await POST(makeRequest({ currentPassword: 'old', newPassword: 'Newpassword1!' }))
    expect(res.status).toBe(429)
  })

  it('returns 400 for invalid JSON body', async () => {
    mockGetSessionUser.mockResolvedValue({ id: TEST_USER.id, email: TEST_USER.email })
    const res = await POST(makeRequest('not json'))
    expect(res.status).toBe(400)
  })

  it('returns 400 when currentPassword is missing', async () => {
    mockGetSessionUser.mockResolvedValue({ id: TEST_USER.id, email: TEST_USER.email })
    const res = await POST(makeRequest({ newPassword: 'Newpassword1!' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when newPassword is missing', async () => {
    mockGetSessionUser.mockResolvedValue({ id: TEST_USER.id, email: TEST_USER.email })
    const res = await POST(makeRequest({ currentPassword: 'old' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when newPassword does not meet requirements', async () => {
    mockGetSessionUser.mockResolvedValue({ id: TEST_USER.id, email: TEST_USER.email })
    const res = await POST(makeRequest({ currentPassword: 'old', newPassword: 'short' }))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toMatch(/at least 10/i)
  })

  it('returns 403 when current password is incorrect', async () => {
    mockGetSessionUser.mockResolvedValue({ id: TEST_USER.id, email: TEST_USER.email })
    mockVerifyUserPassword.mockResolvedValue(false)
    const res = await POST(makeRequest({ currentPassword: 'wrong', newPassword: 'Newpassword1!' }))
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body.error).toMatch(/current password/i)
  })

  it('returns 500 when updateUserPassword fails', async () => {
    mockGetSessionUser.mockResolvedValue({ id: TEST_USER.id, email: TEST_USER.email })
    mockUpdateUserPassword.mockResolvedValue(false)
    const res = await POST(makeRequest({ currentPassword: 'old', newPassword: 'Newpassword1!' }))
    expect(res.status).toBe(500)
  })

  it('returns 200 on successful password change', async () => {
    mockGetSessionUser.mockResolvedValue({ id: TEST_USER.id, email: TEST_USER.email })
    const res = await POST(makeRequest({ currentPassword: 'old', newPassword: 'Newpassword1!' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(mockUpdateUserPassword).toHaveBeenCalledWith(TEST_USER.id, 'Newpassword1!')
  })
})
