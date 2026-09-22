import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { GetRequestConfigParams, RequestConfig } from 'next-intl/server'

// next-intl's getRequestConfig is an identity wrapper; mocking it keeps the
// test off the react-server entry point while preserving that behaviour, so
// the module's default export is the config factory itself.
vi.mock('next-intl/server', () => ({
  getRequestConfig: (createRequestConfig: unknown) => createRequestConfig,
}))

const { resolveLocaleMock } = vi.hoisted(() => ({
  resolveLocaleMock: vi.fn<() => Promise<string>>(),
}))

vi.mock('@/i18n/resolve-locale', () => ({
  resolveLocale: resolveLocaleMock,
}))

type ConfigFactory = (params: GetRequestConfigParams) => Promise<RequestConfig>

async function loadConfig(): Promise<RequestConfig> {
  vi.resetModules()
  const mod = await import('@/i18n/request')
  const factory = mod.default as unknown as ConfigFactory
  expect(typeof factory).toBe('function')
  return factory({ requestLocale: Promise.resolve(undefined) })
}

describe('i18n request config', () => {
  beforeEach(() => {
    resolveLocaleMock.mockReset()
    resolveLocaleMock.mockResolvedValue('en')
  })

  it('returns the resolved locale', async () => {
    const config = await loadConfig()
    expect(config.locale).toBe('en')
    expect(resolveLocaleMock).toHaveBeenCalledTimes(1)
  })

  it('pins the time zone to UTC so server rendering does not warn', async () => {
    const config = await loadConfig()
    expect(config.timeZone).toBe('UTC')
  })

  it('loads the message catalogue for the locale', async () => {
    const config = await loadConfig()
    const messages = config.messages as Record<string, unknown>
    expect(messages).toBeTruthy()
    expect(typeof messages).toBe('object')
    expect(Object.keys(messages).length).toBeGreaterThan(0)
    expect(messages).toHaveProperty('common')
  })

  it('returns messages equal to the en catalogue', async () => {
    const config = await loadConfig()
    const en = (await import('../../../messages/en.json')).default
    expect(config.messages).toEqual(en)
  })

  it('falls back to the en catalogue when the locale file cannot be imported', async () => {
    resolveLocaleMock.mockResolvedValue('zz-not-a-locale')
    const config = await loadConfig()
    expect(config.locale).toBe('zz-not-a-locale')
    expect(config.timeZone).toBe('UTC')
    const en = (await import('../../../messages/en.json')).default
    expect(config.messages).toEqual(en)
  })

  it('is callable repeatedly and re-resolves the locale each time', async () => {
    vi.resetModules()
    const factory = (await import('@/i18n/request')).default as unknown as ConfigFactory
    const params = { requestLocale: Promise.resolve('en') }
    const first = await factory(params)
    const second = await factory(params)
    expect(resolveLocaleMock).toHaveBeenCalledTimes(2)
    expect(first.locale).toBe(second.locale)
    expect(first.messages).toEqual(second.messages)
  })
})
