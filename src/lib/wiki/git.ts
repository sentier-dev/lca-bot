import { execFile } from 'node:child_process'
import { access, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const GIT_TIMEOUT_MS = 120_000

export interface CheckoutResult {
  action: 'cloned' | 'pulled' | 'skipped'
  commit: string
  changed: boolean
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

/** Short HEAD sha of a checkout, or "unknown" when the directory is not a git repo. */
export async function headCommit(dir: string): Promise<string> {
  // The ".git" guard matters: `git rev-parse` walks up to enclosing repos, so
  // without it a plain directory inside another checkout reports that repo's
  // HEAD instead of "unknown".
  if (!(await exists(path.join(dir, '.git')))) return 'unknown'
  try {
    const { stdout } = await run('git', ['-C', dir, 'rev-parse', '--short=12', 'HEAD'], { timeout: GIT_TIMEOUT_MS })
    return stdout.trim() || 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Makes sure `dir` holds an up-to-date shallow clone of `repoUrl`.
 * With `disabled`, nothing is fetched: the directory is used as it is
 * (local development against ~/dds/lca-wiki).
 */
export async function ensureCheckout(
  repoUrl: string,
  dir: string,
  opts: { disabled?: boolean } = {},
): Promise<CheckoutResult> {
  if (opts.disabled) {
    return { action: 'skipped', commit: await headCommit(dir), changed: false }
  }
  const isRepo = await exists(path.join(dir, '.git'))
  if (!isRepo) {
    await mkdir(path.dirname(dir), { recursive: true })
    await run('git', ['clone', '--depth', '1', '--quiet', repoUrl, dir], { timeout: GIT_TIMEOUT_MS })
    return { action: 'cloned', commit: await headCommit(dir), changed: true }
  }
  const before = await headCommit(dir)
  try {
    await run('git', ['-C', dir, 'pull', '--ff-only', '--quiet'], { timeout: GIT_TIMEOUT_MS })
  } catch (err) {
    // The upstream history was rewritten, or the local checkout drifted: fetch
    // the tip and move to it. FETCH_HEAD is used rather than origin/HEAD, which
    // a shallow clone does not necessarily have.
    console.warn('[wiki] pull failed, resetting to the fetched tip:', err instanceof Error ? err.message : err)
    await run('git', ['-C', dir, 'fetch', '--depth', '1', 'origin'], { timeout: GIT_TIMEOUT_MS })
    await run('git', ['-C', dir, 'reset', '--hard', '--quiet', 'FETCH_HEAD'], { timeout: GIT_TIMEOUT_MS })
  }
  const after = await headCommit(dir)
  return { action: 'pulled', commit: after, changed: after !== before }
}
