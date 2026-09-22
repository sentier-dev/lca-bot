import { describe, it, expect } from 'vitest'
import { getTableName, getTableColumns } from 'drizzle-orm'
import { authUsers } from '@/db/schema/auth-users'
import { passwordResetTokens } from '@/db/schema/password-reset-tokens'
import { conversations } from '@/db/schema/conversations'
import { wikiGaps } from '@/db/schema/wiki-gaps'

describe('Drizzle schema definitions', () => {
  it('auth.users keeps provider columns and drops email_confirmed', () => {
    const cols = getTableColumns(authUsers)
    expect(cols.id).toBeDefined()
    expect(cols.email).toBeDefined()
    expect(cols.passwordHash).toBeDefined()
    expect(cols.provider).toBeDefined()
    expect(cols.providerId).toBeDefined()
    expect('emailConfirmed' in cols).toBe(false)
  })

  it('password_reset_tokens has hash, purpose and expiry', () => {
    expect(getTableName(passwordResetTokens)).toBe('password_reset_tokens')
    const cols = getTableColumns(passwordResetTokens)
    expect(cols.tokenHash).toBeDefined()
    expect(cols.purpose).toBeDefined()
    expect(cols.expiresAt).toBeDefined()
  })

  it('conversations belong to a user and record the wiki commit', () => {
    expect(getTableName(conversations)).toBe('conversations')
    const cols = getTableColumns(conversations)
    expect(cols.userId).toBeDefined()
    expect(cols.title).toBeDefined()
    expect(cols.messages).toBeDefined()
    expect(cols.messageCount).toBeDefined()
    expect(cols.wikiCommit).toBeDefined()
    expect(cols.updatedAt).toBeDefined()
    expect('projectId' in cols).toBe(false)
  })

  it('wiki_gaps records the question and its origin', () => {
    expect(getTableName(wikiGaps)).toBe('wiki_gaps')
    const cols = getTableColumns(wikiGaps)
    expect(cols.userId).toBeDefined()
    expect(cols.conversationId).toBeDefined()
    expect(cols.question).toBeDefined()
    expect(cols.wikiCommit).toBeDefined()
  })
})
