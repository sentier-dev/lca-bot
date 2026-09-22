'use client'

import { useFormatter } from 'next-intl'
import { useMounted } from '@/hooks/use-mounted'

// next-intl narrows Intl.DateTimeFormatOptions' string-literal unions (e.g.
// `timeZoneName` drops "shortOffset"/"longGeneric") and doesn't export that
// narrowed type from the package root, so `Intl.DateTimeFormatOptions`
// itself isn't assignable to what `useFormatter().dateTime` accepts. Only
// declare the fields both call sites actually pass.
type DateFormatOptions = {
  year?: 'numeric' | '2-digit'
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow'
  day?: 'numeric' | '2-digit'
}

const DEFAULT_FORMAT_OPTIONS: DateFormatOptions = { month: 'short', day: 'numeric' }

interface ClientDateProps {
  iso: string
  className?: string
  formatOptions?: DateFormatOptions
}

/**
 * Renders a locale-formatted date on the client only. Server-rendered HTML
 * would use UTC while the browser uses the user's local timezone, which can
 * cross a day boundary and trigger a hydration mismatch. Rendering an empty
 * placeholder on first paint and the formatted date after mount avoids the
 * mismatch entirely — `useMounted` (useSyncExternalStore) drives that switch
 * without a setState-in-effect.
 *
 * Shared by project-card (dashboard) and book-card (library); keep both
 * call sites' rendered output byte-identical when changing this.
 */
export function ClientDate({ iso, className, formatOptions = DEFAULT_FORMAT_OPTIONS }: ClientDateProps) {
  const format = useFormatter()
  const mounted = useMounted()
  const d = new Date(iso)
  const label = mounted && !isNaN(d.getTime()) ? format.dateTime(d, formatOptions) : ''
  return (
    <time className={className} dateTime={iso} suppressHydrationWarning>
      {label}
    </time>
  )
}
