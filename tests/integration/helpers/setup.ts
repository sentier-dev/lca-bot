import { beforeEach, afterAll } from 'vitest'
import postgres from 'postgres'

const TEST_DB_URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:54322/postgres'

const sql = postgres(TEST_DB_URL, { max: 5 })

// Seeded users — preserved across test runs so subsequent specs can log in.
// Matched by email (not UUID) so renames from old seed fixtures don't
// leave behind orphaned rows that break login.
const PRESERVED_EMAILS = ['dev@lca-wiki.local', 'e2e@lca-wiki.local', 'laurenz@d-d-s.ch']

export async function cleanDatabase() {
  await sql`DELETE FROM auth.users WHERE email <> ALL(${PRESERVED_EMAILS})`
  await sql`DELETE FROM wiki_gaps WHERE true`
}

beforeEach(async () => {
  await cleanDatabase()
})

afterAll(async () => {
  await cleanDatabase()
  await sql.end()
})
