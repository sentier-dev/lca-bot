import { describe, it, expect, vi, beforeAll } from 'vitest'
import path from 'node:path'
import { createTestUser, createTestConversation, testSql } from '../helpers/seed'
import { makeRequest } from '../helpers/auth'
import { wikiStore } from '@/lib/wiki/store'
import { buildIndex } from '@/lib/wiki/build-index'
import type { ChatEvent } from '@/lib/chat/events'

const mockCookieStore = { get: vi.fn() }
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}))

const { POST } = await import('@/app/api/chat/route')

function asUser(token: string) {
  mockCookieStore.get.mockImplementation((name: string) => (name === 'lw-access-token' ? { value: token } : undefined))
}

async function readEvents(res: Response): Promise<ChatEvent[]> {
  const text = await res.text()
  return text.split('\n\n').filter(Boolean).map((frame) => {
    const data = frame.split('\n').find((l) => l.startsWith('data: '))!
    return JSON.parse(data.slice(6)) as ChatEvent
  })
}

beforeAll(async () => {
  wikiStore.resetForTests()
  wikiStore.set(await buildIndex(path.resolve(__dirname, '../../fixtures/wiki'), 'fix1234'))
})

describe('POST /api/chat', () => {
  it('creates a conversation on the first message, streams, persists both messages, titles it', async () => {
    const alice = await createTestUser()
    asUser(alice.accessToken)
    const res = await POST(makeRequest('/api/chat', { method: 'POST', body: { conversationId: null, message: 'What is a functional unit?' } }))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    const events = await readEvents(res)
    const done = events.find((e) => e.type === 'done')
    expect(done && done.type === 'done').toBe(true)
    if (!done || done.type !== 'done') return
    expect(done.citations).toEqual(['core/concepts/functional-unit.md'])
    expect(done.wikiCommit).toBe('fix1234')
    expect(done.title).toBe('Functional unit basics')
    expect(events.filter((e) => e.type === 'text_delta').length).toBeGreaterThan(0)
    expect(events.filter((e) => e.type === 'tool_start').length).toBe(2)

    const [row] = await testSql`SELECT title, messages, message_count, wiki_commit FROM conversations WHERE id = ${done.conversationId}`
    expect(row.title).toBe('Functional unit basics')
    expect(row.message_count).toBe(2)
    expect(row.wiki_commit).toBe('fix1234')
    const msgs = row.messages as Array<{ role: string; citations?: string[] }>
    expect(msgs[0].role).toBe('user')
    expect(msgs[1].role).toBe('assistant')
    expect(msgs[1].citations).toEqual(['core/concepts/functional-unit.md'])
  })

  it('appends to an existing conversation and records a gap', async () => {
    const alice = await createTestUser()
    // The mock client raises a gap when the marker is on the opening question
    // or on the newest one.
    const conv = await createTestConversation(alice.id, { title: 'T', messages: [{ id: 'a', role: 'user', content: 'unknown-topic-xyz?', createdAt: 'x' }, { id: 'b', role: 'assistant', content: 'hello', createdAt: 'x' }] })
    asUser(alice.accessToken)
    const res = await POST(makeRequest('/api/chat', { method: 'POST', body: { conversationId: conv.id, message: 'unknown-topic-xyz, anything more?' } }))
    const events = await readEvents(res)
    const done = events.find((e) => e.type === 'done')
    expect(done && done.type === 'done' && done.reportedGap).toBe(true)
    const gaps = await testSql`SELECT question, conversation_id, user_id FROM wiki_gaps WHERE conversation_id = ${conv.id}`
    expect(gaps).toHaveLength(1)
    expect(gaps[0].user_id).toBe(alice.id)
    const [row] = await testSql`SELECT message_count, title FROM conversations WHERE id = ${conv.id}`
    expect(row.message_count).toBe(4)
    expect(row.title).toBe('T')
  })

  it('refuses another user\'s conversation, empty and oversized messages, and a full conversation', async () => {
    const alice = await createTestUser()
    const bob = await createTestUser()
    const conv = await createTestConversation(alice.id)
    asUser(bob.accessToken)
    expect((await POST(makeRequest('/api/chat', { method: 'POST', body: { conversationId: conv.id, message: 'x' } }))).status).toBe(404)
    asUser(alice.accessToken)
    expect((await POST(makeRequest('/api/chat', { method: 'POST', body: { conversationId: null, message: '   ' } }))).status).toBe(400)
    expect((await POST(makeRequest('/api/chat', { method: 'POST', body: { conversationId: null, message: 'x'.repeat(4001) } }))).status).toBe(400)
    const full = await createTestConversation(alice.id, { messages: Array.from({ length: 40 }, (_, i) => ({ id: `m${i}`, role: i % 2 ? 'assistant' : 'user', content: 'x', createdAt: 'x' })) })
    expect((await POST(makeRequest('/api/chat', { method: 'POST', body: { conversationId: full.id, message: 'one more' } }))).status).toBe(409)
  })

  it('answers 503 when the wiki index is not loaded', async () => {
    wikiStore.resetForTests()
    const alice = await createTestUser()
    asUser(alice.accessToken)
    expect((await POST(makeRequest('/api/chat', { method: 'POST', body: { conversationId: null, message: 'q' } }))).status).toBe(503)
    wikiStore.set(await buildIndex(path.resolve(__dirname, '../../fixtures/wiki'), 'fix1234'))
  })
})
