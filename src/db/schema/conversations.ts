import { pgTable, uuid, text, integer, jsonb, timestamp, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { authUsers } from './auth-users'
import type { ChatMessage } from '@/types/chat'

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  title: text('title'),
  messages: jsonb('messages').$type<ChatMessage[]>().notNull().default([]),
  messageCount: integer('message_count').notNull().default(0),
  wikiCommit: text('wiki_commit'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_conversations_user_updated').on(t.userId, t.updatedAt.desc()),
])

export const conversationsRelations = relations(conversations, ({ one }) => ({
  user: one(authUsers, { fields: [conversations.userId], references: [authUsers.id] }),
}))
