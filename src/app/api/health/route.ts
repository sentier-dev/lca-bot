import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/db'
import { wikiStore } from '@/lib/wiki/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {}
  try {
    await db.execute(sql`SELECT 1`)
    checks.database = 'ok'
  } catch (err) {
    // Log the cause for the operator; the response stays detail-free because
    // /api/health is unauthenticated.
    console.error('[health] database check failed', err)
    checks.database = 'error'
  }
  // The bot cannot answer anything without the wiki index, so a missing index
  // is an error rather than a warning.
  const wiki = wikiStore.status()
  checks.wiki = wiki.ready ? 'ok' : 'error'
  const healthy = Object.values(checks).every((v) => v === 'ok')
  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
      version: process.env.npm_package_version ?? 'unknown',
      wiki: { commit: wiki.commit, syncedAt: wiki.syncedAt, pageCount: wiki.pageCount },
      // Only whether the last sync failed: the message can echo the remote URL
      // and this route is unauthenticated. The detail stays in the server log.
      wikiError: wiki.lastError !== null,
    },
    { status: healthy ? 200 : 503 },
  )
}
