import { describe, it, expect } from 'vitest'
import { POST } from '@/app/api/auth/logout/route'

describe('POST /api/auth/logout', () => {
  it('returns success', async () => {
    const response = await POST()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
  })

  it('expires both auth cookies', async () => {
    const response = await POST()

    const access = response.cookies.get('lw-access-token')
    const refresh = response.cookies.get('lw-refresh-token')
    expect(access?.value).toBe('')
    expect(access?.maxAge).toBe(0)
    expect(refresh?.value).toBe('')
    expect(refresh?.maxAge).toBe(0)

    const setCookie = response.headers.getSetCookie().join('\n')
    expect(setCookie).toContain('lw-access-token=')
    expect(setCookie).toContain('lw-refresh-token=')
    expect(setCookie).toContain('Max-Age=0')
  })
})
