import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import path from 'node:path'

const FIXTURE = path.resolve(__dirname, '../../../fixtures/wiki')

vi.mock('@/lib/wiki/git', () => ({
  ensureCheckout: vi.fn(),
  headCommit: vi.fn(),
}))

import { ensureCheckout } from '@/lib/wiki/git'
import { syncOnce, startWikiSync } from '@/lib/wiki/sync'
import { wikiStore } from '@/lib/wiki/store'

describe('syncOnce', () => {
  beforeEach(() => {
    wikiStore.resetForTests()
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds and stores the index on first run', async () => {
    vi.mocked(ensureCheckout).mockResolvedValue({ action: 'cloned', commit: 'c1', changed: true })
    const status = await syncOnce({ repoUrl: 'x', dataDir: FIXTURE, disabled: false })
    expect(status.ready).toBe(true)
    expect(status.commit).toBe('c1')
    expect(wikiStore.get()?.pages.size).toBe(13)
  })

  it('skips the rebuild when the commit did not change', async () => {
    vi.mocked(ensureCheckout).mockResolvedValue({ action: 'cloned', commit: 'c1', changed: true })
    await syncOnce({ repoUrl: 'x', dataDir: FIXTURE, disabled: false })
    const first = wikiStore.get()
    vi.mocked(ensureCheckout).mockResolvedValue({ action: 'pulled', commit: 'c1', changed: false })
    await syncOnce({ repoUrl: 'x', dataDir: FIXTURE, disabled: false })
    expect(wikiStore.get()).toBe(first)
  })

  it('keeps the previous index and records the error when git fails', async () => {
    vi.mocked(ensureCheckout).mockResolvedValue({ action: 'cloned', commit: 'c1', changed: true })
    await syncOnce({ repoUrl: 'x', dataDir: FIXTURE, disabled: false })
    vi.mocked(ensureCheckout).mockRejectedValue(new Error('network down'))
    const status = await syncOnce({ repoUrl: 'x', dataDir: FIXTURE, disabled: false })
    expect(status.ready).toBe(true)
    expect(status.commit).toBe('c1')
    expect(status.lastError).toBe('network down')
  })

  it('shares one run between overlapping calls', async () => {
    vi.mocked(ensureCheckout).mockResolvedValue({ action: 'cloned', commit: 'c1', changed: true })
    const [a, b] = await Promise.all([
      syncOnce({ repoUrl: 'x', dataDir: FIXTURE, disabled: false }),
      syncOnce({ repoUrl: 'x', dataDir: FIXTURE, disabled: false }),
    ])
    expect(ensureCheckout).toHaveBeenCalledTimes(1)
    expect(a).toEqual(b)
    // A later call is a fresh run, not the memoised one.
    await syncOnce({ repoUrl: 'x', dataDir: FIXTURE, disabled: false })
    expect(ensureCheckout).toHaveBeenCalledTimes(2)
  })
})

describe('startWikiSync', () => {
  const TIMER_KEY = Symbol.for('lca-bot.wiki-sync-timer')
  const globalTimers = globalThis as Record<symbol, NodeJS.Timeout | true | undefined>

  beforeEach(() => {
    wikiStore.resetForTests()
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    delete globalTimers[TIMER_KEY]
  })

  afterEach(() => {
    const timer = globalTimers[TIMER_KEY]
    if (timer && timer !== true) clearInterval(timer)
    delete globalTimers[TIMER_KEY]
    vi.restoreAllMocks()
  })

  it('syncs immediately, schedules one interval, and is a no-op when called twice', async () => {
    vi.mocked(ensureCheckout).mockResolvedValue({ action: 'cloned', commit: 'c1', changed: true })
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')
    const config = { repoUrl: 'x', dataDir: FIXTURE, disabled: false, intervalMinutes: 60 }

    startWikiSync(config)
    startWikiSync(config)

    expect(setIntervalSpy).toHaveBeenCalledTimes(1)
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 3_600_000)
    await vi.waitFor(() => expect(wikiStore.get()?.commit).toBe('c1'))
    expect(ensureCheckout).toHaveBeenCalledTimes(1)
  })

  it('runs the initial sync without a timer when the interval is zero', async () => {
    vi.mocked(ensureCheckout).mockResolvedValue({ action: 'cloned', commit: 'c2', changed: true })
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')

    startWikiSync({ repoUrl: 'x', dataDir: FIXTURE, disabled: false, intervalMinutes: 0 })
    startWikiSync({ repoUrl: 'x', dataDir: FIXTURE, disabled: false, intervalMinutes: 0 })

    expect(setIntervalSpy).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(wikiStore.get()?.commit).toBe('c2'))
    // Stays idempotent without a timer to guard it, and says so once.
    expect(ensureCheckout).toHaveBeenCalledTimes(1)
    expect(console.log).toHaveBeenCalledWith('[wiki] periodic sync disabled (interval 0)')
  })
})
