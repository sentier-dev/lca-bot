import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtemp, rm, writeFile, cp } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ensureCheckout, headCommit } from '@/lib/wiki/git'

const run = promisify(execFile)
const FIXTURE = path.resolve(__dirname, '../../../fixtures/wiki')

let origin: string
let work: string

beforeAll(async () => {
  origin = await mkdtemp(path.join(os.tmpdir(), 'wiki-origin-'))
  work = await mkdtemp(path.join(os.tmpdir(), 'wiki-work-'))
  await cp(FIXTURE, origin, { recursive: true })
  await run('git', ['-C', origin, 'init', '-q', '-b', 'main'])
  await run('git', ['-C', origin, '-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A'])
  await run('git', ['-C', origin, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'init'])
})

afterAll(async () => {
  await rm(origin, { recursive: true, force: true })
  await rm(work, { recursive: true, force: true })
})

describe('git helpers', () => {
  it('clones when the checkout is missing, then pulls new commits', async () => {
    const dir = path.join(work, 'checkout')
    const first = await ensureCheckout(origin, dir)
    expect(first.action).toBe('cloned')
    expect(await headCommit(dir)).toBe(first.commit)

    await writeFile(path.join(origin, 'new.md'), '# New\n')
    await run('git', ['-C', origin, '-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A'])
    await run('git', ['-C', origin, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'two'])

    const second = await ensureCheckout(origin, dir)
    expect(second.action).toBe('pulled')
    expect(second.commit).not.toBe(first.commit)
    expect(second.changed).toBe(true)

    const third = await ensureCheckout(origin, dir)
    expect(third.changed).toBe(false)
  })

  it('recovers by resetting to FETCH_HEAD when the origin history was rewritten', async () => {
    const dir = path.join(work, 'rewritten')
    const first = await ensureCheckout(origin, dir)
    expect(first.action).toBe('cloned')

    // Rewrite the origin tip: a fast-forward pull cannot follow this.
    await writeFile(path.join(origin, 'amended.md'), '# Amended\n')
    await run('git', ['-C', origin, '-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A'])
    await run('git', ['-C', origin, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--amend', '-m', 'amended'])
    const originHead = (await run('git', ['-C', origin, 'rev-parse', '--short=12', 'HEAD'])).stdout.trim()

    const second = await ensureCheckout(origin, dir)
    expect(second.action).toBe('pulled')
    expect(second.commit).toBe(originHead)
    expect(second.changed).toBe(true)
    expect(await headCommit(dir)).toBe(originHead)
  })

  it('rethrows when the remote cannot be reached at all', async () => {
    const dir = path.join(work, 'broken')
    await ensureCheckout(origin, dir)
    await run('git', ['-C', dir, 'remote', 'set-url', 'origin', path.join(work, 'does-not-exist')])
    await expect(ensureCheckout(path.join(work, 'does-not-exist'), dir)).rejects.toThrow()
  })

  it('returns the commit without touching git when sync is disabled', async () => {
    const result = await ensureCheckout(origin, origin, { disabled: true })
    expect(result.action).toBe('skipped')
    expect(result.commit).toBe(await headCommit(origin))
  })

  it('reports "unknown" for a directory that is not a git checkout', async () => {
    expect(await headCommit(FIXTURE)).toBe('unknown')
  })
})
