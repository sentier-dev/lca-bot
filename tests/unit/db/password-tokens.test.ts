import { describe, it, expect, vi } from 'vitest'

// Stub the db client so importing the queries module doesn't require
// DATABASE_URL. These tests only exercise the pure-function helpers;
// DB-touching functions are covered by integration tests.
vi.mock('@/db', () => ({ db: {} }))

import { hashTokenSecret, generateTokenSecret } from '@/db/queries/password-tokens'

describe('token secret', () => {
  it('generateTokenSecret returns a base64url string >= 43 chars (32 bytes)', () => {
    const secret = generateTokenSecret()
    expect(secret).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(secret.length).toBeGreaterThanOrEqual(43)
  })

  it('hashTokenSecret returns deterministic sha256 hex', () => {
    const h1 = hashTokenSecret('abc')
    const h2 = hashTokenSecret('abc')
    expect(h1).toBe(h2)
    expect(h1).toHaveLength(64)
    expect(h1).toMatch(/^[0-9a-f]{64}$/)
  })

  it('hashTokenSecret produces different output for different input', () => {
    expect(hashTokenSecret('abc')).not.toBe(hashTokenSecret('abd'))
  })

  it('generateTokenSecret returns unique values across calls', () => {
    const secrets = new Set(Array.from({ length: 100 }, () => generateTokenSecret()))
    expect(secrets.size).toBe(100)
  })
})
