import postgres from 'postgres'
import { mintTestTokens } from './auth'

const TEST_DB_URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:54322/postgres'
const sql = postgres(TEST_DB_URL, { max: 3 })

let userCounter = 0

export interface TestUser {
  id: string
  email: string
  accessToken: string
  refreshToken: string
}

export async function createTestUser(overrides?: {
  email?: string
  password?: string | null
  provider?: 'email' | 'google'
  providerId?: string | null
}): Promise<TestUser> {
  userCounter++
  const email = overrides?.email ?? `test-${userCounter}-${Date.now()}@integration.test`
  const password = overrides?.password === undefined ? 'Test-password-123' : overrides.password
  const provider = overrides?.provider ?? 'email'
  const providerId = overrides?.providerId ?? null

  const [user] = await sql`
    INSERT INTO auth.users (email, password_hash, provider, provider_id)
    VALUES (
      ${email},
      ${password === null ? null : sql`crypt(${password}, gen_salt('bf'))`},
      ${provider},
      ${providerId}
    )
    RETURNING id, email
  `
  const tokens = await mintTestTokens(user.id, user.email)
  return { id: user.id, email: user.email, ...tokens }
}

export async function createTestConversation(
  userId: string,
  overrides?: { title?: string | null; messages?: unknown[]; wikiCommit?: string | null },
) {
  const messages = overrides?.messages ?? []
  const title = overrides && 'title' in overrides ? overrides.title : 'Test chat'
  const [conv] = await sql`
    INSERT INTO conversations (user_id, title, messages, message_count, wiki_commit)
    VALUES (${userId}, ${title ?? null}, ${sql.json(messages as never)}, ${messages.length}, ${overrides?.wikiCommit ?? null})
    RETURNING id, user_id AS "userId", title
  `
  return conv as { id: string; userId: string; title: string | null }
}

export { sql as testSql }
