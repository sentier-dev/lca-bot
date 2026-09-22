import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SlidingWindowLimiter, checkRateLimit, peekRateLimit, resetRateLimitsForTests } from '@/lib/rate-limit'

describe('SlidingWindowLimiter', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('allows up to the limit inside the window, then refuses', () => {
    const limiter = new SlidingWindowLimiter(3, 60_000)
    expect(limiter.hit('ip-1').success).toBe(true)
    expect(limiter.hit('ip-1').success).toBe(true)
    const third = limiter.hit('ip-1')
    expect(third.success).toBe(true)
    expect(third.remaining).toBe(0)
    const fourth = limiter.hit('ip-1')
    expect(fourth.success).toBe(false)
    expect(fourth.reset).toBeGreaterThan(Date.now())
  })

  it('keys are independent and hits expire after the window', () => {
    const limiter = new SlidingWindowLimiter(1, 1_000)
    expect(limiter.hit('a').success).toBe(true)
    expect(limiter.hit('b').success).toBe(true)
    expect(limiter.hit('a').success).toBe(false)
    vi.advanceTimersByTime(1_001)
    expect(limiter.hit('a').success).toBe(true)
  })

  it('peek reports remaining without consuming', () => {
    const limiter = new SlidingWindowLimiter(2, 60_000)
    expect(limiter.peek('k').remaining).toBe(2)
    limiter.hit('k')
    expect(limiter.peek('k').remaining).toBe(1)
    expect(limiter.peek('k').remaining).toBe(1)
  })
})

describe('checkRateLimit / peekRateLimit', () => {
  beforeEach(() => resetRateLimitsForTests())

  it('bypasses outside production', async () => {
    for (let i = 0; i < 50; i++) {
      expect((await checkRateLimit('1.2.3.4', 'auth-login')).success).toBe(true)
    }
    expect((await peekRateLimit('x', 'auth-login-email')).success).toBe(true)
  })

  it('enforces in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    try {
      let last = { success: true }
      for (let i = 0; i < 11; i++) last = await checkRateLimit('9.9.9.9', 'auth-login')
      expect(last.success).toBe(false)
      expect((await peekRateLimit('9.9.9.9', 'auth-login')).success).toBe(false)
      expect((await checkRateLimit('other', 'auth-login')).success).toBe(true)
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
