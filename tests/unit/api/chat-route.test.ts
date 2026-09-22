import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { ChatEvent } from '@/lib/chat/events'

const mockGetSessionUser = vi.hoisted(() => vi.fn())
const mockStoreGet = vi.hoisted(() => vi.fn())
const mockGetConversation = vi.hoisted(() => vi.fn())
const mockCreateConversation = vi.hoisted(() => vi.fn())
const mockReplaceMessages = vi.hoisted(() => vi.fn())
const mockRenameConversation = vi.hoisted(() => vi.fn())
const mockRecordWikiGap = vi.hoisted(() => vi.fn())
const mockRunTurn = vi.hoisted(() => vi.fn())
const mockSuggestTitle = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth/session', () => ({ getSessionUser: (...a: unknown[]) => mockGetSessionUser(...a) }))
vi.mock('@/lib/wiki/store', () => ({ wikiStore: { get: (...a: unknown[]) => mockStoreGet(...a) } }))
vi.mock('@/db/queries/conversations', () => ({
  getConversation: (...a: unknown[]) => mockGetConversation(...a),
  createConversation: (...a: unknown[]) => mockCreateConversation(...a),
  replaceMessages: (...a: unknown[]) => mockReplaceMessages(...a),
  renameConversation: (...a: unknown[]) => mockRenameConversation(...a),
}))
vi.mock('@/db/queries/wiki-gaps', () => ({ recordWikiGap: (...a: unknown[]) => mockRecordWikiGap(...a) }))
vi.mock('@/lib/anthropic/client', () => ({ anthropic: {}, MODELS: { chat: 'chat-model', title: 'title-model' } }))
// The route reads only the public wiki base URL out of env; stubbing the
// module keeps the unit run free of the deployment variables env.ts demands.
vi.mock('@/lib/env', () => ({ env: { wiki: { publicBaseUrl: 'https://example.test/blob' } } }))
vi.mock('@/lib/chat/run-turn', () => ({ runTurn: (...a: unknown[]) => mockRunTurn(...a) }))
vi.mock('@/lib/title-suggest', () => ({ suggestConversationTitle: (...a: unknown[]) => mockSuggestTitle(...a) }))

import { POST } from '@/app/api/chat/route'

const CONV_ID = '11111111-2222-4333-8444-555555555555'
const INDEX = { commit: 'c0ffee1', indexMarkdown: '# Index', pages: new Map(), terms: new Map(), sources: new Map(), search: () => [], builtAt: 'now' }

function req(body: unknown, raw?: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: raw ?? JSON.stringify(body),
  })
}

async function events(res: Response): Promise<ChatEvent[]> {
  const text = await res.text()
  return text.split('\n\n').filter(Boolean).map((frame) => {
    const data = frame.split('\n').find((l) => l.startsWith('data: '))!
    return JSON.parse(data.slice(6)) as ChatEvent
  })
}

const turnResult = (over: Record<string, unknown> = {}) => ({
  text: 'An answer.', citations: ['core/a.md'], toolTrace: [{ name: 'read_page', input: { path: 'core/a.md' } }], reportedGap: false, stopReason: 'end_turn', ...over,
})

