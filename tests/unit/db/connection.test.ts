import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const postgresMock = vi.hoisted(() =>
  vi.fn<(url: string, options: Record<string, unknown>) => { tag: string }>(() => ({ tag: 'client' })),
)

vi.mock('postgres', () => ({ default: postgresMock }))

import { createPostgresClient } from '@/db/connection'

describe('createPostgresClient', () => {
  beforeEach(() => {
    postgresMock.mockClear()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('passes a plain URL through with ssl off outside production', () => {
    vi.stubEnv('NODE_ENV', 'development')
    createPostgresClient('postgres://user:pw@localhost:5432/app')

    const [url, options] = postgresMock.mock.calls[0]
    expect(url).toBe('postgres://user:pw@localhost:5432/app')
    expect(options).toMatchObject({ max: 10, idle_timeout: 20, connect_timeout: 10, ssl: false })
    expect(options).not.toHaveProperty('host')
  })

  it('requires ssl in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    createPostgresClient('postgres://user:pw@db.example.org:5432/app')

    expect(postgresMock.mock.calls[0][1]).toMatchObject({ ssl: 'require' })
  })

  it('strips a Cloud SQL host query param and passes the socket path as host', () => {
    vi.stubEnv('NODE_ENV', 'production')
    createPostgresClient('postgres://user:pw@localhost/app?host=/cloudsql/proj:region:inst')

    const [url, options] = postgresMock.mock.calls[0]
    expect(url).toBe('postgres://user:pw@localhost/app')
    // The socket connection is local, so ssl stays off even in production.
    expect(options).toMatchObject({ host: '/cloudsql/proj:region:inst', ssl: false })
  })

  it('reads the pool size from DB_POOL_SIZE and lets the caller override it', () => {
    vi.stubEnv('DB_POOL_SIZE', '25')
    createPostgresClient('postgres://localhost/app')
    expect(postgresMock.mock.calls[0][1]).toMatchObject({ max: 25 })

    createPostgresClient('postgres://localhost/app', { max: 1 })
    expect(postgresMock.mock.calls[1][1]).toMatchObject({ max: 1 })
  })

  it('keeps the other query params when it strips the Cloud SQL host param', () => {
    vi.stubEnv('NODE_ENV', 'production')
    createPostgresClient('postgres://user:pw@localhost/app?host=/cloudsql/x&sslmode=require')

    const [url, options] = postgresMock.mock.calls[0]
    expect(url).toBe('postgres://user:pw@localhost/app?sslmode=require')
    expect(options).toMatchObject({ host: '/cloudsql/x', ssl: false })
  })

  it('handles the host param in any position', () => {
    vi.stubEnv('NODE_ENV', 'production')
    createPostgresClient('postgres://user:pw@localhost/app?sslmode=require&host=/cloudsql/x&application_name=lca')

    const [url, options] = postgresMock.mock.calls[0]
    expect(url).toBe('postgres://user:pw@localhost/app?sslmode=require&application_name=lca')
    expect(options).toMatchObject({ host: '/cloudsql/x' })
  })

  it('decodes a percent-encoded socket path', () => {
    createPostgresClient('postgres://user:pw@localhost/app?host=%2Fcloudsql%2Fproj%3Aregion%3Ainst')

    expect(postgresMock.mock.calls[0][1]).toMatchObject({ host: '/cloudsql/proj:region:inst' })
  })

  it('ignores a non-socket host param and leaves the URL alone', () => {
    vi.stubEnv('NODE_ENV', 'development')
    createPostgresClient('postgres://user:pw@localhost/app?host=db.example.org')

    const [url, options] = postgresMock.mock.calls[0]
    expect(url).toBe('postgres://user:pw@localhost/app?host=db.example.org')
    expect(options).not.toHaveProperty('host')
  })

  it('passes an unparseable connection string straight through', () => {
    createPostgresClient('not a url')
    expect(postgresMock.mock.calls[0][0]).toBe('not a url')
  })
})
