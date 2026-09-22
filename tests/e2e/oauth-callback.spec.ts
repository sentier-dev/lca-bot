import { test, expect } from '@playwright/test'

// The Google OAuth callback route hard-codes Google's token/userinfo URLs —
// there is no injection seam for mocking. These are smoke tests that exercise
// error paths only; the happy path requires a real Google authorization code.

test.describe('Google OAuth callback', () => {
  test('callback without ?code redirects to login with missing_code', async ({ page }) => {
    // Navigate directly — the route redirects, so follow redirects via page.goto
    const response = await page.goto('/api/auth/google/callback')

    expect(page.url()).toMatch(/\/login\?error=missing_code$/)
    // No 5xx — the route must not crash on missing params
    if (response) {
      expect(response.status()).toBeLessThan(500)
    }
  })

  test('stale callback redirects to /login?error=invalid_state', async ({ page }) => {
    // A code with a state that no longer matches the lw-oauth-state cookie is
    // rejected before any call to Google.
    const response = await page.goto('/api/auth/google/callback?code=not-a-real-code&state=bogus')

    expect(page.url()).toMatch(/\/login\?error=invalid_state$/)
    if (response) {
      expect(response.status()).toBeLessThan(500)
    }
  })
})
