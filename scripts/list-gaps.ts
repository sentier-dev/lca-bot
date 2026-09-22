// Usage: npm run list-gaps [-- --limit 50]
// Prints questions the wiki could not answer, newest first.
import { pathToFileURL } from 'node:url'
import { scriptSql } from './lib/db'

const DEFAULT_LIMIT = 100

export function parseLimit(argv: string[]): number {
  const idx = argv.indexOf('--limit')
  if (idx === -1) return DEFAULT_LIMIT
  const raw = argv[idx + 1] ?? ''
  const value = Number(raw)
  if (!/^\d+$/.test(raw.trim()) || !Number.isSafeInteger(value) || value < 1) {
    throw new Error('--limit must be a positive integer')
  }
  return value
}

export interface GapRow {
  created_at: string
  email: string | null
  wiki_commit: string | null
  question: string
  note: string | null
}

/** Renders the gap rows as the lines the CLI prints, newest first. */
export function formatGaps(rows: readonly GapRow[]): string[] {
  if (rows.length === 0) return ['No gaps recorded.']
  const lines: string[] = []
  for (const r of rows) {
    const when = new Date(r.created_at).toISOString().slice(0, 16).replace('T', ' ')
    lines.push(`${when}  ${r.email ?? '(deleted user)'}  @${(r.wiki_commit ?? '-------').slice(0, 7)}`)
    lines.push(`  Q: ${r.question}`)
    if (r.note) lines.push(`  note: ${r.note}`)
  }
  return lines
}

async function main() {
  const limit = parseLimit(process.argv)
  const sql = scriptSql()
  try {
    const rows = await sql`
      SELECT g.created_at, u.email, g.wiki_commit, g.question, g.note
      FROM wiki_gaps g LEFT JOIN auth.users u ON u.id = g.user_id
      ORDER BY g.created_at DESC LIMIT ${limit}
    `
    for (const line of formatGaps(rows as unknown as GapRow[])) console.log(line)
  } finally {
    await sql.end()
  }
}

// Run main() only when this file is the entry point, so importing it from a
// test does not execute the script.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
