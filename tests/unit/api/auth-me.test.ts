import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetSessionUser, mockGetUserWithProvider } = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
  mockGetUserWithProvider: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: (...args: unknown[]) => mockGetSessionUser(...args),
}))

vi.mock('@/db/queries/users', () => ({
  getUserWithProvider: (...args: unknown[]) => mockGetUserWithProvider(...args),
}))

import { GET } from '@/app/api/auth/me/route'

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 with a null user when there is no session', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ user: null })
    expect(mockGetUserWithProvider).not.toHaveBeenCalled()
  })

  it('returns 401 when the session points at a deleted account', async () => {
    mockGetSessionUser.mockResolvedValue({ id: 'u1', email: 'a@b.ch' })
    mockGetUserWithProvider.mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ user: null })
    expect(mockGetUserWithProvider).toHaveBeenCalledWith('u1')
  })

  it('returns the account with its provider and password flag', async () => {
    mockGetSessionUser.mockResolvedValue({ id: 'u1', email: 'a@b.ch' })
    mockGetUserWithProvider.mockResolvedValue({
      id: 'u1',
      email: 'a@b.ch',
      provider: 'google',
      hasPassword: false,
    })

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      user: { id: 'u1', email: 'a@b.ch', provider: 'google', hasPassword: false },
    })
  })
})
