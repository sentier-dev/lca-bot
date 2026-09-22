import { pgSchema, uuid, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { conversations } from './conversations'

export const authSchema = pgSchema('auth')

export type AuthProvider = 'email' | 'google'

export const authUsers = authSchema.table('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  provider: text('provider').$type<AuthProvider>().notNull().default('email'),
  providerId: text('provider_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('auth_users_provider_subject_unique')
    .on(t.provider, t.providerId)
    .where(sql`${t.providerId} IS NOT NULL`),
])

export const authUsersRelations = relations(authUsers, ({ many }) => ({
  conversations: many(conversations),
}))
