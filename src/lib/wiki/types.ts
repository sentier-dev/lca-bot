export interface WikiPage {
  /** Posix path relative to the wiki root, e.g. "core/concepts/functional-unit.md". */
  path: string
  title: string
  summary: string
  type: string
  updated: string
  sources: string[]
  /** First path segment, or "root" for top-level files. */
  branch: string
  /** True for generated API reference pages (any "/api/" segment). */
  isApi: boolean
  /** Markdown body without frontmatter. */
  body: string
}

export interface TermEntry {
  term: string
  /** The full "### Term" section, heading included. */
  section: string
}

export interface SourceEntry {
  id: string
  title: string
  url: string
  accessed: string
  licence: string
}

export interface SearchHit {
  path: string
  title: string
  summary: string
  branch: string
  score: number
  snippet: string
}

export interface WikiIndex {
  commit: string
  builtAt: string
  pages: Map<string, WikiPage>
  terms: Map<string, TermEntry>          // key: lower-cased term
  sources: Map<string, SourceEntry>      // key: id
  search: (query: string, opts?: { branch?: string; limit?: number }) => SearchHit[]
  indexMarkdown: string                  // content of index.md, for the system prompt
}

export interface WikiStatus {
  ready: boolean
  commit: string | null
  syncedAt: string | null
  pageCount: number
  lastError: string | null
}

export const WIKI_BRANCHES = ['core', 'sentier', 'brightway', 'bafu', 'ecoinvent'] as const
export type WikiBranch = (typeof WIKI_BRANCHES)[number]

export const PAGE_WINDOW_CHARS = 24_000
export const SEARCH_MAX_LIMIT = 10
export const SEARCH_DEFAULT_LIMIT = 5
export const API_PAGE_WEIGHT = 0.5
