import { describe, it, expect, afterEach, vi } from 'vitest'
import { isGoogleOAuthConfigured } from '@/lib/auth/google-oauth-flag'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isGoogleOAuthConfigured', () => {
  it('is true when both client ID and secret are present', () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'id-123')
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'secret-456')
    expect(isGoogleOAuthConfigured()).toBe(true)
  })

  it('is false when the client ID is missing', () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', '')
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'secret-456')
    expect(isGoogleOAuthConfigured()).toBe(false)
  })

  it('is false when the secret is missing (callback exchange would fail)', () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'id-123')
    vi.stubEnv('GOOGLE_CLIENT_SECRET', '')
    expect(isGoogleOAuthConfigured()).toBe(false)
  })
})
