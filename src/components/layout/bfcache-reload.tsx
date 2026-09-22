'use client'

import { useEffect } from 'react'

// Force a fresh load when the browser restores this page from bfcache or via
// a back/forward navigation. Lives as a client component because rendering a
// <script> through React (Next.js 16 / React 19) doesn't execute on client
// renders and emits a warning.
export function BfcacheReload() {
  useEffect(() => {
    const nav = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined
    if (nav?.type === 'back_forward') {
      window.location.reload()
      return
    }

    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) window.location.reload()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  return null
}
