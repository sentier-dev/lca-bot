import { test, expect } from '@playwright/test'
import postgres from 'postgres'
import { login } from './helpers/auth'

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:54322/postgres'

// There is no signup form: accounts are created by the CLI. The spec seeds a
// throwaway account straight into auth.users (same shape as create-user.ts)
// so deleting it cannot take the shared E2E user down with it.
test.describe('Delete account', () => {
  test('settings delete account clears the session and /api/auth/me returns 401', async ({ page }) => {
    test.setTimeout(30_000)
    const email = `delete-${Date.now()}@lca-wiki-test.local`
    const password = 'TestPass!23456'

    const sql = postgres(DATABASE_URL, { max: 2 })
    try {
      await sql`
        INSERT INTO auth.users (email, password_hash, provider)
        VALUES (${email}, crypt(${password}, gen_salt('bf')), 'email')
      `

      await login(page, email, password)

      await page.goto('/settings')

      // Open the delete account dialog — button text is "Delete account"
      await page.getByRole('button', { name: /^delete account$/i }).click()

      // TypedConfirmDialog requires typing "delete my account" (case-insensitive).
      // The input placeholder is the confirmationPhrase itself.
      const confirmInput = page.getByPlaceholder(/delete my account/i)
      await expect(confirmInput).toBeVisible()
      await confirmInput.fill('delete my account')

      // Click the final destructive "Delete" confirm button
      await page.getByRole('button', { name: /^delete$/i }).click()

      // Expect redirect to /login after account deletion
      await page.waitForURL('**/login', { timeout: 10_000 })

      // Session should be cleared — /api/auth/me returns 401
      const meStatus = await page.evaluate(async () => {
        const r = await fetch('/api/auth/me')
        return r.status
      })
      expect(meStatus).toBe(401)

      // And the row is gone.
      const rows = await sql`SELECT id FROM auth.users WHERE email = ${email}`
      expect(rows.length).toBe(0)
    } finally {
      try {
        await sql`DELETE FROM auth.users WHERE email = ${email}`
      } catch { /* already deleted by the test itself */ }
      await sql.end()
    }
  })
})
