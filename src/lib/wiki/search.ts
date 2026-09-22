import MiniSearch from 'minisearch'
import { API_PAGE_WEIGHT, SEARCH_DEFAULT_LIMIT, SEARCH_MAX_LIMIT, type SearchHit, type WikiPage } from './types'

interface Doc {
  id: string
  title: string
  summary: string
  body: string
  branch: string
  isApi: boolean
}

const SNIPPET_RADIUS = 120

/** A window of the body around the first occurrence of any query term. */
export function makeSnippet(body: string, terms: string[]): string {
  const flat = body.replace(/\s+/g, ' ')
  const lower = flat.toLowerCase()
  let at = -1
  for (const term of terms) {
    const i = lower.indexOf(term.toLowerCase())
    if (i !== -1 && (at === -1 || i < at)) at = i
  }
  if (at === -1) return flat.slice(0, SNIPPET_RADIUS * 2).trim()
  const start = Math.max(0, at - SNIPPET_RADIUS)
  const end = Math.min(flat.length, at + SNIPPET_RADIUS)
  return `${start > 0 ? '…' : ''}${flat.slice(start, end).trim()}${end < flat.length ? '…' : ''}`
}

export type SearchFn = (query: string, opts?: { branch?: string; limit?: number }) => SearchHit[]

/** Builds the MiniSearch index over title, summary and body; api pages weigh half. */
export function buildSearch(pages: WikiPage[]): SearchFn {
  const mini = new MiniSearch<Doc>({
    fields: ['title', 'summary', 'body'],
    storeFields: ['title', 'summary', 'branch', 'isApi'],
    searchOptions: {
      boost: { title: 4, summary: 2 },
      prefix: true,
      fuzzy: 0.2,
      combineWith: 'AND',
    },
  })
  mini.addAll(pages.map((p) => ({
    id: p.path, title: p.title, summary: p.summary, body: p.body, branch: p.branch, isApi: p.isApi,
  })))
  const byPath = new Map(pages.map((p) => [p.path, p]))

  return (query, opts = {}) => {
    const limit = Math.min(Math.max(1, opts.limit ?? SEARCH_DEFAULT_LIMIT), SEARCH_MAX_LIMIT)
    // Punctuation is stripped so makeSnippet centres on the word, not on "unit?".
    const terms = query.split(/\s+/).map((t) => t.replace(/[^\p{L}\p{N}]+/gu, '')).filter(Boolean)
    if (terms.length === 0) return []
    const run = (combineWith: 'AND' | 'OR') => mini.search(query, {
      combineWith,
      filter: opts.branch ? (r) => r.branch === opts.branch : undefined,
      boostDocument: (_id, _term, doc) => ((doc as Doc | undefined)?.isApi ? API_PAGE_WEIGHT : 1),
    })
    let results = run('AND')
    if (results.length === 0 && terms.length > 1) results = run('OR')
    return results.slice(0, limit).map((r) => {
      const page = byPath.get(String(r.id))!
      return {
        path: page.path,
        title: page.title,
        summary: page.summary,
        branch: page.branch,
        score: r.score,
        snippet: makeSnippet(page.body, terms),
      }
    })
  }
}
