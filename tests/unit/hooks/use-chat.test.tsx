import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useChat } from '@/hooks/use-chat'

function sseResponse(frames: string[], headers: Record<string, string> = {}) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      for (const f of frames) c.enqueue(encoder.encode(f))
      c.close()
    },
  })
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream', ...headers } })
}
const frame = (type: string, data: object) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`

/** Replace window.location with a writable stub so assigning href does not navigate. */
function stubLocation(pathname: string): { href: string; pathname: string } {
  const fake = { href: `http://localhost${pathname}`, pathname }
  Object.defineProperty(window, 'location', { value: fake, writable: true, configurable: true })
  return fake
}
const realLocation = Object.getOwnPropertyDescriptor(window, 'location')

afterEach(() => {
  vi.unstubAllGlobals()
  if (realLocation) Object.defineProperty(window, 'location', realLocation)
})

describe('useChat', () => {
  it('appends the user message, streams the assistant text and finalises with citations', async () => {
    const fetchMock = vi.fn().mockResolvedValue(sseResponse([
      frame('tool_start', { name: 'search_wiki', input: { query: 'q' } }),
      frame('text_delta', { text: 'Hel' }),
      frame('text_delta', { text: 'lo' }),
      frame('done', { conversationId: 'c1', messageId: 'a1', citations: ['x.md'], toolTrace: [{ name: 'search_wiki', input: { query: 'q' } }], reportedGap: false, wikiCommit: 'abc', title: 'T' }),
    ]))
    vi.stubGlobal('fetch', fetchMock)
    const onConversationCreated = vi.fn()
    const { result } = renderHook(() => useChat({ conversationId: null, initialMessages: [], onConversationCreated }))
    await act(async () => { await result.current.send('What?') })
    await waitFor(() => expect(result.current.status).toBe('idle'))
    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[0]).toMatchObject({ role: 'user', content: 'What?' })
    expect(result.current.messages[1]).toMatchObject({ role: 'assistant', content: 'Hello', citations: ['x.md'], id: 'a1' })
    expect(onConversationCreated).toHaveBeenCalledWith('c1', 'T')
    expect(result.current.wikiCommit).toBe('abc')
    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ conversationId: null, message: 'What?' })
  })

  it('exposes the current tool step while streaming', async () => {
    let release!: () => void
    const gate = new Promise<void>((r) => { release = r })
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(c) {
        c.enqueue(encoder.encode(frame('tool_start', { name: 'read_page', input: { path: 'core/README.md' } })))
        await gate
        c.enqueue(encoder.encode(frame('done', { conversationId: 'c1', messageId: 'a1', citations: [], toolTrace: [], reportedGap: false, wikiCommit: null, title: null })))
        c.close()
      },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(stream, { status: 200 })))
    const { result } = renderHook(() => useChat({ conversationId: 'c1', initialMessages: [] }))
    act(() => { void result.current.send('q') })
    await waitFor(() => expect(result.current.currentStep).toBe('Reading core/README.md'))
    release()
    await waitFor(() => expect(result.current.status).toBe('idle'))
  })

  it('keeps the user message and surfaces an error code on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'x' }), { status: 503 })))
    const { result } = renderHook(() => useChat({ conversationId: null, initialMessages: [] }))
    await act(async () => { await result.current.send('q') })
    expect(result.current.status).toBe('error')
    expect(result.current.errorCode).toBe('wiki_unavailable')
    expect(result.current.messages).toHaveLength(1)
    expect(result.current.lastFailedMessage).toBe('q')
  })

  it('reports a network failure and resends the same text on retry', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(sseResponse([
        frame('text_delta', { text: 'Second time lucky' }),
        frame('done', { conversationId: 'c1', messageId: 'a1', citations: [], toolTrace: [], reportedGap: false, wikiCommit: null, title: null }),
      ]))
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useChat({ conversationId: 'c1', initialMessages: [] }))

    await act(async () => { await result.current.send('q') })
    expect(result.current.errorCode).toBe('network')
    expect(result.current.messages).toHaveLength(1)

    await act(async () => { await result.current.retry() })
    await waitFor(() => expect(result.current.status).toBe('idle'))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    // The failed user message is replaced, not duplicated.
    expect(result.current.messages.map((m) => m.role)).toEqual(['user', 'assistant'])
    expect(result.current.messages[1].content).toBe('Second time lucky')
  })

  it('fails the turn when the stream ends without a done frame, and ignores an empty retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse([frame('text_delta', { text: 'half an ans' })])))
    const { result } = renderHook(() => useChat({ conversationId: 'c1', initialMessages: [] }))

    await act(async () => { await result.current.retry() })
    expect(result.current.status).toBe('idle')

    await act(async () => { await result.current.send('q') })
    expect(result.current.status).toBe('error')
    expect(result.current.errorCode).toBe('turn_failed')
  })

  it('ignores an empty draft and aborts the request on stop', async () => {
    const fetchMock = vi.fn().mockResolvedValue(sseResponse([
      frame('done', { conversationId: 'c1', messageId: 'a1', citations: [], toolTrace: [], reportedGap: false, wikiCommit: null, title: null }),
    ]))
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useChat({ conversationId: 'c1', initialMessages: [] }))

    await act(async () => { await result.current.send('   ') })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.messages).toHaveLength(0)

    act(() => result.current.stop())
    await act(async () => { await result.current.send('q') })
    const signal = (fetchMock.mock.calls[0][1] as RequestInit).signal as AbortSignal
    expect(signal.aborted).toBe(false)
  })

  it('recovers from an expired access token by refreshing once and retrying the chat request', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 })) // original /api/chat
      .mockResolvedValueOnce(new Response(null, { status: 200 })) // POST /api/auth/refresh
      .mockResolvedValueOnce(sseResponse([
        frame('text_delta', { text: 'Hi' }),
        frame('done', { conversationId: 'c1', messageId: 'a1', citations: [], toolTrace: [], reportedGap: false, wikiCommit: null, title: null }),
      ])) // retried /api/chat
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useChat({ conversationId: 'c1', initialMessages: [] }))

    await act(async () => { await result.current.send('q') })
    await waitFor(() => expect(result.current.status).toBe('idle'))

    expect(result.current.messages.map((m) => m.role)).toEqual(['user', 'assistant'])
    expect(result.current.messages[1].content).toBe('Hi')
    expect(result.current.errorCode).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1][0]).toBe('/api/auth/refresh')
  })

  it('redirects to /login when the chat request is still unauthorized after a refresh attempt', async () => {
    const location = stubLocation('/chat/abc')
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 })) // original /api/chat
      .mockResolvedValueOnce(new Response(null, { status: 401 })) // refresh fails
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useChat({ conversationId: 'c1', initialMessages: [] }))

    await act(async () => { await result.current.send('q') })

    expect(location.href).toBe('/login?redirectedFrom=%2Fchat%2Fabc')
    expect(result.current.errorCode).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
