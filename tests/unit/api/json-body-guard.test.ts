import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { TEST_USER } from '../../helpers/fixtures'

const {
  mockCheckRateLimit,
  mockPeekRateLimit,
  mockGetSessionUser,
  mockFindUserByEmail,
  mockVerifyUserPassword,
  mockUpdateUserPassword,
  mockSetPasswordForUser,
  mockIssueToken,
  mockConsumeToken,
  mockRevokeActiveTokens,
  mockSendEmail,
} = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn(),
  mockPeekRateLimit: vi.fn(),
  mockGetSessionUser: vi.fn(),
  mockFindUserByEmail: vi.fn(),
  mockVerifyUserPassword: vi.fn(),
  mockUpdateUserPassword: vi.fn(),
  mockSetPasswordForUser: vi.fn(),
  mockIssueToken: vi.fn(),
  mockConsumeToken: vi.fn(),
  mockRevokeActiveTokens: vi.fn(),
  mockSendEmail: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  peekRateLimit: (...args: unknown[]) => mockPeekRateLimit(...args),
}))

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: (...args: unknown[]) => mockGetSessionUser(...args),
  verifyUserCredentials: vi.fn(),
}))

vi.mock('@/lib/auth/jwt', () => ({
  signAccessToken: vi.fn().mockResolvedValue('access-token'),
  signRefreshToken: vi.fn().mockResolvedValue('refresh-token'),
}))

vi.mock('@/lib/auth/cookies', () => ({
  accessTokenCookie: (token: string) => ({ name: 'lw-access-token', value: token }),
  refreshTokenCookie: (token: string) => ({ name: 'lw-refresh-token', value: token }),
}))

vi.mock('@/db/queries/users', () => ({
  findUserByEmail: (...args: unknown[]) => mockFindUserByEmail(...args),
  verifyUserPassword: (...args: unknown[]) => mockVerifyUserPassword(...args),
  updateUserPassword: (...args: unknown[]) => mockUpdateUserPassword(...args),
  setPasswordForUser: (...args: unknown[]) => mockSetPasswordForUser(...args),
}))

vi.mock('@/db/queries/password-tokens', () => ({
  issueToken: (...args: unknown[]) => mockIssueToken(...args),
  consumeToken: (...args: unknown[]) => mockConsumeToken(...args),
  revokeActiveTokens: (...args: unknown[]) => mockRevokeActiveTokens(...args),
}))

vi.mock('@/lib/email/client', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

import { POST as loginPost } from '@/app/api/auth/login/route'
import { POST as forgotPasswordPost } from '@/app/api/auth/forgot-password/route'
import { POST as setPasswordPost } from '@/app/api/auth/set-password/route'
import { POST as settingsPasswordPost } from '@/app/api/settings/password/route'

const routes: ReadonlyArray<readonly [string, (request: NextRequest) => Promise<Response>]> = [
  ['/api/auth/login', loginPost],
  ['/api/auth/forgot-password', forgotPasswordPost],
  ['/api/auth/set-password', setPasswordPost],
  ['/api/settings/password', settingsPasswordPost],
]

function makeRequest(path: string, raw: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
    body: raw,
  })
}

describe('JSON body guard on every POST route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 9 })
    mockPeekRateLimit.mockResolvedValue({ success: true, remaining: 9 })
    mockGetSessionUser.mockResolvedValue({ id: TEST_USER.id, email: TEST_USER.email })
  })

  for (const [path, handler] of routes) {
    it.each([
      ['the literal null', 'null'],
      ['an array', '[1, 2, 3]'],
      ['unparseable JSON', '{not json'],
    ])(`POST ${path} returns 400 for %s`, async (_label, raw) => {
      const response = await handler(makeRequest(path, raw))

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toMatchObject({ error: 'Invalid JSON body' })
      expect(mockFindUserByEmail).not.toHaveBeenCalled()
      expect(mockConsumeToken).not.toHaveBeenCalled()
      expect(mockVerifyUserPassword).not.toHaveBeenCalled()
    })
  }
})
