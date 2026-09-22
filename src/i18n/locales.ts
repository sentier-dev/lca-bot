// English only in v1 (spec D10). next-intl stays so strings live in
// messages/en.json rather than in components; adding a locale later means
// adding it here and a messages/<locale>.json file.
export const SUPPORTED_LOCALES = ['en'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}
