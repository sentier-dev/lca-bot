import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

/**
 * Regression: pressing Back on /login right after logging out must not hand
 * the visitor a working authed page. The session is gone, so the restored
 * document is a dead shell: its API calls 401 and the first real request
 * lands on /login.
 *
 * Why the assertion is phrased that way: `next dev` serves authed HTML as
 * `Cache-Control: no-cache, must-revalidate`, and Chrome replays such a
 * document for a history navigation without asking the server (and may keep
 * it in the bfcache). The production server sends `no-store`, which blocks
 * both, so there the Back navigation is a real request that the middleware
 * redirects. The e2e stack runs the dev server, so the stale pixels can
 * survive a Back there; what must never survive is the session behind them.
 */
test.describe('Post-logout back navigation', () => {
  test('back after logout shows no authed page', async ({ page }) => {
    await login(page)

    // Bypass the sidebar animation: same effect as clicking Log out.
    await page.evaluate(async () => {
      await fetch('/api/auth/logout', { method: 'POST' })
    })
    await page.goto('/login')

    await page.goBack()

    // No session behind the restored page.
    const meStatus = await page.evaluate(async () => (await fetch('/api/auth/me')).status)
    expect(meStatus).toBe(401)

    // And the first request for it bounces to the login page.
    await page.reload()
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    await expect(page.getByLabel('Toggle sidebar')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })
})
