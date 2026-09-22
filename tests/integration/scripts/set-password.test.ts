import { describe, it, expect } from 'vitest'
import { testSql, createTestUser } from '../helpers/seed'
import { setPasswordFromArgs } from '../../../scripts/set-password'
import { verifyCredentials } from '@/db/queries/users'

describe('scripts/set-password', () => {
  it('sets a generated password that logs in, at bcrypt cost 12', async () => {
    const user = await createTestUser({ password: 'Old-pass-1!' })

    const result = await setPasswordFromArgs([user.email], testSql)

    expect(result.generated).toBe(true)
    expect(await verifyCredentials(user.email, result.password)).toMatchObject({ id: user.id })
    expect(await verifyCredentials(user.email, 'Old-pass-1!')).toBeNull()
    const [row] = await testSql`SELECT password_hash FROM auth.users WHERE id = ${user.id}`
    expect(row.password_hash).toMatch(/^\$2a\$12\$/)
  })

  it('accepts an explicit password and refuses an unknown account', async () => {
    const user = await createTestUser()

    const result = await setPasswordFromArgs([user.email, '--password', 'Chosen-pass-1!'], testSql)
    expect(result.generated).toBe(false)
    expect(await verifyCredentials(user.email, 'Chosen-pass-1!')).toMatchObject({ id: user.id })

    await expect(setPasswordFromArgs(['nobody@integration.test'], testSql)).rejects.toThrow(/No account for/)
  })
})
