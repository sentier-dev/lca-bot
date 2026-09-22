import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('env validation', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('throws when required env var is missing', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    expect(() => {
      vi.resetModules()
      return import('@/lib/env')
    }).rejects.toThrow('Missing required environment variable')
  })

  it('does not require ANTHROPIC_API_KEY when MOCK_ANTHROPIC=1', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    vi.stubEnv('MOCK_ANTHROPIC', '1')
    vi.stubEnv('JWT_SECRET', 'x'.repeat(40))
    vi.stubEnv('DATABASE_URL', 'postgres://x')
    vi.resetModules()
    const { env } = await import('@/lib/env')
    expect(env.anthropic.mock).toBe(true)
    expect(env.anthropic.chatModel).toBe('claude-opus-5')
  })

  it('falls back to a 60 minute wiki sync interval when the value is not a positive number', async () => {
    vi.stubEnv('MOCK_ANTHROPIC', '1')
    vi.stubEnv('JWT_SECRET', 'x'.repeat(40))
    vi.stubEnv('DATABASE_URL', 'postgres://x')
    for (const raw of ['', 'soon', '0', '-5', 'NaN']) {
      vi.stubEnv('WIKI_SYNC_INTERVAL_MINUTES', raw)
      vi.resetModules()
      const { env } = await import('@/lib/env')
      expect(env.wiki.syncIntervalMinutes).toBe(60)
    }
  })

  it('keeps a valid wiki sync interval', async () => {
    vi.stubEnv('MOCK_ANTHROPIC', '1')
    vi.stubEnv('JWT_SECRET', 'x'.repeat(40))
    vi.stubEnv('DATABASE_URL', 'postgres://x')
    vi.stubEnv('WIKI_SYNC_INTERVAL_MINUTES', '15')
    vi.resetModules()
    const { env } = await import('@/lib/env')
    expect(env.wiki.syncIntervalMinutes).toBe(15)
  })
})
