// Runs once per server start (Next.js instrumentation hook). Starts the wiki
// sync on the Node runtime only; the edge runtime has no filesystem or git.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (process.env.NEXT_PHASE === 'phase-production-build') return
  const { env } = await import('@/lib/env')
  const { startWikiSync } = await import('@/lib/wiki/sync')
  startWikiSync({
    repoUrl: env.wiki.repoUrl,
    dataDir: env.wiki.dataDir,
    disabled: env.wiki.syncDisabled,
    intervalMinutes: env.wiki.syncIntervalMinutes,
  })
  if (process.env.NODE_ENV !== 'production') {
    const { DEV_USER } = await import('@/lib/seed-dev-user')
    console.log(`[dev] Login with: ${DEV_USER.email} / ${DEV_USER.password}`)
  }
}
