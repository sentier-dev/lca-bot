import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  accessTokenCookie,
  refreshTokenCookie,
  clearAuthCookies,
} from '@/lib/auth/cookies'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('auth cookie names', () => {
  it('uses the lw- prefixed names', () => {
    expect(ACCESS_TOKEN_COOKIE).toBe('lw-access-token')
    expect(REFRESH_TOKEN_COOKIE).toBe('lw-refresh-token')
  })
})

describe('accessTokenCookie', () => {
  it('carries the token with a one hour lifetime and hardened options', () => {
    const cookie = accessTokenCookie('access-value')

    expect(cookie).toMatchObject({
      name: 'lw-access-token',
      value: 'access-value',
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 3600,
    })
    // NODE_ENV is "test" under vitest, so the secure flag stays off.
    expect(cookie.secure).toBe(false)
  })
})

describe('refreshTokenCookie', () => {
  it('carries the token with a seven day lifetime', () => {
    const cookie = refreshTokenCookie('refresh-value')

    expect(cookie).toMatchObject({
      name: 'lw-refresh-token',
      value: 'refresh-value',
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 604800,
    })
  })
})

describe('clearAuthCookies', () => {
  it('returns both cookies emptied with maxAge 0', () => {
    const cookies = clearAuthCookies()

    expect(cookies).toHaveLength(2)
    expect(cookies.map((c) => c.name)).toEqual(['lw-access-token', 'lw-refresh-token'])
    for (const cookie of cookies) {
      expect(cookie.value).toBe('')
      expect(cookie.maxAge).toBe(0)
      expect(cookie.httpOnly).toBe(true)
      expect(cookie.path).toBe('/')
    }
  })
})

describe('production hardening', () => {
  it('sets secure on every cookie when NODE_ENV is production', async () => {
    vi.resetModules()
    vi.stubEnv('NODE_ENV', 'production')
    const mod = await import('@/lib/auth/cookies')

    expect(mod.accessTokenCookie('a').secure).toBe(true)
    expect(mod.refreshTokenCookie('r').secure).toBe(true)
    expect(mod.clearAuthCookies().every((c) => c.secure)).toBe(true)
  })
})
