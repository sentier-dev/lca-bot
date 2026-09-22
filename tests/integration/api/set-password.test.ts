import { describe, it, expect } from 'vitest'
import { testSql } from '../helpers/seed'
import { issueToken } from '@/db/queries/password-tokens'
import { POST } from '@/app/api/auth/set-password/route'

async function makeUser(): Promise<{ id: string; email: string }> {
  const email = `setpw-${Date.now()}-${Math.random()}@integration.test`
  const [u] = await testSql`
    INSERT INTO auth.users (email, provider)
    VALUES (${email}, 'email') RETURNING id, email
  `
  return u as { id: string; email: string }
}

function makeRequest(body: unknown): Request {
  return new Request('http://test.local/api/auth/set-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/set-password', () => {
  it('sets the password and returns a JWT cookie', async () => {
    const user = await makeUser()
    const { secret } = await issueToken(user.id, 'set_initial')
    const res = await POST(makeRequest({ token: secret, password: 'Newsecret1!' }) as never)
    expect(res.status).toBe(200)
    const cookies = res.headers.getSetCookie?.() ?? res.headers.get('set-cookie')
    expect(JSON.stringify(cookies)).toContain('lw-access-token')

    const [row] = await testSql`SELECT password_hash FROM auth.users WHERE id = ${user.id}`
    expect(row.password_hash).not.toBeNull()
  })

  it('rejects an unknown token with 410', async () => {
    const res = await POST(makeRequest({ token: 'not-a-token', password: 'Newsecret1!' }) as never)
    expect(res.status).toBe(410)
  })

  it('rejects a reused token with 410', async () => {
    const user = await makeUser()
    const { secret } = await issueToken(user.id, 'set_initial')
    await POST(makeRequest({ token: secret, password: 'Newsecret1!' }) as never)
    const second = await POST(makeRequest({ token: secret, password: 'Newsecret1!' }) as never)
    expect(second.status).toBe(410)
  })

  it('rejects passwords that do not meet requirements with 400', async () => {
    const user = await makeUser()
    const { secret } = await issueToken(user.id, 'set_initial')
    const res = await POST(makeRequest({ token: secret, password: 'short' }) as never)
    expect(res.status).toBe(400)
  })

  it('makes a second outstanding token unusable after a successful reset', async () => {
    const user = await makeUser()
    const first = await issueToken(user.id, 'reset')
    const second = await issueToken(user.id, 'reset')

    const res = await POST(makeRequest({ token: first.secret, password: 'Newsecret1!' }) as never)
    expect(res.status).toBe(200)

    const reuse = await POST(makeRequest({ token: second.secret, password: 'Othersecret2!' }) as never)
    expect(reuse.status).toBe(410)
  })

  it('bumps updated_at on a reset', async () => {
    const user = await makeUser()
    const [before] = await testSql`SELECT updated_at FROM auth.users WHERE id = ${user.id}`
    const { secret } = await issueToken(user.id, 'set_initial')

    const res = await POST(makeRequest({ token: secret, password: 'Newsecret1!' }) as never)
    expect(res.status).toBe(200)

    const [after] = await testSql`SELECT updated_at FROM auth.users WHERE id = ${user.id}`
    expect(new Date(after.updated_at).getTime()).toBeGreaterThan(new Date(before.updated_at).getTime())
  })
})
