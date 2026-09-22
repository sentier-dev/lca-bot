import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockFetchWithRefresh = vi.fn()
vi.mock('@/lib/auth/refresh-client', () => ({
  fetchWithRefresh: (...args: unknown[]) => mockFetchWithRefresh(...args),
}))

import { apiFetch } from '@/lib/api-fetch'

/** Replace window.location with a writable stub so assigning href does not navigate. */
function stubLocation(pathname = '/current'): { href: string; pathname: string } {
  const fake = { href: `http://localhost${pathname}`, pathname }
  Object.defineProperty(window, 'location', {
    value: fake,
    writable: true,
    configurable: true,
  })
  return fake
}

describe('apiFetch', () => {
  const realLocation = Object.getOwnPropertyDescriptor(window, 'location')

  beforeEach(() => {
    mockFetchWithRefresh.mockReset()
  })

  afterEach(() => {
    if (realLocation) Object.defineProperty(window, 'location', realLocation)
  })

  it('returns a successful response unchanged and forwards input and init to fetchWithRefresh', async () => {
    const response = new Response('{"ok":true}', { status: 200 })
    mockFetchWithRefresh.mockResolvedValue(response)
    const init = { method: 'POST', body: 'payload' }

    const result = await apiFetch('/api/threads', init)

    expect(result).toBe(response)
    expect(await result.json()).toEqual({ ok: true })
    expect(mockFetchWithRefresh).toHaveBeenCalledWith('/api/threads', init)
  })

  it('returns non-401 error responses unchanged without redirecting', async () => {
    const location = stubLocation()
    const response = new Response('nope', { status: 403 })
    mockFetchWithRefresh.mockResolvedValue(response)

    const result = await apiFetch('/api/admin')

    expect(result).toBe(response)
    expect(result.status).toBe(403)
    expect(location.href).toBe('http://localhost/current')
  })

  it('leaves a 500 alone as well', async () => {
    const location = stubLocation()
    const response = new Response('boom', { status: 500 })
    mockFetchWithRefresh.mockResolvedValue(response)

    await expect(apiFetch(new URL('http://localhost/api/x'))).resolves.toBe(response)
    expect(location.href).toBe('http://localhost/current')
  })

  it('redirects to /login with redirectedFrom when the retried request is still 401, and never resolves', async () => {
    const location = stubLocation('/settings')
    mockFetchWithRefresh.mockResolvedValue(new Response('unauthorized', { status: 401 }))

    const sentinel = Symbol('pending')
    const raced = await Promise.race([
      apiFetch('/api/me'),
      new Promise((resolve) => setTimeout(() => resolve(sentinel), 20)),
    ])

    expect(location.href).toBe('/login?redirectedFrom=%2Fsettings')
    // The 401 branch returns a promise that is never settled, so the timeout wins.
    expect(raced).toBe(sentinel)
  })

  it('falls back to a bare /login when the current path is not safe to replay', async () => {
    const location = stubLocation('/api/internal')
    mockFetchWithRefresh.mockResolvedValue(new Response('unauthorized', { status: 401 }))

    await Promise.race([apiFetch('/api/me'), new Promise((resolve) => setTimeout(resolve, 20))])

    expect(location.href).toBe('/login')
  })

  it('propagates network errors from fetchWithRefresh', async () => {
    mockFetchWithRefresh.mockRejectedValue(new Error('offline'))
    await expect(apiFetch('/api/me')).rejects.toThrow('offline')
  })
})