describe('POST /api/chat guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSessionUser.mockResolvedValue({ id: 'user-1', email: 'u@example.test' })
    mockStoreGet.mockReturnValue(INDEX)
    mockCreateConversation.mockResolvedValue({ id: CONV_ID, title: null })
    mockReplaceMessages.mockResolvedValue(true)
    mockRenameConversation.mockResolvedValue(true)
    mockRunTurn.mockResolvedValue(turnResult())
    mockSuggestTitle.mockResolvedValue('A title')
  })

  it('refuses an anonymous caller', async () => {
    mockGetSessionUser.mockResolvedValue(null)
    const res = await POST(req({ conversationId: null, message: 'hi' }))
    expect(res.status).toBe(401)
    expect(mockReplaceMessages).not.toHaveBeenCalled()
  })

  it('refuses a body that is not a JSON object', async () => {
    const res = await POST(req(null, '"just a string"'))
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: 'Invalid JSON body' })
  })

  it.each([
    ['missing', {}],
    ['blank', { message: '   ' }],
    ['not a string', { message: 42 }],
  ])('refuses a %s message', async (_label, body) => {
    const res = await POST(req({ conversationId: null, ...body }))
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: 'message is required' })
  })

  it('refuses an oversized message', async () => {
    const res = await POST(req({ conversationId: null, message: 'x'.repeat(4001) }))
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: 'message must be at most 4000 characters' })
  })

  it.each([
    ['a non-uuid string', 'not-a-uuid'],
    ['a number', 7],
  ])('refuses %s conversationId', async (_label, conversationId) => {
    const res = await POST(req({ conversationId, message: 'hi' }))
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: 'conversationId must be a UUID or null' })
  })

  it('answers 503 while the wiki index is not loaded', async () => {
    mockStoreGet.mockReturnValue(null)
    const res = await POST(req({ conversationId: null, message: 'hi' }))
    expect(res.status).toBe(503)
    expect(mockCreateConversation).not.toHaveBeenCalled()
  })

  it('answers 404 for a conversation the caller does not own', async () => {
    mockGetConversation.mockResolvedValue(null)
    const res = await POST(req({ conversationId: CONV_ID, message: 'hi' }))
    expect(res.status).toBe(404)
  })

  it('answers 409 for a full conversation', async () => {
    mockGetConversation.mockResolvedValue({ id: CONV_ID, messages: Array.from({ length: 40 }, () => ({ role: 'user', content: 'x' })) })
    const res = await POST(req({ conversationId: CONV_ID, message: 'hi' }))
    expect(res.status).toBe(409)
    expect(mockReplaceMessages).not.toHaveBeenCalled()
  })

  it.each([
    ['the lookup', () => mockGetConversation.mockRejectedValue(new Error('db down')), CONV_ID],
    ['the insert', () => mockCreateConversation.mockRejectedValue(new Error('db down')), null],
    ['the first write', () => mockReplaceMessages.mockRejectedValue(new Error('db down')), null],
  ])('answers 500 when %s fails', async (_label, arrange, conversationId) => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGetConversation.mockResolvedValue({ id: CONV_ID, messages: [] })
    arrange()
    const res = await POST(req({ conversationId, message: 'hi' }))
    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toMatchObject({ error: 'Something went wrong' })
    expect(mockRunTurn).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('answers 404 when the conversation disappears before the first write', async () => {
    mockReplaceMessages.mockResolvedValue(false)
    const res = await POST(req({ conversationId: null, message: 'hi' }))
    expect(res.status).toBe(404)
    expect(mockRunTurn).not.toHaveBeenCalled()
  })
})

