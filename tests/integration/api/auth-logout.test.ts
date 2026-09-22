import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
}))

const mockCookieStore = { get: vi.fn() }
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}))

const { POST } = await import('@/app/api/auth/logout/route')

describe('POST /api/auth/logout', () => {
  it('clears both auth cookies', async () => {
    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    const setCookies = response.headers.getSetCookie()
    const accessCookie = setCookies.find((c: string) => c.includes('lw-access-token'))
    const refreshCookie = setCookies.find((c: string) => c.includes('lw-refresh-token'))

    expect(accessCookie).toBeDefined()
    expect(refreshCookie).toBeDefined()

    // Verify Max-Age=0 to clear the cookies
    expect(accessCookie).toContain('Max-Age=0')
    expect(refreshCookie).toContain('Max-Age=0')
  })
})
