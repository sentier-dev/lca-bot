import { test, expect } from '@playwright/test'

// Google sign-in is find-only and optional: the button renders only when both
// GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set on the server
// (src/lib/auth/google-oauth-flag.ts). The compose stack leaves them empty.
test.describe('Google OAuth', () => {
  test('login page hides the Google button when OAuth is unconfigured', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /continue with google/i })).toHaveCount(0)
  })

  test('Google OAuth API responds appropriately', async ({ page }) => {
    await page.goto('/login')

    // Call the OAuth endpoint — behavior depends on whether GOOGLE_CLIENT_ID is set.
    // Per the Fetch spec, a `redirect: 'manual'` fetch never surfaces the
    // real 307 status or Location header for a same-origin-triggered
    // cross-origin redirect — it reports an opaque response with
    // `type: 'opaqueredirect'` and `status: 0`. The redirect actually
    // happening (not its target) is the only thing observable from here.
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/auth/google', { redirect: 'manual' })
      return {
        status: res.status,
        type: res.type,
        body: res.type === 'opaqueredirect' ? null : await res.json().catch(() => null),
      }
    })

    if (response.type === 'opaqueredirect') {
      // Google OAuth is configured — the route redirected somewhere.
      expect(response.status).toBe(0)
    } else {
      // Google OAuth not configured in dev — should return 500 with clear error
      expect(response.status).toBe(500)
      expect(response.body?.error).toContain('not configured')
    }
  })
})
