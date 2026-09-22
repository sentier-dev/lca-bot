import { execSync } from 'node:child_process'
import { APP_URL } from './base-url'

/**
 * Reads the app container's stdout — dev-mode email delivery is logged
 * there as `[email:dev] { to, subject, text }` (see src/lib/email/client.ts),
 * which specs scrape to recover magic-link tokens without a real mailbox.
 *
 * The container to read from must track APP_URL: the docker-compose `app`
 * service backs the default localhost:3000, but the dedicated MOCK_ANTHROPIC
 * test instance on localhost:3100 (lca-bot-app-test) is a bare
 * `docker run` container outside that compose project, so `docker compose
 * logs app` from a worktree silently returns nothing for it (empty compose
 * project, not an error) rather than failing loudly. APP_LOG_CONTAINER
 * overrides the guess for any other setup.
 */
const DEFAULT_LOG_CONTAINER_BY_PORT: Record<string, string> = {
  '3100': 'lca-bot-app-test',
}

function resolveLogContainer(): string | null {
  if (process.env.APP_LOG_CONTAINER) return process.env.APP_LOG_CONTAINER
  const port = new URL(APP_URL).port
  return DEFAULT_LOG_CONTAINER_BY_PORT[port] ?? null
}

export function readAppLogs(tail = 300): string {
  const container = resolveLogContainer()
  try {
    if (container) {
      return execSync(`docker logs --tail=${tail} ${container} 2>&1`, {
        encoding: 'utf-8',
      })
    }
    // --no-log-prefix: without it every line is prefixed with
    // `lca-bot-app-1  | `, and the block parser below never sees the closing
    // `}` on a line of its own.
    return execSync(
      `docker compose --env-file .env.docker logs --no-log-prefix --tail=${tail} app 2>&1`,
      { encoding: 'utf-8' },
    )
  } catch {
    return ''
  }
}

export interface DevEmailLog {
  subject: string
  text: string
  url: string | null
}

/**
 * Splits raw container logs into `[email:dev] { ... }` entries.
 *
 * `console.log('[email:dev]', message)` (src/lib/email/client.ts) is
 * pretty-printed by Node across *multiple* lines whenever the object is too
 * long for one line — which it always is here, since `text` bodies contain
 * embedded newlines that Node renders as several quoted `'...' +` segments.
 * A naive per-line scan (checking each physical line for both the
 * `[email:dev]` marker and the target address) never matches anything,
 * because those two markers land on different lines. Instead, group lines
 * into blocks from the `[email:dev] {` opener to the matching `}` closer
 * (printed alone on its own line at the top-level indent), then match
 * within the whole block.
 */
function extractEmailDevBlocks(logs: string): string[] {
  const blocks: string[] = []
  let current: string[] | null = null
  for (const line of logs.split('\n')) {
    if (line.includes('[email:dev] {')) {
      current = [line]
      continue
    }
    if (current) {
      current.push(line)
      if (line.trim() === '}') {
        blocks.push(current.join('\n'))
        current = null
      }
    }
  }
  return blocks
}

/**
 * Finds the most recent dev-mode email logged to the app container's stdout
 * for `toEmail`, optionally filtered by subject. Returns the subject, the
 * raw block text (sufficient for `.not.toContain(...)` assertions), and the
 * first URL found in it (magic-link specs extract a token from this).
 */
export function readLatestEmailLog(
  toEmail: string,
  opts: { tail?: number; subjectFilter?: RegExp } = {},
): DevEmailLog | null {
  const logs = readAppLogs(opts.tail ?? 300)
  const blocks = extractEmailDevBlocks(logs)
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i]
    if (!block.includes(toEmail)) continue
    const subjectMatch = block.match(/subject:\s*'([^']*)'/)
    if (!subjectMatch) continue
    const subject = subjectMatch[1]
    if (opts.subjectFilter && !opts.subjectFilter.test(subject)) continue
    const urlMatch = block.match(/https?:\/\/[^\s'"]+/)
    return { subject, text: block, url: urlMatch?.[0] ?? null }
  }
  return null
}
