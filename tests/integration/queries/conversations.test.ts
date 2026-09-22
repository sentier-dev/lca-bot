import { describe, it, expect } from 'vitest'
import { createTestUser, createTestConversation } from '../helpers/seed'
import {
  listUserConversations, countUserConversations, getConversation, createConversation,
  replaceMessages, renameConversation, deleteConversation,
} from '@/db/queries/conversations'
import type { ChatMessage } from '@/types/chat'

const msg = (role: 'user' | 'assistant', content: string): ChatMessage =>
  ({ id: crypto.randomUUID(), role, content, createdAt: new Date().toISOString() })

describe('conversations queries', () => {
  it('lists only the owner\'s conversations, newest updated first', async () => {
    const alice = await createTestUser()
    const bob = await createTestUser()
    const older = await createTestConversation(alice.id, { title: 'older' })
    const newer = await createTestConversation(alice.id, { title: 'newer' })
    await createTestConversation(bob.id, { title: 'bobs' })

    await replaceMessages(newer.id, alice.id, [msg('user', 'hi')], 'abc123')
    const list = await listUserConversations(alice.id)

    expect(list.map((c) => c.title)).toEqual(['newer', 'older'])
    expect(list[0].messageCount).toBe(1)
    expect(await countUserConversations(alice.id)).toBe(2)
    expect(await getConversation(older.id, bob.id)).toBeNull()
  })

  it('creates, renames, replaces messages and deletes with ownership checks', async () => {
    const alice = await createTestUser()
    const bob = await createTestUser()
    const conv = await createConversation(alice.id)
    expect(conv.title).toBeNull()

    expect(await renameConversation(conv.id, bob.id, 'stolen')).toBe(false)
    expect(await renameConversation(conv.id, alice.id, 'Mine')).toBe(true)

    const ok = await replaceMessages(conv.id, alice.id, [msg('user', 'q'), msg('assistant', 'a')], 'deadbeef')
    expect(ok).toBe(true)
    const stored = await getConversation(conv.id, alice.id)
    expect(stored?.messages).toHaveLength(2)
    expect(stored?.messageCount).toBe(2)
    expect(stored?.wikiCommit).toBe('deadbeef')
    expect(stored?.title).toBe('Mine')

    expect(await deleteConversation(conv.id, bob.id)).toBe(false)
    expect(await deleteConversation(conv.id, alice.id)).toBe(true)
    expect(await getConversation(conv.id, alice.id)).toBeNull()
  })

  it('returns the first user message as a preview, null when empty', async () => {
    const alice = await createTestUser()
    await createTestConversation(alice.id, { title: null, messages: [
      { id: 'a', role: 'user', content: 'How do I install BAFU into Brightway with sentier-brightway and what are the steps?', createdAt: 'x' },
    ] })
    await createTestConversation(alice.id, { title: 'empty' })
    const list = await listUserConversations(alice.id)
    const withMsg = list.find((c) => c.title === null)!
    expect(withMsg.preview).toBe('How do I install BAFU into Brightway with sentier-brightway and what are the steps?')
    expect(list.find((c) => c.title === 'empty')!.preview).toBeNull()
  })
})
