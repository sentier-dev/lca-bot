import { describe, it, expect, vi } from 'vitest'
import type { Sql } from 'postgres'
import { setPasswordFromArgs } from '../../../scripts/set-password'

/**
 * Stand-in for postgres-js: the tagged template resolves to `rows`, and nested
 * fragments (the bcrypt hash) come back as plain recorded objects.
 */
function fakeSql(rows: Array<Record<string, unknown>>) {
  const queries: string[] = []
  const sql = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join('?')
    queries.push(text)
    // A nested fragment (gen_salt) is awaited by nobody; only the outer query is.
    if (text.includes('gen_salt')) return { fragment: true, values }
    return Promise.resolve(rows)
  }) as unknown as Sql
  return { sql, queries }
}

describe('setPasswordFromArgs', () => {
  it('generates a password when none is given and reports it as generated', async () => {
    const { sql, queries } = fakeSql([{ id: 'user-1' }])

    const result = await setPasswordFromArgs(['someone@lca.test'], sql)

    expect(result.email).toBe('someone@lca.test')
    expect(result.generated).toBe(true)
    expect(result.password).toHaveLength(20)
    expect(queries.some((q) => q.includes('UPDATE auth.users'))).toBe(true)
    expect(queries.some((q) => q.includes("gen_salt('bf', 12)"))).toBe(true)
  })

  it('uses an explicit password and does not report it as generated', async () => {
    const { sql } = fakeSql([{ id: 'user-1' }])

    const result = await setPasswordFromArgs(['someone@lca.test', '--password', 'Chosen-pass-1!'], sql)

    expect(result.password).toBe('Chosen-pass-1!')
    expect(result.generated).toBe(false)
  })

  it('rejects an explicit password that fails the requirements', async () => {
    const { sql } = fakeSql([{ id: 'user-1' }])
    await expect(setPasswordFromArgs(['someone@lca.test', '--password', 'short'], sql)).rejects.toThrow(/at least 10/i)
  })

  it('rejects a --password flag with no value', async () => {
    const { sql } = fakeSql([{ id: 'user-1' }])
    await expect(setPasswordFromArgs(['someone@lca.test', '--password'], sql)).rejects.toThrow(/at least 10/i)
  })

  it('rejects an unknown flag', async () => {
    const { sql } = fakeSql([{ id: 'user-1' }])
    await expect(setPasswordFromArgs(['someone@lca.test', '--nope'], sql)).rejects.toThrow('Unknown argument: --nope')
  })

  it('rejects a missing email', async () => {
    const { sql } = fakeSql([{ id: 'user-1' }])
    await expect(setPasswordFromArgs([], sql)).rejects.toThrow()
  })

  it('throws when no account matches the email', async () => {
    const { sql } = fakeSql([])
    await expect(setPasswordFromArgs(['nobody@lca.test'], sql)).rejects.toThrow('No account for nobody@lca.test')
  })

  it('never logs the password itself', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { sql } = fakeSql([{ id: 'user-1' }])
    await setPasswordFromArgs(['someone@lca.test'], sql)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
