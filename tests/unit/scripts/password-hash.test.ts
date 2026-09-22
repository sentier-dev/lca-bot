import { describe, it, expect } from 'vitest'
import type { Sql } from 'postgres'
import { passwordHashFragment } from '../../../scripts/lib/password-hash'

/** Minimal stand-in for postgres-js's tagged template, recording what it was given. */
function fakeSql() {
  const calls: Array<{ strings: readonly string[]; values: unknown[] }> = []
  const sql = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    calls.push({ strings: [...strings], values })
    return { strings: [...strings], values }
  }) as unknown as Sql
  return { sql, calls }
}

describe('passwordHashFragment', () => {
  it('hashes with bcrypt at cost 12 and passes the password as a bound value', () => {
    const { sql, calls } = fakeSql()

    passwordHashFragment(sql, 'Correct-horse-1!')

    expect(calls).toHaveLength(1)
    expect(calls[0].strings.join('?')).toContain("gen_salt('bf', 12)")
    expect(calls[0].strings.join('?')).toContain('crypt(')
    expect(calls[0].values).toEqual(['Correct-horse-1!'])
  })

  it('never interpolates the password into the SQL text', () => {
    const { sql, calls } = fakeSql()

    passwordHashFragment(sql, "'; DROP TABLE auth.users; --")

    expect(calls[0].strings.join('')).not.toContain('DROP TABLE')
  })
})
