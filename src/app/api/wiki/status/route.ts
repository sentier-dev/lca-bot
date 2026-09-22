import { NextResponse } from 'next/server'
import { wikiStore } from '@/lib/wiki/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Unauthenticated route: lastError is withheld on purpose because a git
  // failure message can echo the remote URL, and that URL may carry a token.
  const { ready, commit, syncedAt, pageCount } = wikiStore.status()
  return NextResponse.json({ ready, commit, syncedAt, pageCount }, { status: ready ? 200 : 503 })
}
