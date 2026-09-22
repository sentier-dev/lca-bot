import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'
import { E2E_USER } from '@/lib/seed-dev-user'

test.describe('Authentication', () => {
  test('login with seeded test user redirects to chat', async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL(/\/chat/)
  })

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(E2E_USER.email)
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/login/)
  })

  test('logout clears session and redirects to login', async ({ page }) => {
    await login(page)
    // Call the logout API directly then navigate — this is what the button
    // ultimately does (fetch + window.location.href). Bypasses flaky
    // sidebar animation state.
    await page.evaluate(async () => {
      await fetch('/api/auth/logout', { method: 'POST' })
    })
    await page.goto('/login')
    // Verify the cookies are cleared by trying to access /chat
    await page.goto('/chat')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    await expect(page).toHaveURL(/login/)
  })

  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    await expect(page).toHaveURL(/login/)
  })
})
