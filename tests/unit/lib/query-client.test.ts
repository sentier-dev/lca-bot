import { describe, it, expect } from 'vitest'
import { getQueryClient } from '@/lib/query-client'

describe('getQueryClient', () => {
  it('returns a singleton in the browser so the cache survives shell remounts', () => {
    const first = getQueryClient()
    const second = getQueryClient()
    expect(second).toBe(first)
  })

  it('configures invalidation-driven freshness: nothing goes stale on its own', () => {
    const queries = getQueryClient().getDefaultOptions().queries
    expect(queries?.staleTime).toBe(Infinity)
    expect(queries?.gcTime).toBe(Infinity)
    expect(queries?.refetchOnWindowFocus).toBe(false)
    expect(queries?.refetchOnReconnect).toBe(false)
    expect(queries?.retry).toBe(1)
  })
})
