import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { parsePage } from './frontmatter'
import type { WikiPage } from './types'

const SKIP_DIRS = new Set(['.git', 'raw', 'node_modules', '.claude'])

async function walk(root: string, rel = ''): Promise<string[]> {
  const entries = await readdir(path.join(root, rel), { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      files.push(...(await walk(root, rel ? `${rel}/${entry.name}` : entry.name)))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(rel ? `${rel}/${entry.name}` : entry.name)
    }
  }
  return files
}

/** Reads every markdown page under `root` (posix relative paths), skipping .git and raw/. */
export async function loadPages(root: string): Promise<WikiPage[]> {
  const files = await walk(root)
  const pages = await Promise.all(
    files.map(async (rel) => parsePage(rel, await readFile(path.join(root, rel), 'utf8'))),
  )
  // Codepoint order, not locale order: the page order must not depend on ICU.
  return pages.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}
