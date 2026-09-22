import { describe, it, expect, vi } from 'vitest'
import { createTestUser, testSql } from '../helpers/seed'
import { makeRequest } from '../helpers/auth'

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

const { POST } = await import('@/app/api/settings/password/route')

describe('POST /api/settings/password', () => {
  it('changes password when current password is correct', async () => {
    const user = await createTestUser({ password: 'Oldpassword1!' })
    authenticateAs(user)

    const request = makeRequest('/api/settings/password', {
      method: 'POST',
      body: { currentPassword: 'Oldpassword1!', newPassword: 'Newpassword1!' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)

    // Verify the new password works via pgcrypto
    const [row] = await testSql`
      SELECT id FROM auth.users
      WHERE id = ${user.id}
        AND password_hash = crypt(${'Newpassword1!'}, password_hash)
    `
    expect(row).toBeDefined()
    expect(row.id).toBe(user.id)
  })

  it('rejects when current password is wrong', async () => {
    const user = await createTestUser({ password: 'Correctpass1!' })
    authenticateAs(user)

    const request = makeRequest('/api/settings/password', {
      method: 'POST',
      body: { currentPassword: 'Wrongpassword1!', newPassword: 'Newpassword1!' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toContain('incorrect')
  })

  it('rejects new password that does not meet requirements', async () => {
    const user = await createTestUser({ password: 'Correctpass1!' })
    authenticateAs(user)

    const request = makeRequest('/api/settings/password', {
      method: 'POST',
      body: { currentPassword: 'Correctpass1!', newPassword: 'short' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('at least 10 characters')
  })
})
