import MiniSearch from 'minisearch'
import type { TermEntry } from './types'

const HEADING = /^### (.+?)\s*$/
const FENCE = /^(?:```|~~~)/

/**
 * Splits vocabulary.md into its "### Term" sections. Key is the lower-cased term.
 * Headings inside fenced code blocks are body text, not terms: the file documents
 * its own entry format with a fenced "### Term" example.
 */
export function parseVocabulary(raw: string): Map<string, TermEntry> {
  const terms = new Map<string, TermEntry>()
  const lines = raw.split('\n')
  let current: { term: string; lines: string[] } | null = null
  const flush = () => {
    if (!current) return
    const section = current.lines.join('\n').trimEnd()
    terms.set(current.term.toLowerCase(), { term: current.term, section })
    current = null
  }
  let inFence = false
  for (const line of lines) {
    if (FENCE.test(line)) {
      inFence = !inFence
      if (current) current.lines.push(line)
      continue
    }
    const m = inFence ? null : line.match(HEADING)
    if (m) {
      flush()
      current = { term: m[1], lines: [line] }
    } else if (current) {
      current.lines.push(line)
    }
  }
  flush()
  return terms
}

export interface TermLookup {
  exact: TermEntry | null
  suggestions: string[]
}

/** Exact case-insensitive match, otherwise up to five fuzzy suggestions by heading. */
export function findTerm(terms: Map<string, TermEntry>, query: string): TermLookup {
  const exact = terms.get(query.trim().toLowerCase()) ?? null
  if (exact) return { exact, suggestions: [] }
  const mini = new MiniSearch<{ id: string; term: string }>({ fields: ['term'], storeFields: ['term'] })
  mini.addAll([...terms.values()].map((t) => ({ id: t.term, term: t.term })))
  const hits = mini.search(query, { prefix: true, fuzzy: 0.3 })
  return { exact: null, suggestions: hits.slice(0, 5).map((h) => String(h.term)) }
}
