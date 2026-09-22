import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/session'
import { unauthorized, serverError } from '@/lib/errors'
import { listUserConversations, countUserConversations, createConversation } from '@/db/queries/conversations'

export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

function intParam(value: string | null, fallback: number, max: number): number {
  const n = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(n) || n < 0) return fallback
  return Math.min(n, max)
}

/** GET /api/conversations?limit=&offset= : the caller's conversations, newest updated first. */
export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  try {
    const limit = intParam(request.nextUrl.searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT) || DEFAULT_LIMIT
    const offset = intParam(request.nextUrl.searchParams.get('offset'), 0, Number.MAX_SAFE_INTEGER)
    const [items, total] = await Promise.all([listUserConversations(user.id, limit, offset), countUserConversations(user.id)])
    return NextResponse.json({ items, total, limit, offset })
  } catch (err) {
    console.error('[conversations] list failed', err)
    return serverError()
  }
}

/** POST /api/conversations : create an empty conversation. */
export async function POST() {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  try {
    const conversation = await createConversation(user.id)
    return NextResponse.json({ conversation }, { status: 201 })
  } catch (err) {
    console.error('[conversations] create failed', err)
    return serverError()
  }
}
