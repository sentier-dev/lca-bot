import type { Tool } from '@anthropic-ai/sdk/resources/messages'
import MiniSearch from 'minisearch'
import { findTerm } from './vocabulary'
import { PAGE_WINDOW_CHARS, SEARCH_MAX_LIMIT, WIKI_BRANCHES, type WikiIndex } from './types'

export interface ToolContext {
  index: WikiIndex
  /** Persists a gap report; the caller binds user and conversation. */
  recordGap: (gap: { question: string; note: string | null }) => Promise<unknown>
}

// Mutable on purpose: the SDK types messages.stream's `tools` as Array<ToolUnion>,
// so a `readonly Tool[]` would not be assignable. Treated as constant by callers.
export const WIKI_TOOLS: Tool[] = [
  {
    name: 'search_wiki',
    description: 'Full-text search over the wiki pages. Use it when the index does not point at a page. Returns up to `limit` hits with path, title, summary and a snippet.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Words to search for.' },
        branch: { type: 'string', enum: [...WIKI_BRANCHES], description: 'Restrict to one root branch.' },
        limit: { type: 'integer', minimum: 1, maximum: SEARCH_MAX_LIMIT },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_page',
    description: `Read a wiki page by its path as listed in the index (for example "core/concepts/functional-unit.md"). Long pages come in windows of ${PAGE_WINDOW_CHARS} characters; pass the returned nextOffset to continue.`,
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        offset: { type: 'integer', minimum: 0 },
      },
      required: ['path'],
    },
  },
  {
    name: 'lookup_term',
    description: 'Look a term up in vocabulary.md. Returns every context in which the wiki defines it (ILCD, ISO, a tool, a database), or the closest headings.',
    input_schema: { type: 'object', properties: { term: { type: 'string' } }, required: ['term'] },
  },
  {
    name: 'lookup_source',
    description: 'Resolve a source id from a page\'s sources list (for example "ilcd-2010") to its title, URL, access date and licence.',
    input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'report_gap',
    description: 'Record that the wiki cannot answer the question. Call it once, before telling the user so. Do not invent an answer.',
    input_schema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The question, in the user\'s words or a faithful summary.' },
        note: { type: 'string', description: 'What was looked at and what is missing.' },
      },
      required: ['question'],
    },
  },
]

const err = (message: string, extra: Record<string, unknown> = {}) => JSON.stringify({ error: message, ...extra })

function str(input: Record<string, unknown>, key: string): string | null {
  const v = input[key]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

/**
 * Reads a numeric tool argument. Models hand integers over as strings often
 * enough that coercing is worth it. Returns undefined when the key is absent,
 * null when the value cannot be read as a finite number.
 */
function num(input: Record<string, unknown>, key: string): number | null | undefined {
  const v = input[key]
  if (v === undefined || v === null) return undefined
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v.trim())
    return Number.isFinite(n) ? n : null
  }
  return null
}

function suggestPaths(index: WikiIndex, wanted: string): string[] {
  const mini = new MiniSearch<{ id: string; path: string }>({ fields: ['path'], storeFields: ['path'] })
  mini.addAll([...index.pages.keys()].map((p) => ({ id: p, path: p.replace(/[\/._-]/g, ' ') })))
  return mini.search(wanted.replace(/[\/._-]/g, ' '), { prefix: true, fuzzy: 0.3 }).slice(0, 5).map((h) => String(h.id))
}

/**
 * Runs one tool call against the in-memory index. Always returns a JSON string
 * for the tool_result block; failures are `{error}` objects so the model can
 * recover, never thrown exceptions. Paths are looked up in the index map only;
 * nothing here touches the filesystem.
 */
export async function executeTool(name: string, rawInput: unknown, ctx: ToolContext): Promise<string> {
  const input = (rawInput && typeof rawInput === 'object' ? rawInput : {}) as Record<string, unknown>
  switch (name) {
    case 'search_wiki': {
      const query = str(input, 'query')
      if (!query) return err('query is required')
      const rawBranch = input.branch
      const branch = str(input, 'branch')
      if (rawBranch !== undefined && rawBranch !== null && (!branch || !(WIKI_BRANCHES as readonly string[]).includes(branch))) {
        return err(`unknown branch "${branch ?? String(rawBranch)}"`, { branches: WIKI_BRANCHES })
      }
      const limit = num(input, 'limit')
      if (limit === null) return err(`limit must be an integer between 1 and ${SEARCH_MAX_LIMIT}`)
      const hits = ctx.index.search(query, { branch: branch ?? undefined, limit: limit === undefined ? undefined : Math.floor(limit) })
      return JSON.stringify({ hits: hits.map(({ path, title, summary, branch: b, snippet }) => ({ path, title, summary, branch: b, snippet })) })
    }
    case 'read_page': {
      const path = str(input, 'path')
      if (!path) return err('path is required')
      const page = ctx.index.pages.get(path)
      if (!page) return err('not found', { path, suggestions: suggestPaths(ctx.index, path) })
      const rawOffset = num(input, 'offset')
      if (rawOffset === null || (rawOffset !== undefined && rawOffset < 0)) return err('offset must be a non-negative integer')
      const offset = rawOffset === undefined ? 0 : Math.floor(rawOffset)
      const content = page.body.slice(offset, offset + PAGE_WINDOW_CHARS)
      const end = offset + content.length
      const hasMore = end < page.body.length
      return JSON.stringify({
        path: page.path,
        frontmatter: { title: page.title, type: page.type, summary: page.summary, updated: page.updated, sources: page.sources },
        offset,
        content,
        hasMore,
        nextOffset: hasMore ? end : null,
        totalChars: page.body.length,
      })
    }
    case 'lookup_term': {
      const term = str(input, 'term')
      if (!term) return err('term is required')
      const found = findTerm(ctx.index.terms, term)
      if (!found.exact) return err('not found', { term, suggestions: found.suggestions })
      return JSON.stringify({ term: found.exact.term, section: found.exact.section })
    }
    case 'lookup_source': {
      const id = str(input, 'id')
      if (!id) return err('id is required')
      const source = ctx.index.sources.get(id)
      if (!source) return err('not found', { id })
      return JSON.stringify(source)
    }
    case 'report_gap': {
      const question = str(input, 'question')
      if (!question) return err('question is required')
      const note = str(input, 'note')
      try {
        await ctx.recordGap({ question, note })
      } catch (cause) {
        // The user still has to hear that the wiki cannot answer, so the model
        // gets a recoverable error instead of a thrown exception.
        console.error('[wiki/tools] report_gap could not be persisted', cause)
        return err('could not record the gap; tell the user anyway')
      }
      return JSON.stringify({ recorded: true })
    }
    default:
      return err(`unknown tool "${name}"`)
  }
}
