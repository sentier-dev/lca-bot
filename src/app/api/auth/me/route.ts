import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/session'
import { getUserWithProvider } from '@/db/queries/users'

export async function GET() {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ user: null }, { status: 401 })
  const user = await getUserWithProvider(session.id)
  if (!user) return NextResponse.json({ user: null }, { status: 401 })
  return NextResponse.json({ user: { id: user.id, email: user.email, provider: user.provider, hasPassword: user.hasPassword } })
}
