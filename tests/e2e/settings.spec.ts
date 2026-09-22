import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'
import { E2E_USER } from '@/lib/seed-dev-user'

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/settings')
    await page.waitForURL('**/settings', { timeout: 10_000 })
  })

  test('displays account section with user email', async ({ page }) => {
    await expect(page.locator('body')).toContainText(E2E_USER.email)
  })

  test('displays the wiki section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /the wiki/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /lca-wiki on github/i })).toBeVisible()
  })

  test('settings page scrolls fully', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const deleteButton = page.getByRole('button', { name: /delete.*account/i })
      .or(page.getByText(/delete.*account/i))
    await expect(deleteButton.first()).toBeVisible()
  })
})
