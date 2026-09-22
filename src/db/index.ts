import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'
import { createPostgresClient } from './connection'

// During `next build`, env vars are absent: use a dummy URL so the module
// loads without error. No queries run at build time, only at request time.
const connectionString = process.env.DATABASE_URL ??
  (process.env.NEXT_PHASE === 'phase-production-build' ? 'postgresql://localhost/dummy' : '')
if (!connectionString) {
  throw new Error('Missing required environment variable: DATABASE_URL')
}

export const db = drizzle(createPostgresClient(connectionString), { schema })
export type Database = typeof db
