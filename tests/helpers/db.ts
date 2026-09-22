import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/db/schema'

const TEST_DB_URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:54322/postgres'

export function createTestDb() {
  const client = postgres(TEST_DB_URL, { max: 1 })
  const db = drizzle(client, { schema })
  return { db, client }
}
