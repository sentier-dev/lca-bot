import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { authUsers } from './auth-users'

export type TokenPurpose = 'set_initial' | 'reset'

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  purpose: text('purpose').notNull().$type<TokenPurpose>(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_password_reset_tokens_user_purpose_active').on(t.userId, t.purpose).where(sql`${t.usedAt} IS NULL`),
])

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(authUsers, { fields: [passwordResetTokens.userId], references: [authUsers.id] }),
}))
