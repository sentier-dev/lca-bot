import { describe, it, expect, vi, afterEach } from 'vitest'
import { refreshSession, fetchWithRefresh } from '@/lib/auth/refresh-client'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('refreshSession', () => {
  it('resolves true on a 200 from POST /api/auth/refresh', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const ok = await refreshSession()

    expect(ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/refresh', { method: 'POST' })
  })

  it('resolves false when the refresh endpoint rejects the cookie', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))

    expect(await refreshSession()).toBe(false)
  })

  it('resolves false instead of throwing on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    expect(await refreshSession()).toBe(false)
  })

  it('shares a single in-flight request between concurrent callers', async () => {
    let release!: () => void
    const gate = new Promise<void>((r) => { release = r })
    const fetchMock = vi.fn().mockImplementation(async () => {
      await gate
      return new Response(null, { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const first = refreshSession()
    const second = refreshSession()
    release()
    const [a, b] = await Promise.all([first, second])

    expect(a).toBe(true)
    expect(b).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('starts a fresh refresh after the previous one has settled', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await refreshSession()
    await refreshSession()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('fetchWithRefresh', () => {
  it('returns a non-401 response unchanged without calling refresh', async () => {
    const response = new Response('{"ok":true}', { status: 200 })
    const fetchMock = vi.fn().mockResolvedValue(response)
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchWithRefresh('/api/chat', { method: 'POST', body: '{"a":1}' })

    expect(result).toBe(response)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retries once after a successful refresh and returns the retry response', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 })) // original call
      .mockResolvedValueOnce(new Response(null, { status: 200 })) // POST /api/auth/refresh
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 })) // retried call
    vi.stubGlobal('fetch', fetchMock)

    const res = await fetchWithRefresh('/api/chat', { method: 'POST', body: '{"a":1}' })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1]).toEqual(['/api/auth/refresh', { method: 'POST' }])
    expect(fetchMock.mock.calls[2]).toEqual(['/api/chat', { method: 'POST', body: '{"a":1}' }])
  })

  it('returns the original 401 when the refresh itself fails, without a second retry fetch', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 })) // original call
      .mockResolvedValueOnce(new Response(null, { status: 401 })) // refresh fails
    vi.stubGlobal('fetch', fetchMock)

    const res = await fetchWithRefresh('/api/chat')

    expect(res.status).toBe(401)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('shares one refresh across concurrent 401s and lets both retries through', async () => {
    let refreshCalls = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/auth/refresh') {
        refreshCalls += 1
        return new Response(null, { status: 200 })
      }
      return refreshCalls > 0
        ? new Response('ok', { status: 200 })
        : new Response('unauthorized', { status: 401 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const [a, b] = await Promise.all([fetchWithRefresh('/api/a'), fetchWithRefresh('/api/b')])

    expect(a.status).toBe(200)
    expect(b.status).toBe(200)
    expect(refreshCalls).toBe(1)
  })

  it('does not reuse a consumed stream body on retry', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const init = { method: 'POST', body: 'payload' }
    await fetchWithRefresh('/api/chat', init)

    // The retry call receives a freshly built init object, not the exact
    // reference passed in, so a caller mutating init afterwards cannot
    // affect a request already in flight or already sent.
    expect(fetchMock.mock.calls[2][1]).not.toBe(init)
    expect(fetchMock.mock.calls[2][1]).toEqual(init)
  })
})
