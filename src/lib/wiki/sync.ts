import { ensureCheckout } from './git'
import { buildIndex } from './build-index'
import { wikiStore } from './store'
import type { WikiStatus } from './types'

const TIMER_KEY = Symbol.for('lca-bot.wiki-sync-timer')
const RUN_KEY = Symbol.for('lca-bot.wiki-sync-run')
// Both live on globalThis for the same reason the store does: Next.js can load
// this module into more than one bundle within one process.
type GlobalWithSync = typeof globalThis & {
  [TIMER_KEY]?: NodeJS.Timeout | true
  [RUN_KEY]?: Promise<WikiStatus>
}

export interface SyncConfig {
  repoUrl: string
  dataDir: string
  disabled: boolean
}

/**
 * One sync pass: clone or pull, rebuild the index when HEAD changed (or when
 * nothing is loaded yet), swap it in. Errors leave the last good index in
 * place and are recorded in the status.
 */
export async function syncOnce(config: SyncConfig): Promise<WikiStatus> {
  const g = globalThis as GlobalWithSync
  const running = g[RUN_KEY]
  if (running) return running
  const run = runSync(config).finally(() => {
    delete g[RUN_KEY]
  })
  g[RUN_KEY] = run
  return run
}

async function runSync(config: SyncConfig): Promise<WikiStatus> {
  try {
    const result = await ensureCheckout(config.repoUrl, config.dataDir, { disabled: config.disabled })
    const current = wikiStore.get()
    if (!current || result.changed || current.commit !== result.commit) {
      const index = await buildIndex(config.dataDir, result.commit)
      wikiStore.set(index)
      console.log(`[wiki] index built: ${index.pages.size} pages at ${result.commit} (${result.action})`)
    } else {
      wikiStore.touch()
    }
  } catch (err) {
    wikiStore.recordError(err)
    console.error('[wiki] sync failed', err)
  }
  return wikiStore.status()
}

/** Runs syncOnce now and then every `intervalMinutes`. Idempotent per process. */
export function startWikiSync(config: SyncConfig & { intervalMinutes: number }): void {
  const g = globalThis as GlobalWithSync
  if (g[TIMER_KEY]) return
  // Claimed before the first sync starts, so a second call is a no-op even
  // when no timer follows.
  g[TIMER_KEY] = true
  void syncOnce(config)
  if (config.intervalMinutes > 0) {
    const timer = setInterval(() => void syncOnce(config), config.intervalMinutes * 60_000)
    timer.unref()
    g[TIMER_KEY] = timer
  } else {
    console.log('[wiki] periodic sync disabled (interval 0)')
  }
}
