import { describe, it, expect, vi } from 'vitest'
import { testSql } from '../helpers/seed'
import { makeRequest } from '../helpers/auth'

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  peekRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 99 }),
}))

const mockCookieStore = { get: vi.fn() }
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}))

const { POST } = await import('@/app/api/auth/login/route')

describe('POST /api/auth/login', () => {
  const seedUser = async (email = 'login@test.com', password = 'password123') => {
    await testSql`
      INSERT INTO auth.users (email, password_hash, provider) VALUES (${email}, crypt(${password}, gen_salt('bf')), 'email')
    `
  }

  it('authenticates with valid credentials and sets JWT cookies', async () => {
    await seedUser()

    const request = makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'login@test.com', password: 'password123' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.user).toBeDefined()
    expect(data.user.email).toBe('login@test.com')

    const setCookies = response.headers.getSetCookie()
    const accessCookie = setCookies.find((c: string) => c.includes('lw-access-token'))
    const refreshCookie = setCookies.find((c: string) => c.includes('lw-refresh-token'))
    expect(accessCookie).toBeDefined()
    expect(refreshCookie).toBeDefined()
  })

  it('returns 401 for wrong password', async () => {
    await seedUser()

    const request = makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'login@test.com', password: 'wrongpassword' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toContain('Invalid')
  })

  it('returns 401 for non-existent email', async () => {
    const request = makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'nobody@test.com', password: 'password123' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toContain('Invalid')
  })

  it('returns 400 when fields are missing', async () => {
    const request = makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'login@test.com' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
  })
})
