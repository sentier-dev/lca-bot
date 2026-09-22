import { describe, it, expect, beforeEach } from 'vitest'
import path from 'node:path'
import { wikiStore } from '@/lib/wiki/store'
import { buildIndex } from '@/lib/wiki/build-index'
import { GET } from '@/app/api/wiki/status/route'

describe('GET /api/wiki/status', () => {
  beforeEach(() => wikiStore.resetForTests())

  it('reports not ready before the first sync', async () => {
    const res = await GET()
    expect(res.status).toBe(503)
    expect(await res.json()).toMatchObject({ ready: false, commit: null, pageCount: 0 })
  })

  it('reports the commit and page count once loaded', async () => {
    wikiStore.set(await buildIndex(path.resolve(__dirname, '../../fixtures/wiki'), 'abc1234'))
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ready: true, commit: 'abc1234', pageCount: 13 })
  })

  it('never exposes the last git error to an unauthenticated caller', async () => {
    wikiStore.recordError(new Error('fatal: could not read Username for https://x:tok@github.com'))
    const res = await GET()
    const body = await res.json()
    expect(Object.keys(body).sort()).toEqual(['commit', 'pageCount', 'ready', 'syncedAt'])
    expect(JSON.stringify(body)).not.toContain('tok@github.com')
  })
})
