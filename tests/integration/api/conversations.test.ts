import { describe, it, expect, vi } from 'vitest'
import { createTestUser, createTestConversation } from '../helpers/seed'
import { makeRequest } from '../helpers/auth'

const mockCookieStore = { get: vi.fn() }
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}))

const list = await import('@/app/api/conversations/route')
const item = await import('@/app/api/conversations/[id]/route')

function asUser(token: string) {
  mockCookieStore.get.mockImplementation((name: string) => (name === 'lw-access-token' ? { value: token } : undefined))
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

describe('/api/conversations', () => {
  it('lists only the caller\'s conversations, newest first, with a total', async () => {
    const alice = await createTestUser()
    const bob = await createTestUser()
    await createTestConversation(alice.id, { title: 'older' })
    await createTestConversation(alice.id, { title: 'newer' })
    await createTestConversation(bob.id, { title: 'bobs' })
    asUser(alice.accessToken)
    const res = await list.GET(makeRequest('/api/conversations?limit=10&offset=0'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.items.map((c: { title: string }) => c.title)).toEqual(['newer', 'older'])
    expect(body.total).toBe(2)
  })

  it('creates an empty conversation', async () => {
    const alice = await createTestUser()
    asUser(alice.accessToken)
    const res = await list.POST()
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.conversation.id).toMatch(/[0-9a-f-]{36}/)
    expect(body.conversation.title).toBeNull()
  })

  it('reads, renames and deletes with ownership; another user gets 404', async () => {
    const alice = await createTestUser()
    const bob = await createTestUser()
    const conv = await createTestConversation(alice.id, { title: 'mine', messages: [{ id: 'm1', role: 'user', content: 'q', createdAt: 'now' }] })

    asUser(alice.accessToken)
    const got = await item.GET(makeRequest(`/api/conversations/${conv.id}`), ctx(conv.id))
    expect(got.status).toBe(200)
    expect((await got.json()).conversation.messages).toHaveLength(1)

    const renamed = await item.PATCH(makeRequest(`/api/conversations/${conv.id}`, { method: 'PATCH', body: { title: 'Renamed' } }), ctx(conv.id))
    expect(renamed.status).toBe(200)
    expect((await renamed.json()).conversation.title).toBe('Renamed')

    const tooLong = await item.PATCH(makeRequest(`/api/conversations/${conv.id}`, { method: 'PATCH', body: { title: 'x'.repeat(201) } }), ctx(conv.id))
    expect(tooLong.status).toBe(400)

    asUser(bob.accessToken)
    expect((await item.GET(makeRequest(`/api/conversations/${conv.id}`), ctx(conv.id))).status).toBe(404)
    expect((await item.DELETE(makeRequest(`/api/conversations/${conv.id}`, { method: 'DELETE' }), ctx(conv.id))).status).toBe(404)

    asUser(alice.accessToken)
    expect((await item.DELETE(makeRequest(`/api/conversations/${conv.id}`, { method: 'DELETE' }), ctx(conv.id))).status).toBe(200)
    expect((await item.GET(makeRequest(`/api/conversations/${conv.id}`), ctx(conv.id))).status).toBe(404)
  })

  it('rejects anonymous callers and malformed ids', async () => {
    mockCookieStore.get.mockReturnValue(undefined)
    expect((await list.GET(makeRequest('/api/conversations'))).status).toBe(401)
    const alice = await createTestUser()
    asUser(alice.accessToken)
    expect((await item.GET(makeRequest('/api/conversations/not-a-uuid'), ctx('not-a-uuid'))).status).toBe(404)
  })
})
