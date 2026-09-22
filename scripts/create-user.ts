// Usage: npm run create-user -- <email> [--password <pwd>] [--google-only]
// The only way to create an account (spec D5). Prints a generated password
// when none is given. --google-only creates an account with no password that
// signs in with Google once the verified Google email matches.
import { pathToFileURL } from 'node:url'
import type { Sql } from 'postgres'
import { parseCreateUserArgs } from './lib/args'
import { generatePassword } from './lib/password'
import { scriptSql } from './lib/db'
import { passwordHashFragment } from './lib/password-hash'

export async function createUserFromArgs(argv: string[], sql: Sql) {
  const args = parseCreateUserArgs(argv)
  const [existing] = await sql`SELECT id FROM auth.users WHERE email = ${args.email}`
  if (existing) throw new Error(`An account for ${args.email} already exists`)

  const password = args.googleOnly ? null : (args.password ?? generatePassword())
  const [row] = await sql`
    INSERT INTO auth.users (email, password_hash, provider)
    VALUES (
      ${args.email},
      ${password === null ? null : passwordHashFragment(sql, password)},
      ${args.googleOnly ? 'google' : 'email'}
    )
    RETURNING id, email
  `
  return { id: row.id as string, email: row.email as string, password, generated: !args.googleOnly && !args.password }
}

async function main() {
  const sql = scriptSql()
  try {
    const result = await createUserFromArgs(process.argv.slice(2), sql)
    console.log(`Created ${result.email} (${result.id})`)
    if (result.password && result.generated) console.log(`Generated password: ${result.password}`)
    if (!result.password) console.log('Google-only account: sign in with "Continue with Google".')
  } finally {
    await sql.end()
  }
}

// Run main() only when this file is the entry point, so importing it from a
// test does not execute the script.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
