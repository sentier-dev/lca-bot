import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/(auth)/callback/route'

describe('GET /callback (legacy)', () => {
  it('redirects a stale hit to the login page on the same origin', async () => {
    const request = new NextRequest('http://localhost:3000/callback?code=abc')

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/login')
  })

  it('keeps the origin of the incoming request', async () => {
    const request = new NextRequest('https://lca.example.org/callback')

    const response = await GET(request)

    expect(response.headers.get('location')).toBe('https://lca.example.org/login')
  })
})
