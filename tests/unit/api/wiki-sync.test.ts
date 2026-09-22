import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockSyncOnce = vi.fn()
vi.mock('@/lib/wiki/sync', () => ({ syncOnce: (...a: unknown[]) => mockSyncOnce(...a) }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue({ success: true }) }))

function req(secret?: string) {
  return new NextRequest('http://localhost:3000/api/wiki/sync', {
    method: 'POST',
    headers: secret ? { 'x-wiki-sync-secret': secret } : {},
  })
}

describe('POST /api/wiki/sync', () => {
  beforeEach(() => {
    vi.resetModules()
    mockSyncOnce.mockReset()
    mockSyncOnce.mockResolvedValue({ ready: true, commit: 'c2', syncedAt: 'now', pageCount: 12, lastError: null })
  })

  it('refuses when no secret is configured', async () => {
    vi.stubEnv('WIKI_SYNC_SECRET', '')
    const { POST } = await import('@/app/api/wiki/sync/route')
    expect((await POST(req('anything'))).status).toBe(403)
    vi.unstubAllEnvs()
  })

  it('refuses a wrong secret and runs the sync for the right one', async () => {
    vi.stubEnv('WIKI_SYNC_SECRET', 's3cret')
    const { POST } = await import('@/app/api/wiki/sync/route')
    expect((await POST(req('nope'))).status).toBe(403)
    const ok = await POST(req('s3cret'))
    expect(ok.status).toBe(200)
    expect(await ok.json()).toMatchObject({ commit: 'c2' })
    expect(mockSyncOnce).toHaveBeenCalledTimes(1)
    vi.unstubAllEnvs()
  })
})
