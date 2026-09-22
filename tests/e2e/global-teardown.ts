import postgres from 'postgres'
import { E2E_USER } from '@/lib/seed-dev-user'

/**
 * Playwright globalTeardown — runs once after the entire spec suite.
 *
 * Hard-deletes every conversation owned by the dedicated E2E user. The user
 * row itself stays so the next run can log in without re-seeding.
 *
 * The dev user (dev@lca-wiki.local) is intentionally untouched so the
 * human-facing dev account never gets polluted by test runs.
 */
export default async function globalTeardown() {
  const url =
    process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:54322/postgres'
  const sql = postgres(url, { max: 2 })
  try {
    const rows = await sql<{ id: string }[]>`
      SELECT id FROM auth.users WHERE email = ${E2E_USER.email}
    `
    if (rows.length === 0) {
      console.log(`[e2e teardown] ${E2E_USER.email} not seeded — nothing to wipe`)
      return
    }
    const userId = rows[0].id
    const deleted = await sql<{ id: string }[]>`
      DELETE FROM conversations WHERE user_id = ${userId} RETURNING id
    `
    console.log(`[e2e teardown] removed ${deleted.length} conversation(s) owned by ${E2E_USER.email}`)
  } finally {
    await sql.end()
  }
}
