import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/session'
import { deleteUser } from '@/db/queries/users'
import { checkRateLimit } from '@/lib/rate-limit'
import { unauthorized, rateLimited, serverError } from '@/lib/errors'
import { clearAuthCookies } from '@/lib/auth/cookies'

export async function POST(): Promise<NextResponse> {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const rl = await checkRateLimit(user.id, 'account-action')
  if (!rl.success) return rateLimited()

  // Cascades to conversations and password tokens; wiki_gaps keep the
  // question with user_id set to NULL.
  const deleted = await deleteUser(user.id)
  if (!deleted) return serverError()

  const response = NextResponse.json({ ok: true })
  for (const cookie of clearAuthCookies()) response.cookies.set(cookie)
  return response
}
