import { getRequestConfig } from 'next-intl/server'
import { resolveLocale } from './resolve-locale'

export default getRequestConfig(async () => {
  const locale = await resolveLocale()

  let messages
  try {
    messages = (await import(`../../messages/${locale}.json`)).default
  } catch {
    messages = (await import('../../messages/en.json')).default
  }

  return {
    locale,
    messages,
    // Server-rendered date/time formatting has no browser timezone to read,
    // so next-intl falls back to the JS runtime's default and logs an
    // ENVIRONMENT_FALLBACK warning on every render unless we pin one
    // explicitly. All persisted timestamps are Postgres `timestamptz`
    // (withTimezone: true throughout src/db/schema/*.ts), i.e. stored and
    // read as UTC, so UTC is also the correct fallback for any formatting
    // that happens to run before a client-side ClientDate/useMounted swap
    // picks up the browser's real timezone.
    timeZone: 'UTC',
  }
})
