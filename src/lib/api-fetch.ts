import { fetchWithRefresh } from './auth/refresh-client'
import { isSafeInternalPath } from './auth/safe-internal-path'

/**
 * Wrapper around fetch for authenticated client-side API calls. Silently
 * refreshes an expired session and retries once (see fetchWithRefresh);
 * redirects to /login only when the retried request is still 401.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetchWithRefresh(input, init)
  if (res.status === 401 && typeof window !== 'undefined') {
    const pathname = window.location.pathname
    window.location.href = isSafeInternalPath(pathname)
      ? `/login?redirectedFrom=${encodeURIComponent(pathname)}`
      : '/login'
    // Return a never-resolving promise so callers don't continue processing
    return new Promise(() => {})
  }
  return res
}
