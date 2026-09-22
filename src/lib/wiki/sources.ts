import type { SourceEntry } from './types'

/** Parses the "## Registry" table of sources.md into a map keyed by id. */
export function parseSources(raw: string): Map<string, SourceEntry> {
  const sources = new Map<string, SourceEntry>()
  const start = raw.indexOf('## Registry')
  const section = start === -1 ? raw : raw.slice(start)
  for (const line of section.split('\n')) {
    if (!line.startsWith('|')) continue
    const cells = line.split('|').slice(1, -1).map((c) => c.trim())
    if (cells.length < 5) continue
    const [id, title, url, accessed, licence] = cells
    if (id === 'id' || /^-+$/.test(id) || id.startsWith('`')) continue
    sources.set(id, { id, title, url, accessed, licence })
  }
  return sources
}
