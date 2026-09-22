import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockChain = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
}

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => mockChain),
    insert: vi.fn(() => mockChain),
    update: vi.fn(() => mockChain),
    delete: vi.fn(() => mockChain),
  },
}))

vi.mock('@/db/schema', () => ({
  authUsers: { id: 'id', email: 'email', passwordHash: 'passwordHash', provider: 'provider', providerId: 'providerId' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val, type: 'eq' })),
  and: vi.fn((...args) => ({ args, type: 'and' })),
  isNotNull: vi.fn((col) => ({ col, type: 'isNotNull' })),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}))

import { db } from '@/db'
import * as users from '@/db/queries/users'

describe('users queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChain.select.mockReturnThis()
    mockChain.from.mockReturnThis()
    mockChain.where.mockReturnThis()
    mockChain.insert.mockReturnThis()
    mockChain.values.mockReturnThis()
    mockChain.update.mockReturnThis()
    mockChain.set.mockReturnThis()
  })

  it('findUserByEmail returns the row or null', async () => {
    mockChain.where.mockResolvedValueOnce([{ id: 'u1', email: 'a@b.ch' }])
    expect(await users.findUserByEmail('a@b.ch')).toEqual({ id: 'u1', email: 'a@b.ch' })
    mockChain.where.mockResolvedValueOnce([])
    expect(await users.findUserByEmail('x@b.ch')).toBeNull()
  })

  it('createUser inserts an email account with a bcrypt hash', async () => {
    mockChain.returning.mockResolvedValueOnce([{ id: 'u1', email: 'a@b.ch' }])
    const user = await users.createUser('a@b.ch', 'Secret-123!')
    expect(db.insert).toHaveBeenCalled()
    expect(mockChain.values).toHaveBeenCalledWith(expect.objectContaining({ email: 'a@b.ch', provider: 'email' }))
    expect(user).toEqual({ id: 'u1', email: 'a@b.ch' })
  })

  it('createUser with null password inserts a Google-only account', async () => {
    mockChain.returning.mockResolvedValueOnce([{ id: 'u2', email: 'g@b.ch' }])
    await users.createUser('g@b.ch', null)
    expect(mockChain.values).toHaveBeenCalledWith(expect.objectContaining({ email: 'g@b.ch', passwordHash: null, provider: 'google' }))
  })

  it('linkOAuthProvider updates provider and subject', async () => {
    mockChain.returning.mockResolvedValueOnce([{ id: 'u1' }])
    expect(await users.linkOAuthProvider('u1', 'google', 'sub-1')).toBe(true)
    expect(mockChain.set).toHaveBeenCalledWith({ provider: 'google', providerId: 'sub-1' })
  })

  it('does not export any account-creating OAuth helper', () => {
    expect('createOAuthUser' in users).toBe(false)
    expect('createGuestUser' in users).toBe(false)
    expect('promoteGuestUser' in users).toBe(false)
  })
})
