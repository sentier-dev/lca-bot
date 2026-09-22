import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'
import { authUsers } from './auth-users'
import { conversations } from './conversations'

export const wikiGaps = pgTable('wiki_gaps', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => authUsers.id, { onDelete: 'set null' }),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
  question: text('question').notNull(),
  note: text('note'),
  wikiCommit: text('wiki_commit'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_wiki_gaps_created').on(t.createdAt.desc()),
])
