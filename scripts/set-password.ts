// Usage: npm run set-password -- <email> [--password <pwd>]
// Resets a password from the terminal, for when no email provider is configured.
import { pathToFileURL } from 'node:url'
import type { Sql } from 'postgres'
import { parseEmailArg } from './lib/args'
import { isPasswordValid, PASSWORD_REQUIREMENTS_TEXT } from '../src/lib/validation/password'
import { generatePassword } from './lib/password'
import { scriptSql } from './lib/db'
import { passwordHashFragment } from './lib/password-hash'

export interface SetPasswordResult {
  email: string
  password: string
  generated: boolean
}

export async function setPasswordFromArgs(argv: string[], sql: Sql): Promise<SetPasswordResult> {
  const [emailArg, flag, value] = argv
  const email = parseEmailArg(emailArg)
  let password = generatePassword()
  const generated = flag !== '--password'
  if (flag === '--password') {
    if (!value || !isPasswordValid(value)) throw new Error(PASSWORD_REQUIREMENTS_TEXT)
    password = value
  } else if (flag) {
    throw new Error(`Unknown argument: ${flag}`)
  }
  const [row] = await sql`
    UPDATE auth.users SET password_hash = ${passwordHashFragment(sql, password)}, updated_at = now()
    WHERE email = ${email} RETURNING id
  `
  if (!row) throw new Error(`No account for ${email}`)
  return { email, password, generated }
}

async function main() {
  const sql = scriptSql()
  try {
    const result = await setPasswordFromArgs(process.argv.slice(2), sql)
    console.log(`Password updated for ${result.email}`)
    if (result.generated) console.log(`New password: ${result.password}`)
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
