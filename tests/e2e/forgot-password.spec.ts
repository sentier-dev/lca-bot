import { randomBytes, createHash } from 'node:crypto'
import { test, expect, type Page } from '@playwright/test'
import postgres from 'postgres'
import { APP_URL } from './helpers/base-url'
import { readLatestEmailLog } from './helpers/app-logs'

const ONE_HOUR_MS = 60 * 60 * 1000

/**
 * E2E coverage for the forgot-password flow.
 *
 * Exercises the user-visible surfaces:
 *   1. /forgot-password — form renders, submits, shows confirmation
 *   2. Email is logged to stdout (dev mode, no RESEND_API_KEY)
 *   3. /set-password?token=<X> — token from the email link resets the password
 *   4. An expired (or already used) token shows an error instead
 *
 * Email verification uses the dev-mode stdout logger. The test reads Docker
 * container logs to extract the magic link, then drives the /set-password
 * page with the real token. This validates the full flow end-to-end without
 * requiring a real Resend account.
 */

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:54322/postgres'

function extractTokenFromUrl(url: string): string | null {
  const match = url.match(/[?&]token=([A-Za-z0-9_-]+)/)
  return match?.[1] ?? null
}

async function assertSignedInAs(page: Page, expectedEmail: string): Promise<void> {
  const me = await page.evaluate(async () => {
    const r = await fetch('/api/auth/me')
    return { status: r.status, body: await r.json().catch(() => null) }
  })
  expect(me.status).toBe(200)
  expect(me.body?.user?.email).toBe(expectedEmail)
}

test.describe('Forgot password flow', () => {
  let sql: postgres.Sql
  let appReachable = false
  const createdEmails: string[] = []

  test.beforeAll(async () => {
    sql = postgres(DATABASE_URL, { max: 2 })
    try {
      const res = await fetch(`${APP_URL}/login`, { redirect: 'manual' })
      appReachable = res.status !== 404
    } catch {
      appReachable = false
    }
  })

  test.beforeEach(() => {
    test.skip(
      !appReachable,
      `LCA Wiki app stack not reachable on ${APP_URL}`,
    )
  })

  test.afterAll(async () => {
    for (const email of createdEmails) {
      try {
        await sql`DELETE FROM auth.users WHERE email = ${email}`
      } catch { /* swallow */ }
    }
    await sql.end()
  })

  test('forgot-password page renders correctly', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page.getByRole('heading', { name: /forgot your password/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()
  })

  test('submitting shows confirmation regardless of email existence', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.getByLabel(/email/i).fill('nobody-ever@test.local')
    await page.getByRole('button', { name: /send reset link/i }).click()

    await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText(/reset link is on its way/i)).toBeVisible()
  })

  test('full reset flow: submit email, extract token from logs, set new password, sign in', async ({
    browser,
  }) => {
    const email = `fp-e2e-${Date.now()}@test.local`
    const originalPassword = 'original-pass-123'
    const newPassword = 'Reset-pass4!'
    createdEmails.push(email)

    // Seed a user with a password.
    await sql`
      INSERT INTO auth.users (email, password_hash, provider)
      VALUES (${email}, crypt(${originalPassword}, gen_salt('bf')), 'email')
    `

    const ctx = await browser.newContext()
    const page = await ctx.newPage()

    // Step 1: Submit the forgot-password form.
    await page.goto('/forgot-password')
    await page.getByLabel(/email/i).fill(email)
    await page.getByRole('button', { name: /send reset link/i }).click()
    await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible({
      timeout: 10_000,
    })

    // Step 2: Extract the reset link from Docker logs.
    // The send is fire-and-forget, so poll until the log line flushes.
    await expect
      .poll(() => readLatestEmailLog(email)?.url ?? null, { timeout: 10_000 })
      .not.toBeNull()
    const emailLog = readLatestEmailLog(email)
    expect(emailLog!.subject).toMatch(/reset/i)

    const token = extractTokenFromUrl(emailLog!.url!)
    expect(token).not.toBeNull()

    // Step 3: Navigate to /set-password with the extracted token and set a new password.
    await page.goto(`/set-password?token=${token}`)
    await expect(page.getByRole('heading', { name: /set your password/i })).toBeVisible()
    await page.getByLabel(/new password/i).fill(newPassword)
    await page.getByLabel(/^confirm password$/i).fill(newPassword)
    await page.getByRole('button', { name: /set password/i }).click()
    await page.waitForURL('**/chat', { timeout: 10_000 })
    await assertSignedInAs(page, email)

    // Step 4: Log out and verify we can sign in with the new password.
    await page.evaluate(async () => {
      await fetch('/api/auth/logout', { method: 'POST' })
    })
    await page.goto('/login')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(newPassword)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL('**/chat', { timeout: 10_000 })
    await assertSignedInAs(page, email)

    // Step 5: Old password no longer works.
    await page.evaluate(async () => {
      await fetch('/api/auth/logout', { method: 'POST' })
    })
    await page.goto('/login')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(originalPassword)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/login/)

    await ctx.close()
  })

  test('expired token shows error on /set-password', async ({ browser }) => {
    const email = `fp-expired-${Date.now()}@test.local`
    createdEmails.push(email)

    const [user] = await sql<{ id: string }[]>`
      INSERT INTO auth.users (email, password_hash, provider)
      VALUES (${email}, crypt('some-pass', gen_salt('bf')), 'email')
      RETURNING id
    `

    // Seed an expired token directly (expires_at in the past).
    const secret = randomBytes(32).toString('base64url')
    const hash = createHash('sha256').update(secret).digest('hex')
    const expiredAt = new Date(Date.now() - ONE_HOUR_MS)
    await sql`
      INSERT INTO public.password_reset_tokens (user_id, token_hash, purpose, expires_at)
      VALUES (${user.id}, ${hash}, 'reset', ${expiredAt})
    `

    const ctx = await browser.newContext()
    const page = await ctx.newPage()

    await page.goto(`/set-password?token=${secret}`)
    await page.getByLabel(/new password/i).fill('Newpassword1!')
    await page.getByLabel(/^confirm password$/i).fill('Newpassword1!')
    await page.getByRole('button', { name: /set password/i }).click()

    await expect(page.getByText(/expired or already used/i)).toBeVisible({ timeout: 5_000 })
    expect(page.url()).toContain('/set-password')

    await ctx.close()
  })
})
