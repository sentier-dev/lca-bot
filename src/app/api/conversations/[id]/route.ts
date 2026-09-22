import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/session'
import { unauthorized, notFound, badRequest, serverError, parseJsonObject } from '@/lib/errors'
import { getConversation, renameConversation, deleteConversation } from '@/db/queries/conversations'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_TITLE_CHARS = 200

type Ctx = { params: Promise<{ id: string }> }

async function ownedId(ctx: Ctx): Promise<{ userId: string; id: string } | NextResponse> {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const { id } = await ctx.params
  if (!UUID_RE.test(id)) return notFound()
  return { userId: user.id, id }
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  const owned = await ownedId(ctx)
  if (owned instanceof NextResponse) return owned
  try {
    const conversation = await getConversation(owned.id, owned.userId)
    if (!conversation) return notFound()
    return NextResponse.json({ conversation })
  } catch (err) {
    console.error('[conversations] read failed', err)
    return serverError()
  }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const owned = await ownedId(ctx)
  if (owned instanceof NextResponse) return owned
  const body = await parseJsonObject(request)
  if (!body) return badRequest('Invalid JSON body')
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title || title.length > MAX_TITLE_CHARS) return badRequest(`title must be 1 to ${MAX_TITLE_CHARS} characters`)
  try {
    const ok = await renameConversation(owned.id, owned.userId, title)
    if (!ok) return notFound()
    const conversation = await getConversation(owned.id, owned.userId)
    return NextResponse.json({ conversation })
  } catch (err) {
    console.error('[conversations] rename failed', err)
    return serverError()
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const owned = await ownedId(ctx)
  if (owned instanceof NextResponse) return owned
  try {
    const ok = await deleteConversation(owned.id, owned.userId)
    if (!ok) return notFound()
    return NextResponse.json({ deleted: true })
  } catch (err) {
    console.error('[conversations] delete failed', err)
    return serverError()
  }
}
