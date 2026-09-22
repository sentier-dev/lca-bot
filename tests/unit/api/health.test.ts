import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import path from 'node:path'

const mockExecute = vi.hoisted(() => vi.fn())

vi.mock('@/db', () => ({ db: { execute: (...args: unknown[]) => mockExecute(...args) } }))

import { wikiStore } from '@/lib/wiki/store'
import { buildIndex } from '@/lib/wiki/build-index'
import type { WikiIndex } from '@/lib/wiki/types'
import { GET } from '@/app/api/health/route'

const FIXTURE = path.resolve(__dirname, '../../fixtures/wiki')

let index: WikiIndex

describe('GET /api/health', () => {
  beforeAll(async () => {
    index = await buildIndex(FIXTURE, 'abc1234')
  })

  beforeEach(() => {
    mockExecute.mockReset()
    wikiStore.resetForTests()
    wikiStore.set(index)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    wikiStore.resetForTests()
    vi.restoreAllMocks()
  })

  it('reports ok when the database answers', async () => {
    mockExecute.mockResolvedValue([{ '?column?': 1 }])

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe('ok')
    expect(body.checks.database).toBe('ok')
    expect(console.error).not.toHaveBeenCalled()
  })

  it('reports degraded and logs the error when the database fails', async () => {
    mockExecute.mockRejectedValue(new Error('connection refused to db-host:5432'))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.status).toBe('degraded')
    expect(body.checks.database).toBe('error')
    // The response must not leak connection details to an unauthenticated caller.
    expect(JSON.stringify(body)).not.toContain('connection refused')
    expect(console.error).toHaveBeenCalledWith('[health] database check failed', expect.any(Error))
  })

  it('reports the wiki commit and page count when the index is loaded', async () => {
    mockExecute.mockResolvedValue([{ '?column?': 1 }])

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.checks.wiki).toBe('ok')
    expect(body.wiki).toMatchObject({ commit: 'abc1234', pageCount: 13 })
    expect(body.wikiError).toBe(false)
  })

  it('flags a wiki sync error as a boolean without echoing the git message', async () => {
    mockExecute.mockResolvedValue([{ '?column?': 1 }])
    wikiStore.recordError(new Error('fatal: could not read Username for https://x:tok@github.com'))

    const response = await GET()
    const body = await response.json()

    expect(body.wikiError).toBe(true)
    expect(JSON.stringify(body)).not.toContain('tok@github.com')
    expect(body.wiki.lastError).toBeUndefined()
  })

  it('reports degraded when the wiki index has not been built yet', async () => {
    mockExecute.mockResolvedValue([{ '?column?': 1 }])
    wikiStore.resetForTests()

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.status).toBe('degraded')
    expect(body.checks.database).toBe('ok')
    expect(body.checks.wiki).toBe('error')
    expect(body.wiki).toMatchObject({ commit: null, pageCount: 0 })
  })
})
