import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { loadPages } from './loader'
import { buildSearch } from './search'
import { parseVocabulary } from './vocabulary'
import { parseSources } from './sources'
import type { WikiIndex } from './types'

async function readOptional(root: string, file: string): Promise<string> {
  try {
    return await readFile(path.join(root, file), 'utf8')
  } catch {
    return ''
  }
}

/** Reads the checkout at `root` and returns a complete in-memory index. */
export async function buildIndex(root: string, commit: string): Promise<WikiIndex> {
  let indexMarkdown: string
  try {
    indexMarkdown = await readFile(path.join(root, 'index.md'), 'utf8')
  } catch {
    throw new Error(`wiki checkout at ${root} has no index.md`)
  }
  const pages = await loadPages(root)
  const [vocabulary, sources] = await Promise.all([readOptional(root, 'vocabulary.md'), readOptional(root, 'sources.md')])
  return {
    commit,
    builtAt: new Date().toISOString(),
    pages: new Map(pages.map((p) => [p.path, p])),
    terms: parseVocabulary(vocabulary),
    sources: parseSources(sources),
    search: buildSearch(pages),
    indexMarkdown,
  }
}
