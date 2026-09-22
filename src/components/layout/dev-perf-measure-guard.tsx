'use client'

import { useEffect } from 'react'

// Dev-only workaround for vercel/next.js#86060: React 19.2's development
// Server Components performance track can call performance.measure with a
// negative timestamp after a dev-server restart, throwing a TypeError that
// the overlay treats as a page error and that blocks client-side navigation.
// measure() is purely diagnostic, so swallowing its failures loses nothing.
// Rendered only when NODE_ENV !== 'production' (see root layout).
export function DevPerfMeasureGuard() {
  useEffect(() => {
    const original = window.performance.measure.bind(window.performance)
    window.performance.measure = ((...args: Parameters<Performance['measure']>) => {
      try {
        return original(...args)
      } catch {
        return undefined as unknown as PerformanceMeasure
      }
    }) as Performance['measure']
    return () => {
      window.performance.measure = original
    }
  }, [])

  return null
}