describe('POST /api/chat streaming', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSessionUser.mockResolvedValue({ id: 'user-1', email: 'u@example.test' })
    mockStoreGet.mockReturnValue(INDEX)
    mockCreateConversation.mockResolvedValue({ id: CONV_ID, title: null })
    mockReplaceMessages.mockResolvedValue(true)
    mockRenameConversation.mockResolvedValue(true)
    mockRunTurn.mockResolvedValue(turnResult())
    mockSuggestTitle.mockResolvedValue('A title')
  })

  it('persists the user message before the stream starts and titles a first exchange', async () => {
    const res = await POST(req({ conversationId: null, message: 'What is a functional unit?' }))

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    expect(res.headers.get('x-conversation-id')).toBe(CONV_ID)
    // The first write happens before the stream is constructed, so the question
    // survives even when the answer never arrives.
    const [id, userId, messages, commit] = mockReplaceMessages.mock.calls[0]
    expect(id).toBe(CONV_ID)
    expect(userId).toBe('user-1')
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({ role: 'user', content: 'What is a functional unit?' })
    expect(commit).toBe('c0ffee1')

    const done = (await events(res)).find((e) => e.type === 'done')
    expect(done).toMatchObject({ type: 'done', conversationId: CONV_ID, citations: ['core/a.md'], wikiCommit: 'c0ffee1', title: 'A title', reportedGap: false })
    expect(mockRenameConversation).toHaveBeenCalledWith(CONV_ID, 'user-1', 'A title')
    expect(mockReplaceMessages).toHaveBeenCalledTimes(2)
    expect(mockReplaceMessages.mock.calls[1][2]).toHaveLength(2)
  })

  it('leaves the title alone when the suggestion is empty', async () => {
    mockSuggestTitle.mockResolvedValue(null)
    const done = (await events(await POST(req({ conversationId: null, message: 'hi' })))).find((e) => e.type === 'done')
    expect(done).toMatchObject({ title: null })
    expect(mockRenameConversation).not.toHaveBeenCalled()
  })

  it('appends to an existing conversation without renaming it', async () => {
    mockGetConversation.mockResolvedValue({ id: CONV_ID, messages: [{ id: 'a', role: 'user', content: 'hi', createdAt: 'x' }] })
    const done = (await events(await POST(req({ conversationId: CONV_ID, message: 'more' })))).find((e) => e.type === 'done')
    expect(done).toMatchObject({ title: null })
    expect(mockSuggestTitle).not.toHaveBeenCalled()
    expect(mockRenameConversation).not.toHaveBeenCalled()
    expect(mockReplaceMessages.mock.calls[0][2]).toHaveLength(2)
  })

  it('binds the gap recorder to the caller and the conversation', async () => {
    mockRunTurn.mockImplementation(async (input: { recordGap: (g: { question: string; note: string | null }) => Promise<unknown> }) => {
      await input.recordGap({ question: 'q?', note: null })
      return turnResult({ text: '', reportedGap: true })
    })
    const done = (await events(await POST(req({ conversationId: null, message: 'hi' })))).find((e) => e.type === 'done')
    expect(done).toMatchObject({ reportedGap: true })
    expect(mockRecordWikiGap).toHaveBeenCalledWith({ userId: 'user-1', conversationId: CONV_ID, question: 'q?', note: null, wikiCommit: 'c0ffee1' })
    expect(mockReplaceMessages.mock.calls[1][2][1].content).toBe('The wiki does not cover this yet.')
  })

  it('stores a placeholder when the model produced no text and no gap', async () => {
    mockRunTurn.mockResolvedValue(turnResult({ text: '' }))
    await events(await POST(req({ conversationId: null, message: 'hi' })))
    expect(mockReplaceMessages.mock.calls[1][2][1].content).toBe('No answer was produced.')
  })

  it('emits an error event when the turn throws', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockRunTurn.mockRejectedValue(new Error('upstream down'))
    const evs = await events(await POST(req({ conversationId: null, message: 'hi' })))
    expect(evs).toEqual([{ type: 'error', code: 'turn_failed', message: 'The answer could not be completed. Try again.' }])
    expect(mockReplaceMessages).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('hands the request abort signal to the turn', async () => {
    await events(await POST(req({ conversationId: null, message: 'hi' })))
    const [input] = mockRunTurn.mock.calls[0] as [{ signal?: AbortSignal }]
    expect(input.signal).toBeInstanceOf(AbortSignal)
  })

  it('still reports done when the titling fails after the answer was stored', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockRenameConversation.mockRejectedValue(new Error('db down'))
    const evs = await events(await POST(req({ conversationId: null, message: 'hi' })))
    expect(evs.map((e) => e.type)).toEqual(['done'])
    expect(evs[0]).toMatchObject({ type: 'done', title: null })
    // The answer is stored either way, so the client must not see an error.
    expect(mockReplaceMessages).toHaveBeenCalledTimes(2)
    spy.mockRestore()
  })

  it('forwards the events the turn emits', async () => {
    mockRunTurn.mockImplementation(async (input: { emit: (e: ChatEvent) => void }) => {
      input.emit({ type: 'tool_start', name: 'search_wiki', input: { query: 'x' } })
      input.emit({ type: 'text_delta', text: 'An ' })
      return turnResult()
    })
    const evs = await events(await POST(req({ conversationId: null, message: 'hi' })))
    expect(evs.map((e) => e.type)).toEqual(['tool_start', 'text_delta', 'done'])
  })
})
