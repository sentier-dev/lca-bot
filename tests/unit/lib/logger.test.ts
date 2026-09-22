import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('logger', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('defaults to debug level outside production', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('LOG_LEVEL', undefined)
    const { logger } = await import('@/lib/logger')
    expect(logger.level).toBe('debug')
  })

  it('defaults to info level in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('LOG_LEVEL', undefined)
    const { logger } = await import('@/lib/logger')
    expect(logger.level).toBe('info')
  })

  it('honours LOG_LEVEL over the NODE_ENV default', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('LOG_LEVEL', 'warn')
    const { logger } = await import('@/lib/logger')
    expect(logger.level).toBe('warn')
  })

  it('LOG_LEVEL also wins in development', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('LOG_LEVEL', 'error')
    const { logger } = await import('@/lib/logger')
    expect(logger.level).toBe('error')
  })

  it('production config emits a string level label and an ISO timestamp', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('LOG_LEVEL', 'info')
    const lines: string[] = []
    const writeSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation((chunk: unknown) => {
        lines.push(String(chunk))
        return true
      })
    try {
      const { logger } = await import('@/lib/logger')
      logger.info({ hello: 'world' }, 'a message')
    } finally {
      writeSpy.mockRestore()
    }
    expect(lines.length).toBeGreaterThan(0)
    const record = JSON.parse(lines[0]) as { level: string; time: string; msg: string; hello: string }
    expect(record.level).toBe('info')
    expect(record.msg).toBe('a message')
    expect(record.hello).toBe('world')
    // pino.stdTimeFunctions.isoTime writes an ISO-8601 string, not epoch millis.
    expect(typeof record.time).toBe('string')
    expect(Number.isNaN(Date.parse(record.time))).toBe(false)
  })

  it('exposes the standard pino level helpers', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('LOG_LEVEL', 'silent')
    const { logger } = await import('@/lib/logger')
    for (const method of ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const) {
      expect(typeof logger[method]).toBe('function')
    }
    expect(() => logger.child({ scope: 'test' })).not.toThrow()
  })
})
