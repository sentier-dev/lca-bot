import { describe, it, expect } from 'vitest'
import { testSql } from '../helpers/seed'
import { createUserFromArgs } from '../../../scripts/create-user'
import { verifyCredentials } from '@/db/queries/users'

describe('scripts/create-user', () => {
  it('creates an email account with a generated password that logs in', async () => {
    const result = await createUserFromArgs(['cli@lca.test'], testSql)
    expect(result.generated).toBe(true)
    expect(result.password).toHaveLength(20)
    expect(await verifyCredentials('cli@lca.test', result.password!)).toMatchObject({ id: result.id })
  })

  it('creates a Google-only account and refuses duplicates', async () => {
    const result = await createUserFromArgs(['g-cli@lca.test', '--google-only'], testSql)
    expect(result.password).toBeNull()
    const [row] = await testSql`SELECT provider, password_hash FROM auth.users WHERE id = ${result.id}`
    expect(row.provider).toBe('google')
    expect(row.password_hash).toBeNull()
    await expect(createUserFromArgs(['g-cli@lca.test'], testSql)).rejects.toThrow(/already exists/)
  })
})
