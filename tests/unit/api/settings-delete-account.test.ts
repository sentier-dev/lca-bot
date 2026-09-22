import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TEST_USER } from '../../helpers/fixtures'

const {
  mockGetSessionUser,
  mockDeleteUser,
  mockCheckRateLimit,
} = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
  mockDeleteUser: vi.fn(),
  mockCheckRateLimit: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: (...args: unknown[]) => mockGetSessionUser(...args),
}))

vi.mock('@/db/queries/users', () => ({
  deleteUser: (...args: unknown[]) => mockDeleteUser(...args),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}))

import { POST } from '@/app/api/settings/delete-account/route'
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/auth/cookies'

describe('POST /api/settings/delete-account', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 2 })
    mockDeleteUser.mockResolvedValue(true)
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetSessionUser.mockResolvedValue(null)
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited', async () => {
    mockGetSessionUser.mockResolvedValue({ id: TEST_USER.id, email: TEST_USER.email })
    mockCheckRateLimit.mockResolvedValue({ success: false, remaining: 0 })
    const res = await POST()
    expect(res.status).toBe(429)
  })

  it('deletes the user, clears both auth cookies, and returns ok', async () => {
    mockGetSessionUser.mockResolvedValue({ id: TEST_USER.id, email: TEST_USER.email })

    const res = await POST()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(mockDeleteUser).toHaveBeenCalledWith(TEST_USER.id)

    const setCookieHeader = res.headers.getSetCookie()
    const joined = setCookieHeader.join('\n')
    expect(joined).toContain(ACCESS_TOKEN_COOKIE)
    expect(joined).toContain(REFRESH_TOKEN_COOKIE)
    expect(joined).toMatch(/Max-Age=0/i)
  })

  it('returns 500 when deleteUser fails', async () => {
    mockGetSessionUser.mockResolvedValue({ id: TEST_USER.id, email: TEST_USER.email })
    mockDeleteUser.mockResolvedValue(false)

    const res = await POST()
    expect(res.status).toBe(500)
  })
})
