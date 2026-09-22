import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'
import { E2E_USER } from '@/lib/seed-dev-user'

test.describe('Password Change', () => {
  test('change password form is visible on settings page', async ({ page }) => {
    await login(page)
    await page.goto('/settings')
    await expect(page.getByText(/change password/i)).toBeVisible({ timeout: 10_000 })
  })

  test('change password with wrong current password shows error', async ({ page }) => {
    await login(page)
    await page.goto('/settings')
    await page.waitForURL('**/settings', { timeout: 10_000 })

    // Fill the password form with incorrect current password
    const currentPwd = page.locator('input[type="password"]').nth(0)
    const newPwd = page.locator('input[type="password"]').nth(1)
    const confirmPwd = page.locator('input[type="password"]').nth(2)

    await currentPwd.fill('wrongpassword')
    await newPwd.fill('Newpassword1!')
    await confirmPwd.fill('Newpassword1!')

    await page.getByRole('button', { name: /change password/i }).click()

    // Should show error about incorrect current password
    await expect(page.locator('.text-error').or(page.locator('[role="alert"]'))).toBeVisible({ timeout: 10_000 })
  })

  test('change password with mismatched passwords shows error', async ({ page }) => {
    await login(page)
    await page.goto('/settings')
    await page.waitForURL('**/settings', { timeout: 10_000 })

    const currentPwd = page.locator('input[type="password"]').nth(0)
    const newPwd = page.locator('input[type="password"]').nth(1)
    const confirmPwd = page.locator('input[type="password"]').nth(2)

    await currentPwd.fill(E2E_USER.password)
    await newPwd.fill('Newpassword1!')
    await confirmPwd.fill('Differentpw1!')

    await page.getByRole('button', { name: /change password/i }).click()

    // Should show mismatch error (client-side validation)
    await expect(page.getByText(/do not match/i)).toBeVisible({ timeout: 5_000 })
  })
})
