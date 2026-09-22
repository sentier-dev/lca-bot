/**
 * Client-side session refresh. The access token cookie lives 1 hour; nothing
 * refreshes it automatically, so a client fetch that lands after it expires
 * gets a bare 401. `fetchWithRefresh` retries such a request once, after
 * silently exchanging the (still-live, 7 day) refresh cookie for a new pair
 * via POST /api/auth/refresh.
 */

// Shared by every concurrent caller so two 401s in flight at once trigger a
// single POST /api/auth/refresh instead of a pair racing to mint two fresh
// cookie pairs.
let inFlightRefresh: Promise<boolean> | null = null

export async function refreshSession(): Promise<boolean> {
  if (inFlightRefresh) return inFlightRefresh

  inFlightRefresh = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' })
      return res.status === 200
    } catch {
      return false
    } finally {
      inFlightRefresh = null
    }
  })()

  return inFlightRefresh
}

/**
 * fetch wrapper that retries once on a 401, after a silent refresh. Rebuilds
 * the retry request from `init` rather than reusing anything from the first
 * attempt, so a one-shot stream body from the original call is never replayed.
 */
export async function fetchWithRefresh(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, init)
  if (res.status !== 401) return res

  const refreshed = await refreshSession()
  if (!refreshed) return res

  return fetch(input, init ? { ...init } : init)
}
