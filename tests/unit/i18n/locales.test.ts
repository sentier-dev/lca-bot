import { describe, it, expect } from 'vitest'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, isLocale } from '@/i18n/locales'

describe('locales', () => {
  it('supports English only in v1', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en'])
    expect(DEFAULT_LOCALE).toBe('en')
    expect(isLocale('en')).toBe(true)
    expect(isLocale('fr')).toBe(false)
  })
})
