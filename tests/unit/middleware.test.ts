import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const { mockUpdateSession } = vi.hoisted(() => ({
  mockUpdateSession: vi.fn(),
}))

vi.mock('@/lib/auth/middleware', () => ({
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
}))

import { middleware, config } from '@/middleware'

describe('root middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('delegates to updateSession and returns its response', async () => {
    const expected = NextResponse.next()
    mockUpdateSession.mockResolvedValue(expected)
    const request = new NextRequest('http://localhost:3000/chat')

    const response = await middleware(request)

    expect(mockUpdateSession).toHaveBeenCalledTimes(1)
    expect(mockUpdateSession).toHaveBeenCalledWith(request)
    expect(response).toBe(expected)
  })

  it('propagates a redirect produced by updateSession', async () => {
    const redirect = NextResponse.redirect('http://localhost:3000/login?redirectedFrom=%2Fchat')
    mockUpdateSession.mockResolvedValue(redirect)

    const response = await middleware(new NextRequest('http://localhost:3000/chat'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/login')
  })

  it('matches the protected areas and the login route only', () => {
    expect(config.matcher).toEqual([
      '/chat/:path*',
      '/archive/:path*',
      '/settings/:path*',
      '/login',
    ])
  })
})
