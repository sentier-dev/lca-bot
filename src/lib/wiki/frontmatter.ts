import matter from 'gray-matter'
import type { WikiPage } from './types'

function asString(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (value === undefined || value === null) return ''
  return String(value)
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v))
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

function firstHeading(body: string): string | null {
  const m = body.match(/^#\s+(.+?)\s*$/m)
  return m ? m[1].trim() : null
}

function fileStem(path: string): string {
  const base = path.split('/').pop() ?? path
  return base.replace(/\.md$/, '')
}

export function branchOf(path: string): string {
  const i = path.indexOf('/')
  return i === -1 ? 'root' : path.slice(0, i)
}

export function isApiPath(path: string): boolean {
  return path.split('/').includes('api')
}

/** Parses one wiki page. Never throws on bad frontmatter: falls back to the raw text. */
export function parsePage(path: string, raw: string): WikiPage {
  let data: Record<string, unknown> = {}
  let body = raw
  try {
    // Pass an explicit options object: gray-matter caches every parse in a
    // global map when called without options, which leaks across re-syncs.
    const parsed = matter(raw, {})
    data = parsed.data as Record<string, unknown>
    body = parsed.content
  } catch {
    // Malformed frontmatter: index the whole file as body.
  }
  const trimmedBody = body.replace(/^\s+/, '')
  return {
    path,
    title: asString(data.title) || firstHeading(trimmedBody) || fileStem(path),
    summary: asString(data.summary),
    type: asString(data.type),
    updated: asString(data.updated),
    sources: asStringList(data.sources),
    branch: branchOf(path),
    isApi: isApiPath(path),
    body: trimmedBody,
  }
}
