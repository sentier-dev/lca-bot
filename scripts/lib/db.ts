import { createPostgresClient } from '../../src/db/connection'

/** Plain postgres-js client for scripts; reads DATABASE_URL like the app. */
export function scriptSql() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required (e.g. postgres://postgres:postgres@localhost:54322/postgres)')
  // One connection: a script does its work and exits.
  return createPostgresClient(url, { max: 1 })
}
