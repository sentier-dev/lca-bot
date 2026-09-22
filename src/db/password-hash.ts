import { sql } from 'drizzle-orm'

/**
 * bcrypt work factor for every password hash the app writes. Raising it later
 * only affects new hashes; existing ones keep verifying at their own cost.
 */
export const BCRYPT_COST = 12

export function passwordHashSql(password: string) {
  return sql`crypt(${password}, gen_salt('bf', ${BCRYPT_COST}))`
}
