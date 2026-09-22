import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetSessionUser = vi.hoisted(() => vi.fn())
const mockList = vi.hoisted(() => vi.fn())
const mockCount = vi.hoisted(() => vi.fn())
const mockCreate = vi.hoisted(() => vi.fn())
const mockGet = vi.hoisted(() => vi.fn())
const mockRename = vi.hoisted(() => vi.fn())
const mockDelete = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth/session', () => ({ getSessionUser: (...a: unknown[]) => mockGetSessionUser(...a) }))
vi.mock('@/db/queries/conversations', () => ({
  listUserConversations: (...a: unknown[]) => mockList(...a),
  countUserConversations: (...a: unknown[]) => mockCount(...a),
  createConversation: (...a: unknown[]) => mockCreate(...a),
  getConversation: (...a: unknown[]) => mockGet(...a),
  renameConversation: (...a: unknown[]) => mockRename(...a),
  deleteConversation: (...a: unknown[]) => mockDelete(...a),
}))

import { GET as listGet, POST as listPost } from '@/app/api/conversations/route'
import { GET, PATCH, DELETE } from '@/app/api/conversations/[id]/route'

const CONV_ID = '11111111-2222-4333-8444-555555555555'
const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

function req(url: string, init: { method?: string; body?: unknown; raw?: string } = {}): NextRequest {
  const { method = 'GET', body, raw } = init
  return new NextRequest(`http://localhost:3000${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(raw !== undefined ? { body: raw } : body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
}

describe('/api/conversations route handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSessionUser.mockResolvedValue({ id: 'user-1', email: 'u@example.test' })
    mockList.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
    mockCreate.mockResolvedValue({ id: CONV_ID, title: null })
    mockGet.mockResolvedValue({ id: CONV_ID, title: 'T', messages: [] })
    mockRename.mockResolvedValue(true)
    mockDelete.mockResolvedValue(true)
  })

  it('refuses anonymous callers on every handler', async () => {
    mockGetSessionUser.mockResolvedValue(null)
    expect((await listGet(req('/api/conversations'))).status).toBe(401)
    expect((await listPost()).status).toBe(401)
    expect((await GET(req(`/api/conversations/${CONV_ID}`), ctx(CONV_ID))).status).toBe(401)
    expect((await PATCH(req(`/api/conversations/${CONV_ID}`, { method: 'PATCH', body: { title: 'x' } }), ctx(CONV_ID))).status).toBe(401)
    expect((await DELETE(req(`/api/conversations/${CONV_ID}`, { method: 'DELETE' }), ctx(CONV_ID))).status).toBe(401)
  })

  it.each([
    ['no paging params', '', 50, 0],
    ['unparseable values', '?limit=abc&offset=-3', 50, 0],
    ['a zero limit', '?limit=0', 50, 0],
    ['an oversized limit', '?limit=9999&offset=5', 200, 5],
  ])('falls back to sane paging for %s', async (_label, query, limit, offset) => {
    const res = await listGet(req(`/api/conversations${query}`))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ limit, offset, total: 0 })
    expect(mockList).toHaveBeenCalledWith('user-1', limit, offset)
  })

  it('answers 500 when listing or creating fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockList.mockRejectedValue(new Error('db down'))
    expect((await listGet(req('/api/conversations'))).status).toBe(500)
    mockCreate.mockRejectedValue(new Error('db down'))
    expect((await listPost()).status).toBe(500)
    spy.mockRestore()
  })

  it('creates an empty conversation', async () => {
    const res = await listPost()
    expect(res.status).toBe(201)
    await expect(res.json()).resolves.toMatchObject({ conversation: { id: CONV_ID, title: null } })
  })

  it('treats a malformed id as not found on every handler', async () => {
    expect((await GET(req('/api/conversations/nope'), ctx('nope'))).status).toBe(404)
    expect((await PATCH(req('/api/conversations/nope', { method: 'PATCH', body: { title: 'x' } }), ctx('nope'))).status).toBe(404)
    expect((await DELETE(req('/api/conversations/nope', { method: 'DELETE' }), ctx('nope'))).status).toBe(404)
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('reads a conversation and reports a missing one as not found', async () => {
    const res = await GET(req(`/api/conversations/${CONV_ID}`), ctx(CONV_ID))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ conversation: { id: CONV_ID } })
    mockGet.mockResolvedValue(null)
    expect((await GET(req(`/api/conversations/${CONV_ID}`), ctx(CONV_ID))).status).toBe(404)
  })

  it('answers 500 when reading a conversation fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGet.mockRejectedValue(new Error('db down'))
    const res = await GET(req(`/api/conversations/${CONV_ID}`), ctx(CONV_ID))
    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toMatchObject({ error: 'Something went wrong' })
    spy.mockRestore()
  })

  it('answers 500 when deleting a conversation fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockDelete.mockRejectedValue(new Error('db down'))
    const res = await DELETE(req(`/api/conversations/${CONV_ID}`, { method: 'DELETE' }), ctx(CONV_ID))
    expect(res.status).toBe(500)
    spy.mockRestore()
  })

  it.each([
    ['an unparseable body', { raw: '{not json' }],
    ['a missing title', { body: {} }],
    ['a blank title', { body: { title: '   ' } }],
    ['a non-string title', { body: { title: 12 } }],
    ['an overlong title', { body: { title: 'x'.repeat(201) } }],
  ])('refuses a rename with %s', async (_label, init) => {
    const res = await PATCH(req(`/api/conversations/${CONV_ID}`, { method: 'PATCH', ...init }), ctx(CONV_ID))
    expect(res.status).toBe(400)
    expect(mockRename).not.toHaveBeenCalled()
  })

  it('renames, reports a vanished row as not found and a failure as 500', async () => {
    const ok = await PATCH(req(`/api/conversations/${CONV_ID}`, { method: 'PATCH', body: { title: '  Renamed  ' } }), ctx(CONV_ID))
    expect(ok.status).toBe(200)
    expect(mockRename).toHaveBeenCalledWith(CONV_ID, 'user-1', 'Renamed')

    mockRename.mockResolvedValue(false)
    expect((await PATCH(req(`/api/conversations/${CONV_ID}`, { method: 'PATCH', body: { title: 'x' } }), ctx(CONV_ID))).status).toBe(404)

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockRename.mockRejectedValue(new Error('db down'))
    expect((await PATCH(req(`/api/conversations/${CONV_ID}`, { method: 'PATCH', body: { title: 'x' } }), ctx(CONV_ID))).status).toBe(500)
    spy.mockRestore()
  })

  it('deletes an owned conversation and reports someone else\'s as not found', async () => {
    const res = await DELETE(req(`/api/conversations/${CONV_ID}`, { method: 'DELETE' }), ctx(CONV_ID))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ deleted: true })
    mockDelete.mockResolvedValue(false)
    expect((await DELETE(req(`/api/conversations/${CONV_ID}`, { method: 'DELETE' }), ctx(CONV_ID))).status).toBe(404)
  })
})
