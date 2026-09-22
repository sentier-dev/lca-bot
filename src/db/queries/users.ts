import { eq, and, isNotNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { authUsers } from '@/db/schema'
import { passwordHashSql } from '@/db/password-hash'

const USER_SUMMARY = { id: authUsers.id, email: authUsers.email }

export async function findUserByEmail(email: string) {
  const [user] = await db.select().from(authUsers).where(eq(authUsers.email, email))
  return user ?? null
}

export async function findUserById(id: string) {
  const [user] = await db.select(USER_SUMMARY).from(authUsers).where(eq(authUsers.id, id))
  return user ?? null
}

// Drives the settings page: the password form shows only when a hash exists.
export async function getUserWithProvider(id: string) {
  const [user] = await db.select({
    id: authUsers.id,
    email: authUsers.email,
    provider: authUsers.provider,
    hasPassword: sql<boolean>`${authUsers.passwordHash} IS NOT NULL`,
  }).from(authUsers).where(eq(authUsers.id, id))
  return user ?? null
}

/**
 * Creates an account. The create-user CLI runs its own insert against a plain
 * postgres-js client, so this backs the dev seed, the tests, and any future
 * in-app creation path. `password: null` creates a Google-only account that
 * can sign in with Google as soon as the verified Google email matches.
 */
export async function createUser(email: string, password: string | null) {
  const [user] = await db.insert(authUsers).values({
    email,
    passwordHash: password === null ? null : passwordHashSql(password),
    provider: password === null ? 'google' : 'email',
  }).returning(USER_SUMMARY)
  return user
}

export async function verifyCredentials(email: string, password: string) {
  const [user] = await db.select(USER_SUMMARY).from(authUsers).where(and(
    eq(authUsers.email, email),
    isNotNull(authUsers.passwordHash),
    sql`${authUsers.passwordHash} = crypt(${password}, ${authUsers.passwordHash})`,
  ))
  return user ?? null
}

export async function verifyUserPassword(userId: string, password: string): Promise<boolean> {
  const [row] = await db.select({ id: authUsers.id }).from(authUsers).where(and(
    eq(authUsers.id, userId),
    isNotNull(authUsers.passwordHash),
    sql`${authUsers.passwordHash} = crypt(${password}, ${authUsers.passwordHash})`,
  ))
  return row != null
}

export async function updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
  const [row] = await db.update(authUsers)
    .set({ passwordHash: passwordHashSql(newPassword), updatedAt: sql`now()` })
    .where(eq(authUsers.id, userId))
    .returning({ id: authUsers.id })
  return row != null
}

export async function deleteUser(userId: string): Promise<boolean> {
  const [row] = await db.delete(authUsers).where(eq(authUsers.id, userId)).returning({ id: authUsers.id })
  return row != null
}

export async function findUserByProviderSubject(provider: string, providerId: string) {
  const [user] = await db.select(USER_SUMMARY).from(authUsers).where(and(
    eq(authUsers.provider, provider as 'email' | 'google'),
    eq(authUsers.providerId, providerId),
  ))
  return user ?? null
}

// Records the Google subject on an account that has none yet (first Google
// login of an existing account). Guarded on provider_id IS NULL so it never
// re-links an account already bound to a different subject.
export async function linkOAuthProvider(userId: string, provider: 'google', providerId: string): Promise<boolean> {
  const [row] = await db.update(authUsers)
    .set({ provider, providerId })
    .where(and(eq(authUsers.id, userId), sql`${authUsers.providerId} IS NULL`))
    .returning({ id: authUsers.id })
  return row != null
}

/**
 * Sets a new password from a consumed reset token. Returns the account so the
 * caller can mint a session, or null when the row disappeared in the meantime.
 */
export async function setPasswordForUser(
  userId: string,
  newPassword: string,
): Promise<{ id: string; email: string } | null> {
  const [row] = await db.update(authUsers)
    .set({ passwordHash: passwordHashSql(newPassword), updatedAt: sql`now()` })
    .where(eq(authUsers.id, userId))
    .returning(USER_SUMMARY)
  return row ?? null
}
