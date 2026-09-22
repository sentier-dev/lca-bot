import type { Sql } from 'postgres'

// Mirrors BCRYPT_COST in src/db/password-hash.ts for the postgres-js CLI
// scripts, which do not go through drizzle.
export function passwordHashFragment(sql: Sql, password: string) {
  return sql`crypt(${password}, gen_salt('bf', 12))`
}
