import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { clientIp } from '@/lib/request-ip'

function requestWithXff(value?: string) {
  return new NextRequest('http://localhost:3000/api/auth/login', {
    headers: value !== undefined ? { 'x-forwarded-for': value } : {},
  })
}

describe('clientIp', () => {
  it('takes the LAST x-forwarded-for entry (edge-appended, unspoofable)', () => {
    expect(clientIp(requestWithXff('203.0.113.7'))).toBe('203.0.113.7')
    expect(clientIp(requestWithXff('10.0.0.1, 203.0.113.7'))).toBe('203.0.113.7')
    expect(clientIp(requestWithXff(' 10.0.0.1 , 172.16.0.9 , 203.0.113.7 '))).toBe('203.0.113.7')
  })

  it('ignores attacker-prepended entries — the spoofing case the mobile review found', () => {
    // A caller sends its own XFF; the edge appends the real peer address last.
    // Keying rate limits on the FIRST entry would mint a fresh bucket per
    // request; the last entry is the trusted connection address.
    expect(clientIp(requestWithXff('6.6.6.6, 203.0.113.7'))).toBe('203.0.113.7')
  })

  it("falls back to 'unknown' without the header or with an empty value", () => {
    expect(clientIp(requestWithXff())).toBe('unknown')
    expect(clientIp(requestWithXff(' , '))).toBe('unknown')
  })
})
