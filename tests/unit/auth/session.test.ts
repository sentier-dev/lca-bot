import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockCookieStore, mockVerifyToken } = vi.hoisted(() => ({
  mockCookieStore: { get: vi.fn(), set: vi.fn() },
  mockVerifyToken: vi.fn(),
}))

vi.mock('@/db/queries/users', () => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  verifyCredentials: vi.fn(),
  findUserByProviderSubject: vi.fn(),
  linkOAuthProvider: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
  cookies: vi.fn(async () => mockCookieStore),
}))

vi.mock('@/lib/auth/jwt', () => ({
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}))

import {
  getSessionUser,
  findOAuthUserForLogin,
  findUserById,
  verifyUserCredentials,
} from '@/lib/auth/session'
import * as userQueries from '@/db/queries/users'

describe('auth session', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCookieStore.get.mockReturnValue(undefined)
    mockVerifyToken.mockResolvedValue(null)
  })

  it('getSessionUser returns null without a cookie', async () => {
    expect(await getSessionUser()).toBeNull()
    expect(mockVerifyToken).not.toHaveBeenCalled()
  })

  it('getSessionUser returns null when the token does not verify', async () => {
    mockCookieStore.get.mockReturnValue({ value: 'bad-token' })

    expect(await getSessionUser()).toBeNull()
    expect(mockVerifyToken).toHaveBeenCalledWith('bad-token')
  })

  it('getSessionUser returns null for a payload without sub or email', async () => {
    mockCookieStore.get.mockReturnValue({ value: 'tok' })

    mockVerifyToken.mockResolvedValue({ email: 'a@b.ch' })
    expect(await getSessionUser()).toBeNull()

    mockVerifyToken.mockResolvedValue({ sub: 'u1' })
    expect(await getSessionUser()).toBeNull()
  })

  it('getSessionUser refuses a refresh token used as an access token', async () => {
    mockCookieStore.get.mockReturnValue({ value: 'refresh-tok' })
    mockVerifyToken.mockResolvedValue({ sub: 'u1', email: 'a@b.ch', type: 'refresh' })

    expect(await getSessionUser()).toBeNull()
  })

  it('getSessionUser returns the user for a valid access token', async () => {
    mockCookieStore.get.mockReturnValue({ value: 'good-tok' })
    mockVerifyToken.mockResolvedValue({ sub: 'u1', email: 'a@b.ch', role: 'authenticated' })

    expect(await getSessionUser()).toEqual({ id: 'u1', email: 'a@b.ch' })
    expect(mockCookieStore.get).toHaveBeenCalledWith('lw-access-token')
  })

  it('verifyUserCredentials delegates to the users query', async () => {
    vi.mocked(userQueries.verifyCredentials).mockResolvedValue({ id: 'u1', email: 'a@b.ch' })

    expect(await verifyUserCredentials('a@b.ch', 'secret')).toEqual({ id: 'u1', email: 'a@b.ch' })
    expect(userQueries.verifyCredentials).toHaveBeenCalledWith('a@b.ch', 'secret')
  })

  it('findUserById delegates to the users query', async () => {
    vi.mocked(userQueries.findUserById).mockResolvedValue({ id: 'u1', email: 'a@b.ch' })

    expect(await findUserById('u1')).toEqual({ id: 'u1', email: 'a@b.ch' })
    expect(userQueries.findUserById).toHaveBeenCalledWith('u1')
  })

  it('findOAuthUserForLogin matches by subject first', async () => {
    vi.mocked(userQueries.findUserByProviderSubject).mockResolvedValue({ id: 'u1', email: 'a@b.ch' })
    const user = await findOAuthUserForLogin('a@b.ch', 'google', 'sub-1')
    expect(user).toEqual({ id: 'u1', email: 'a@b.ch' })
    expect(userQueries.findUserByEmail).not.toHaveBeenCalled()
  })

  it('findOAuthUserForLogin links the subject onto an existing email account', async () => {
    vi.mocked(userQueries.findUserByProviderSubject).mockResolvedValue(null as never)
    vi.mocked(userQueries.findUserByEmail).mockResolvedValue({
      id: 'u1', email: 'a@b.ch', passwordHash: 'h', provider: 'email', providerId: null, createdAt: new Date(), updatedAt: new Date(),
    })
    vi.mocked(userQueries.linkOAuthProvider).mockResolvedValue(true)
    const user = await findOAuthUserForLogin('a@b.ch', 'google', 'sub-1')
    expect(user).toEqual({ id: 'u1', email: 'a@b.ch' })
    expect(userQueries.linkOAuthProvider).toHaveBeenCalledWith('u1', 'google', 'sub-1')
  })

  it('findOAuthUserForLogin warns when the account is bound to another subject', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.mocked(userQueries.findUserByProviderSubject).mockResolvedValue(null as never)
    vi.mocked(userQueries.findUserByEmail).mockResolvedValue({
      id: 'u1', email: 'a@b.ch', passwordHash: 'h', provider: 'google', providerId: 'other-sub', createdAt: new Date(), updatedAt: new Date(),
    })
    vi.mocked(userQueries.linkOAuthProvider).mockResolvedValue(false)

    const user = await findOAuthUserForLogin('a@b.ch', 'google', 'sub-1')

    expect(user).toEqual({ id: 'u1', email: 'a@b.ch' })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('already bound to other-sub'))
    warn.mockRestore()
  })

  it('findOAuthUserForLogin stays quiet when the link failed but the subject already matches', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.mocked(userQueries.findUserByProviderSubject).mockResolvedValue(null as never)
    vi.mocked(userQueries.findUserByEmail).mockResolvedValue({
      id: 'u1', email: 'a@b.ch', passwordHash: null, provider: 'google', providerId: 'sub-1', createdAt: new Date(), updatedAt: new Date(),
    })
    vi.mocked(userQueries.linkOAuthProvider).mockResolvedValue(false)

    expect(await findOAuthUserForLogin('a@b.ch', 'google', 'sub-1')).toEqual({ id: 'u1', email: 'a@b.ch' })
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('findOAuthUserForLogin never creates an account', async () => {
    vi.mocked(userQueries.findUserByProviderSubject).mockResolvedValue(null as never)
    vi.mocked(userQueries.findUserByEmail).mockResolvedValue(null as never)
    expect(await findOAuthUserForLogin('nobody@b.ch', 'google', 'sub-9')).toBeNull()
    expect('createOAuthUser' in userQueries).toBe(false)
  })
})
