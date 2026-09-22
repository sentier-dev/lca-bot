import { describe, it, expect, vi } from 'vitest'
import { createTestUser } from '../helpers/seed'

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
}))

const mockCookieStore = { get: vi.fn() }
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}))

const { GET } = await import('@/app/api/auth/me/route')

describe('GET /api/auth/me', () => {
  it('returns the authenticated user', async () => {
    const user = await createTestUser()

    mockCookieStore.get.mockImplementation((name: string) => {
      if (name === 'lw-access-token') return { value: user.accessToken }
      return undefined
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.user).toBeDefined()
    expect(data.user.id).toBe(user.id)
    expect(data.user.email).toBe(user.email)
    expect(data.user.hasPassword).toBe(true)
  })

  it('returns 401 when no cookie is present', async () => {
    mockCookieStore.get.mockReturnValue(undefined)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.user).toBeNull()
  })
})
