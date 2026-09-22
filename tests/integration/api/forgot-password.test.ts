import { describe, it, expect, vi, beforeEach } from 'vitest'
import { testSql } from '../helpers/seed'

const mockSendEmail = vi.fn()
vi.mock('@/lib/email/client', () => ({
  sendEmail: (...a: unknown[]) => mockSendEmail(...a),
}))

const { POST } = await import('@/app/api/auth/forgot-password/route')

function makeRequest(body: unknown): Request {
  return new Request('http://test.local/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => { mockSendEmail.mockReset() })

  it('issues a reset token and sends an email for a user with a password', async () => {
    const email = `fp-${Date.now()}-${Math.random()}@integration.test`
    const [u] = await testSql`
      INSERT INTO auth.users (email, password_hash, provider)
      VALUES (${email}, crypt('pass', gen_salt('bf')), 'email') RETURNING id
    `
    const res = await POST(makeRequest({ email }) as never)
    expect(res.status).toBe(200)
    const [token] = await testSql`SELECT purpose FROM password_reset_tokens WHERE user_id = ${u.id}`
    expect(token?.purpose).toBe('reset')
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: email, html: expect.stringContaining('/set-password?token='),
    }))
  })

  it('issues a set_initial token for a user without a password', async () => {
    const email = `fp-nopw-${Date.now()}-${Math.random()}@integration.test`
    const [u] = await testSql`
      INSERT INTO auth.users (email, provider)
      VALUES (${email}, 'email') RETURNING id
    `
    await POST(makeRequest({ email }) as never)
    const [token] = await testSql`SELECT purpose FROM password_reset_tokens WHERE user_id = ${u.id}`
    expect(token?.purpose).toBe('set_initial')
  })

  it('returns 200 for an unknown email without sending', async () => {
    const res = await POST(makeRequest({ email: 'nobody@nowhere.test' }) as never)
    expect(res.status).toBe(200)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('returns 400 on bad input', async () => {
    const res = await POST(makeRequest({ email: 123 }) as never)
    expect(res.status).toBe(400)
  })
})
