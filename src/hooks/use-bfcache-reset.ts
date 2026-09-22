'use client'

import { useEffect, useRef } from 'react'

// Runs `reset` when the page is restored from the browser's back/forward
// cache. `window.location.href` navigations (OAuth redirect, post-login
// redirect) freeze React state as-is — without this, pressing Back restores
// the page with e.g. loading=true and the whole form stuck disabled.
export function useBfcacheReset(reset: () => void) {
  const resetRef = useRef(reset)

  // Keep the latest callback without re-subscribing the listener. Assigned in
  // an effect (not during render) per the react-hooks refs rule.
  useEffect(() => {
    resetRef.current = reset
  }, [reset])

  useEffect(() => {
    function onPageshow(event: PageTransitionEvent) {
      if (event.persisted) resetRef.current()
    }
    window.addEventListener('pageshow', onPageshow)
    return () => window.removeEventListener('pageshow', onPageshow)
  }, [])
}
