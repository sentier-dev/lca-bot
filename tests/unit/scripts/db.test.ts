import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockCreatePostgresClient } = vi.hoisted(() => ({
  mockCreatePostgresClient: vi.fn(),
}))

vi.mock('../../../src/db/connection', () => ({
  createPostgresClient: (...args: unknown[]) => mockCreatePostgresClient(...args),
}))

import { scriptSql } from '../../../scripts/lib/db'

describe('scriptSql', () => {
  const originalUrl = process.env.DATABASE_URL

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreatePostgresClient.mockReturnValue({ client: true })
  })

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = originalUrl
  })

  it('throws a usable message when DATABASE_URL is unset', () => {
    delete process.env.DATABASE_URL
    expect(() => scriptSql()).toThrow(/DATABASE_URL is required/)
    expect(mockCreatePostgresClient).not.toHaveBeenCalled()
  })

  it('opens a single connection against DATABASE_URL', () => {
    process.env.DATABASE_URL = 'postgres://u:p@localhost:5432/db'
    expect(scriptSql()).toEqual({ client: true })
    expect(mockCreatePostgresClient).toHaveBeenCalledWith('postgres://u:p@localhost:5432/db', { max: 1 })
  })
})
