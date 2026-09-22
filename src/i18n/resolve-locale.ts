import { DEFAULT_LOCALE, type Locale } from './locales'

export async function resolveLocale(): Promise<Locale> {
  return DEFAULT_LOCALE
}
