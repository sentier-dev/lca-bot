import { describe, it, expect } from 'vitest'
import { isSafeInternalPath } from '@/lib/auth/safe-internal-path'

describe('isSafeInternalPath', () => {
  it('accepts plain same-origin absolute paths', () => {
    expect(isSafeInternalPath('/')).toBe(true)
    expect(isSafeInternalPath('/dashboard')).toBe(true)
    expect(isSafeInternalPath('/project/abc/chat')).toBe(true)
    expect(isSafeInternalPath('/subscribe?plan=pro')).toBe(true)
  })

  it('rejects empty and non-path values', () => {
    expect(isSafeInternalPath(null)).toBe(false)
    expect(isSafeInternalPath(undefined)).toBe(false)
    expect(isSafeInternalPath('')).toBe(false)
    expect(isSafeInternalPath('dashboard')).toBe(false)
    expect(isSafeInternalPath('https://evil.example.com/')).toBe(false)
  })

  it('rejects protocol-relative URLs', () => {
    expect(isSafeInternalPath('//evil.example.com')).toBe(false)
  })

  it('rejects backslash variants that browsers normalize to //', () => {
    expect(isSafeInternalPath('/\\evil.example.com')).toBe(false)
    expect(isSafeInternalPath('/\\/evil.example.com')).toBe(false)
  })

  it('rejects API and framework-internal routes (same-origin but not pages)', () => {
    expect(isSafeInternalPath('/api/auth/google')).toBe(false)
    expect(isSafeInternalPath('/api/projects')).toBe(false)
    expect(isSafeInternalPath('/_next/static/chunk.js')).toBe(false)
  })

  it('rejects whitespace smuggling (tab/newline stripped by URL parsers)', () => {
    expect(isSafeInternalPath('/\t/evil.example.com')).toBe(false)
    expect(isSafeInternalPath('/\n/evil.example.com')).toBe(false)
    expect(isSafeInternalPath('/ /evil.example.com')).toBe(false)
  })
})
