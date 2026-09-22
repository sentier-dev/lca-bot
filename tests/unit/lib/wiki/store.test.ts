import { describe, it, expect, beforeEach } from 'vitest'
import path from 'node:path'
import { buildIndex } from '@/lib/wiki/build-index'
import { wikiStore } from '@/lib/wiki/store'

const FIXTURE = path.resolve(__dirname, '../../../fixtures/wiki')

describe('wikiStore', () => {
  beforeEach(() => wikiStore.resetForTests())

  it('starts empty with a not-ready status', () => {
    expect(wikiStore.get()).toBeNull()
    expect(wikiStore.status()).toEqual({ ready: false, commit: null, syncedAt: null, pageCount: 0, lastError: null })
  })

  it('swaps the index atomically and reports status', async () => {
    const index = await buildIndex(FIXTURE, 'abc1234')
    wikiStore.set(index)
    expect(wikiStore.get()).toBe(index)
    const status = wikiStore.status()
    expect(status.ready).toBe(true)
    expect(status.commit).toBe('abc1234')
    expect(status.pageCount).toBe(13)
  })

  it('keeps the last good index when an error is recorded', async () => {
    const index = await buildIndex(FIXTURE, 'abc1234')
    wikiStore.set(index)
    wikiStore.recordError(new Error('git pull failed'))
    expect(wikiStore.get()).toBe(index)
    expect(wikiStore.status().lastError).toBe('git pull failed')
  })
})
