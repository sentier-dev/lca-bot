import { eq, and, desc, sql } from 'drizzle-orm'
import { db } from '@/db'
import { conversations } from '@/db/schema'
import type { ChatMessage } from '@/types/chat'

export interface ConversationSummary {
  id: string
  title: string | null
  preview: string | null
  messageCount: number
  updatedAt: Date
  createdAt: Date
}

export async function listUserConversations(userId: string, limit = 100, offset = 0): Promise<ConversationSummary[]> {
  return db.select({
    id: conversations.id,
    title: conversations.title,
    // First user message, for rows without a title. jsonb path: messages[0].content.
    preview: sql<string | null>`${conversations.messages}->0->>'content'`,
    messageCount: conversations.messageCount,
    updatedAt: conversations.updatedAt,
    createdAt: conversations.createdAt,
  }).from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))
    .limit(limit)
    .offset(offset)
}

export async function countUserConversations(userId: string): Promise<number> {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
    .from(conversations)
    .where(eq(conversations.userId, userId))
  return count
}

/** Ownership is part of the key: another user's id reads as "not found". */
export async function getConversation(conversationId: string, userId: string) {
  const [conv] = await db.select().from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
  return conv ?? null
}

export async function createConversation(userId: string, title: string | null = null) {
  const [conv] = await db.insert(conversations)
    .values({ userId, title, messages: [], messageCount: 0 })
    .returning({ id: conversations.id, title: conversations.title, createdAt: conversations.createdAt, updatedAt: conversations.updatedAt })
  return conv
}

export async function replaceMessages(
  conversationId: string,
  userId: string,
  messages: ChatMessage[],
  wikiCommit: string | null,
): Promise<boolean> {
  const [row] = await db.update(conversations)
    .set({ messages, messageCount: messages.length, wikiCommit, updatedAt: sql`now()` })
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .returning({ id: conversations.id })
  return row != null
}

export async function renameConversation(conversationId: string, userId: string, title: string): Promise<boolean> {
  const [row] = await db.update(conversations)
    .set({ title, updatedAt: sql`now()` })
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .returning({ id: conversations.id })
  return row != null
}

export async function deleteConversation(conversationId: string, userId: string): Promise<boolean> {
  const [row] = await db.delete(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .returning({ id: conversations.id })
  return row != null
}
