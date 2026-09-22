import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockCookieStore } = vi.hoisted(() => ({
  mockCookieStore: { get: vi.fn(), set: vi.fn() },
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}))

import { createOAuthState, verifyOAuthState } from '@/lib/auth/oauth-state'

const NONCE = 'nonce-123'

function encodeState(next: unknown): string {
  return Buffer.from(JSON.stringify({ nonce: NONCE, next })).toString('base64url')
}

describe('verifyOAuthState — next path validation', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset()
    mockCookieStore.set.mockReset()
    mockCookieStore.get.mockReturnValue({ value: NONCE })
  })

  it('returns a safe same-origin next path', async () => {
    await expect(verifyOAuthState(encodeState('/project/abc/chat'))).resolves.toBe(
      '/project/abc/chat',
    )
  })

  it('falls back to /chat for protocol-relative and backslash variants', async () => {
    await expect(verifyOAuthState(encodeState('//evil.example.com'))).resolves.toBe('/chat')
    await expect(verifyOAuthState(encodeState('/\\evil.example.com'))).resolves.toBe('/chat')
    await expect(verifyOAuthState(encodeState('/\t/evil.example.com'))).resolves.toBe('/chat')
  })

  it('falls back to /chat for API-route targets', async () => {
    await expect(verifyOAuthState(encodeState('/api/auth/google'))).resolves.toBe('/chat')
  })

  it('falls back to /chat for non-string next values', async () => {
    await expect(verifyOAuthState(encodeState(null))).resolves.toBe('/chat')
    await expect(verifyOAuthState(encodeState(42))).resolves.toBe('/chat')
  })

  it('rejects a nonce mismatch outright', async () => {
    mockCookieStore.get.mockReturnValue({ value: 'other-nonce' })
    await expect(verifyOAuthState(encodeState('/chat'))).resolves.toBeNull()
  })
})

describe('createOAuthState', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset()
    mockCookieStore.set.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('stores a nonce cookie and returns the matching state', async () => {
    const state = await createOAuthState('/chat')

    expect(mockCookieStore.set).toHaveBeenCalledTimes(1)
    const [name, nonce, options] = mockCookieStore.set.mock.calls[0]
    expect(name).toBe('lw-oauth-state')
    expect(typeof nonce).toBe('string')
    expect(nonce.length).toBeGreaterThan(0)
    expect(options).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    })

    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    expect(decoded).toEqual({ nonce, next: '/chat' })
  })

  it('marks the cookie secure in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    await createOAuthState('/settings')

    expect(mockCookieStore.set.mock.calls[0][2]).toMatchObject({ secure: true })
  })

  it('produces a state that verifyOAuthState accepts', async () => {
    const state = await createOAuthState('/archive')
    const nonce = mockCookieStore.set.mock.calls[0][1]
    mockCookieStore.get.mockReturnValue({ value: nonce })

    await expect(verifyOAuthState(state)).resolves.toBe('/archive')
  })

  it('uses a fresh nonce per call', async () => {
    await createOAuthState('/chat')
    await createOAuthState('/chat')

    const [first, second] = mockCookieStore.set.mock.calls.map((call) => call[1])
    expect(first).not.toBe(second)
  })
})

describe('verifyOAuthState rejections', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset()
    mockCookieStore.set.mockReset()
    mockCookieStore.get.mockReturnValue({ value: NONCE })
  })

  it('returns null when no state parameter came back', async () => {
    await expect(verifyOAuthState(null)).resolves.toBeNull()
  })

  it('returns null when the state cookie is gone', async () => {
    mockCookieStore.get.mockReturnValue(undefined)

    await expect(verifyOAuthState(encodeState('/chat'))).resolves.toBeNull()
  })

  it('returns null when the state is not decodable JSON', async () => {
    await expect(verifyOAuthState('not-base64-json')).resolves.toBeNull()
  })

  it('always clears the state cookie, whatever the outcome', async () => {
    await verifyOAuthState(encodeState('/chat'))
    expect(mockCookieStore.set).toHaveBeenCalledWith('lw-oauth-state', '', { maxAge: 0, path: '/' })

    mockCookieStore.set.mockReset()
    await verifyOAuthState(null)
    expect(mockCookieStore.set).toHaveBeenCalledWith('lw-oauth-state', '', { maxAge: 0, path: '/' })
  })
})
