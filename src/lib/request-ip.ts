import type { NextRequest } from 'next/server'

// Client IP for rate-limit keying. The FIRST x-forwarded-for entry is
// client-controlled (callers can prepend arbitrary values before our edge
// appends the real peer address), so keying on it lets an attacker mint a
// fresh rate-limit bucket per request. The LAST entry is appended by our own
// edge (Cloud Run front end) from the actual TCP connection and cannot be
// spoofed.
export function clientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for')
  if (!xff) return 'unknown'
  const parts = xff.split(',').map((p) => p.trim()).filter(Boolean)
  return parts[parts.length - 1] ?? 'unknown'
}
