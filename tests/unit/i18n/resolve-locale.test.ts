import { describe, it, expect } from 'vitest'
import { resolveLocale } from '@/i18n/resolve-locale'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, isLocale } from '@/i18n/locales'

describe('resolveLocale', () => {
  it('resolves to the default locale', async () => {
    await expect(resolveLocale()).resolves.toBe(DEFAULT_LOCALE)
  })

  it('returns a supported locale', async () => {
    const locale = await resolveLocale()
    expect(isLocale(locale)).toBe(true)
    expect(SUPPORTED_LOCALES).toContain(locale)
  })

  it('is stable across calls', async () => {
    const [first, second] = await Promise.all([resolveLocale(), resolveLocale()])
    expect(first).toBe(second)
  })

  it('returns a promise rather than a bare value', () => {
    const result = resolveLocale()
    expect(result).toBeInstanceOf(Promise)
    return expect(result).resolves.toBe('en')
  })
})
