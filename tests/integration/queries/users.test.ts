import { describe, it, expect } from 'vitest'
import { createTestUser, testSql } from '../helpers/seed'
import {
  createUser, findUserByEmail, verifyCredentials, updateUserPassword, deleteUser,
  findUserByProviderSubject, linkOAuthProvider, getUserWithProvider, setPasswordForUser,
} from '@/db/queries/users'

describe('users queries (db)', () => {
  it('creates an email account and verifies its password', async () => {
    const created = await createUser('new@lca.test', 'Strong-pass-1!')
    expect(created.email).toBe('new@lca.test')
    expect(await verifyCredentials('new@lca.test', 'Strong-pass-1!')).toMatchObject({ id: created.id })
    expect(await verifyCredentials('new@lca.test', 'wrong')).toBeNull()
    expect((await getUserWithProvider(created.id))?.hasPassword).toBe(true)
  })

  it('creates a Google-only account without a password', async () => {
    const created = await createUser('g@lca.test', null)
    const row = await findUserByEmail('g@lca.test')
    expect(row?.passwordHash).toBeNull()
    expect(row?.provider).toBe('google')
    expect(await verifyCredentials('g@lca.test', 'anything')).toBeNull()
    expect((await getUserWithProvider(created.id))?.hasPassword).toBe(false)
  })

  it('links a Google subject once and finds the user by it', async () => {
    const user = await createTestUser()
    expect(await linkOAuthProvider(user.id, 'google', 'sub-42')).toBe(true)
    expect(await linkOAuthProvider(user.id, 'google', 'sub-43')).toBe(false)
    expect(await findUserByProviderSubject('google', 'sub-42')).toMatchObject({ id: user.id })
    const [row] = await testSql`SELECT provider FROM auth.users WHERE id = ${user.id}`
    expect(row.provider).toBe('google')
  })

  it('updates the password and deletes the account', async () => {
    const user = await createTestUser({ password: 'Old-pass-1!' })
    expect(await updateUserPassword(user.id, 'New-pass-2!')).toBe(true)
    expect(await verifyCredentials(user.email, 'New-pass-2!')).not.toBeNull()
    expect(await deleteUser(user.id)).toBe(true)
    expect(await findUserByEmail(user.email)).toBeNull()
  })

  it('hashes every new password at bcrypt cost 12', async () => {
    const created = await createUser('cost@lca.test', 'Strong-pass-1!')
    const [inserted] = await testSql`SELECT password_hash FROM auth.users WHERE id = ${created.id}`
    expect(inserted.password_hash).toMatch(/^\$2a\$12\$/)

    await updateUserPassword(created.id, 'Another-pass-2!')
    const [updated] = await testSql`SELECT password_hash FROM auth.users WHERE id = ${created.id}`
    expect(updated.password_hash).toMatch(/^\$2a\$12\$/)

    await setPasswordForUser(created.id, 'Third-pass-3!')
    const [reset] = await testSql`SELECT password_hash FROM auth.users WHERE id = ${created.id}`
    expect(reset.password_hash).toMatch(/^\$2a\$12\$/)
  })

  it('setPasswordForUser replaces the hash, bumps updated_at and returns the account', async () => {
    const user = await createTestUser({ password: 'Old-pass-1!' })
    const [before] = await testSql`SELECT updated_at FROM auth.users WHERE id = ${user.id}`

    const result = await setPasswordForUser(user.id, 'Brand-new-2!')
    expect(result).toEqual({ id: user.id, email: user.email })
    expect(await verifyCredentials(user.email, 'Brand-new-2!')).not.toBeNull()
    expect(await verifyCredentials(user.email, 'Old-pass-1!')).toBeNull()

    const [after] = await testSql`SELECT updated_at FROM auth.users WHERE id = ${user.id}`
    expect(new Date(after.updated_at).getTime()).toBeGreaterThan(new Date(before.updated_at).getTime())
  })

  it('setPasswordForUser returns null for an account that no longer exists', async () => {
    const result = await setPasswordForUser('00000000-0000-0000-0000-000000000000', 'Brand-new-2!')
    expect(result).toBeNull()
  })
})
