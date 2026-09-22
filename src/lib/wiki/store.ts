import type { WikiIndex, WikiStatus } from './types'

// One index per process. Kept on globalThis because Next.js dev can load this
// module into more than one bundle (instrumentation vs route handlers); a
// module-level variable would then be two variables.
interface StoreState {
  index: WikiIndex | null
  syncedAt: string | null
  lastError: string | null
}

const KEY = Symbol.for('lca-bot.wiki-store')
type GlobalWithStore = typeof globalThis & { [KEY]?: StoreState }

function state(): StoreState {
  const g = globalThis as GlobalWithStore
  if (!g[KEY]) g[KEY] = { index: null, syncedAt: null, lastError: null }
  return g[KEY]
}

export const wikiStore = {
  get(): WikiIndex | null {
    return state().index
  },
  /** Atomic swap: readers see either the old or the new index, never a partial one. */
  set(index: WikiIndex): void {
    const s = state()
    s.index = index
    s.syncedAt = new Date().toISOString()
    s.lastError = null
  },
  touch(): void {
    state().syncedAt = new Date().toISOString()
  },
  recordError(err: unknown): void {
    state().lastError = err instanceof Error ? err.message : String(err)
  },
  status(): WikiStatus {
    const s = state()
    return {
      ready: s.index !== null,
      commit: s.index?.commit ?? null,
      syncedAt: s.syncedAt,
      pageCount: s.index?.pages.size ?? 0,
      lastError: s.lastError,
    }
  },
  resetForTests(): void {
    const g = globalThis as GlobalWithStore
    g[KEY] = { index: null, syncedAt: null, lastError: null }
  },
}
