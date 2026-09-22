import { describe, it, expect } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile, cp } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { loadPages } from '@/lib/wiki/loader'

const FIXTURE = path.resolve(__dirname, '../../../fixtures/wiki')

describe('loadPages', () => {
  it('loads every markdown page with posix paths', async () => {
    const pages = await loadPages(FIXTURE)
    const paths = pages.map((p) => p.path).sort()
    expect(paths).toHaveLength(13)
    expect(paths).toContain('index.md')
    expect(paths).toContain('brightway/modules/bw2data/api/bw2data.md')
    expect(paths.every((p) => !p.includes('\\'))).toBe(true)
  })

  it('skips raw/ and .git/', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'wiki-skip-'))
    try {
      await cp(FIXTURE, dir, { recursive: true })
      await mkdir(path.join(dir, 'raw'), { recursive: true })
      await mkdir(path.join(dir, '.git'), { recursive: true })
      await writeFile(path.join(dir, 'raw/x.md'), '# Raw\n')
      await writeFile(path.join(dir, '.git/y.md'), '# Git\n')

      const paths = (await loadPages(dir)).map((p) => p.path)
      expect(paths).toHaveLength(13)
      expect(paths).not.toContain('raw/x.md')
      expect(paths).not.toContain('.git/y.md')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('returns parsed pages', async () => {
    const pages = await loadPages(FIXTURE)
    const fu = pages.find((p) => p.path === 'core/concepts/functional-unit.md')
    expect(fu?.title).toBe('Functional unit')
    expect(fu?.body).toContain('reference unit')
  })
})
