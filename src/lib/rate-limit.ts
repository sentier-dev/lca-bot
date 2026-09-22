// In-memory sliding-window limiter. Correct while the app runs as exactly one
// instance (compose locally, max_instance_count = 1 on Cloud Run). Moving to
// more instances means moving this to Postgres; the call sites stay the same.

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number // epoch ms when the oldest hit leaves the window
}

export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>()

  constructor(private readonly limit: number, private readonly windowMs: number) {}

  private prune(key: string, now: number): number[] {
    const cutoff = now - this.windowMs
    const kept = (this.hits.get(key) ?? []).filter((t) => t > cutoff)
    if (kept.length === 0) this.hits.delete(key)
    else this.hits.set(key, kept)
    return kept
  }

  hit(key: string): RateLimitResult {
    const now = Date.now()
    const kept = this.prune(key, now)
    if (kept.length >= this.limit) {
      return { success: false, limit: this.limit, remaining: 0, reset: kept[0] + this.windowMs }
    }
    kept.push(now)
    this.hits.set(key, kept)
    return { success: true, limit: this.limit, remaining: this.limit - kept.length, reset: kept[0] + this.windowMs }
  }

  peek(key: string): RateLimitResult {
    const now = Date.now()
    const kept = this.prune(key, now)
    const remaining = Math.max(0, this.limit - kept.length)
    return { success: remaining > 0, limit: this.limit, remaining, reset: (kept[0] ?? now) + this.windowMs }
  }

  clear(): void {
    this.hits.clear()
  }
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE

// Keyed by IP unless noted. Auth routes only; the chat itself is not capped (D7).
const limiters = {
  'auth-login': new SlidingWindowLimiter(10, MINUTE),
  'auth-login-email': new SlidingWindowLimiter(5, 15 * MINUTE),   // keyed by normalised email, failures only
  'auth-refresh': new SlidingWindowLimiter(60, 15 * MINUTE),
  'set-password': new SlidingWindowLimiter(10, 15 * MINUTE),
  'forgot-password': new SlidingWindowLimiter(5, HOUR),
  'password-change': new SlidingWindowLimiter(5, 15 * MINUTE),     // keyed by user id
  'account-action': new SlidingWindowLimiter(3, HOUR),             // keyed by user id
  'oauth-init': new SlidingWindowLimiter(20, 15 * MINUTE),
  'oauth-callback': new SlidingWindowLimiter(20, 15 * MINUTE),
  'wiki-sync': new SlidingWindowLimiter(30, MINUTE),               // Plan 2
} as const

export type RateLimitKey = keyof typeof limiters

function isProd(): boolean {
  return process.env.NODE_ENV === 'production'
}

const BYPASS: RateLimitResult = { success: true, limit: 9999, remaining: 9999, reset: 0 }

// Dev and test bypass: brute-force risk only exists in production, and the
// e2e suite logs in many times from one IP.
export async function checkRateLimit(identifier: string, key: RateLimitKey): Promise<RateLimitResult> {
  if (!isProd()) return BYPASS
  return limiters[key].hit(identifier)
}

export async function peekRateLimit(identifier: string, key: RateLimitKey): Promise<RateLimitResult> {
  if (!isProd()) return BYPASS
  return limiters[key].peek(identifier)
}

export function resetRateLimitsForTests(): void {
  for (const limiter of Object.values(limiters)) limiter.clear()
}
