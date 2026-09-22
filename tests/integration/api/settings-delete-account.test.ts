import { describe, it, expect, vi } from 'vitest'
import { createTestUser, createTestConversation, testSql } from '../helpers/seed'

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
}))

const mockCookieStore = { get: vi.fn() }
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}))

function authenticateAs(user: { accessToken: string }) {
  mockCookieStore.get.mockImplementation((name: string) => {
    if (name === 'lw-access-token') return { value: user.accessToken }
    return undefined
  })
}

const { POST } = await import('@/app/api/settings/delete-account/route')

describe('POST /api/settings/delete-account', () => {
  it('deletes user and cascades to conversations', async () => {
    const user = await createTestUser()
    authenticateAs(user)

    const conversation = await createTestConversation(user.id)


    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)

    // Verify user is gone
    const [userRow] = await testSql`
      SELECT id FROM auth.users WHERE id = ${user.id}
    `
    expect(userRow).toBeUndefined()

    // Verify the user's conversations are gone
    const conversations = await testSql`
      SELECT id FROM conversations WHERE id = ${conversation.id}
    `
    expect(conversations).toHaveLength(0)
  })

  it('clears auth cookies on deletion', async () => {
    const user = await createTestUser()
    authenticateAs(user)


    const response = await POST()

    expect(response.status).toBe(200)

    const setCookies = response.headers.getSetCookie()
    const accessCookie = setCookies.find((c: string) => c.includes('lw-access-token'))
    const refreshCookie = setCookies.find((c: string) => c.includes('lw-refresh-token'))
    expect(accessCookie).toBeDefined()
    expect(refreshCookie).toBeDefined()
    // Both should be cleared (maxAge=0)
    expect(accessCookie).toContain('Max-Age=0')
    expect(refreshCookie).toContain('Max-Age=0')
  })
})
