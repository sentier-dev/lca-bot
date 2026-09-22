import { describe, it, expect } from 'vitest'
import { createTestUser, testSql } from '../helpers/seed'
import { issueToken, consumeToken, revokeActiveTokens } from '@/db/queries/password-tokens'

describe('password-tokens queries', () => {
  it('issueToken inserts a row and returns the URL secret + id', async () => {
    const { id: userId } = await createTestUser()
    const { secret, id } = await issueToken(userId, 'set_initial')
    expect(secret).toMatch(/^[A-Za-z0-9_-]+$/)
    const [row] = await testSql`SELECT user_id, purpose, used_at FROM password_reset_tokens WHERE id = ${id}`
    expect(row.user_id).toBe(userId)
    expect(row.purpose).toBe('set_initial')
    expect(row.used_at).toBeNull()
  })

  it('consumeToken returns null on a second use', async () => {
    const { id: userId } = await createTestUser()
    const { secret } = await issueToken(userId, 'reset')
    await consumeToken(secret)
    const second = await consumeToken(secret)
    expect(second).toBeNull()
  })

  it('consumeToken returns null for unknown secret', async () => {
    const result = await consumeToken('definitely-not-a-real-token')
    expect(result).toBeNull()
  })

  it('consumeToken returns null after expiry', async () => {
    const { id: userId } = await createTestUser()
    const { secret, id } = await issueToken(userId, 'reset')
    await testSql`UPDATE password_reset_tokens SET expires_at = now() - interval '1 minute' WHERE id = ${id}`
    const result = await consumeToken(secret)
    expect(result).toBeNull()
  })

  it('revokeActiveTokens marks every outstanding token used and returns the count', async () => {
    const { id: userId } = await createTestUser()
    const first = await issueToken(userId, 'reset')
    const second = await issueToken(userId, 'reset')

    expect(await revokeActiveTokens(userId)).toBe(2)
    expect(await consumeToken(first.secret)).toBeNull()
    expect(await consumeToken(second.secret)).toBeNull()
  })

  it('revokeActiveTokens leaves already used tokens alone and counts only active ones', async () => {
    const { id: userId } = await createTestUser()
    const used = await issueToken(userId, 'reset')
    await consumeToken(used.secret)
    const active = await issueToken(userId, 'reset')

    expect(await revokeActiveTokens(userId)).toBe(1)
    expect(await consumeToken(active.secret)).toBeNull()
    expect(await revokeActiveTokens(userId)).toBe(0)
  })

  it('revokeActiveTokens does not touch another account tokens', async () => {
    const mine = await createTestUser()
    const theirs = await createTestUser()
    const theirToken = await issueToken(theirs.id, 'reset')
    await issueToken(mine.id, 'reset')

    expect(await revokeActiveTokens(mine.id)).toBe(1)
    expect(await consumeToken(theirToken.secret)).not.toBeNull()
  })
})
