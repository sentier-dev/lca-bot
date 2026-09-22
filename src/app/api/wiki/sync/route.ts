import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { clientIp } from '@/lib/request-ip'
import { checkRateLimit } from '@/lib/rate-limit'
import { forbidden, rateLimited } from '@/lib/errors'
import { syncOnce } from '@/lib/wiki/sync'

export const dynamic = 'force-dynamic'

// This route reads process.env directly rather than the frozen `env` object so
// the unit test can stub the secret and the data dir per case.
function secretMatches(given: string | null): boolean {
  const expected = process.env.WIKI_SYNC_SECRET
  if (!expected || !given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** POST /api/wiki/sync: pull and reindex. For a GitHub push webhook or a manual curl. */
export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(clientIp(request), 'wiki-sync')
  if (!rl.success) return rateLimited()
  if (!secretMatches(request.headers.get('x-wiki-sync-secret'))) return forbidden()
  const status = await syncOnce({
    repoUrl: process.env.WIKI_REPO_URL ?? 'https://github.com/sentier-dev/lca-wiki.git',
    dataDir: process.env.WIKI_DATA_DIR ?? '/data/wiki',
    disabled: process.env.WIKI_SYNC_DISABLED === '1',
  })
  return NextResponse.json(status, { status: status.ready ? 200 : 503 })
}
