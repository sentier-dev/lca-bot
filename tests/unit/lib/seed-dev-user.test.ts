import { describe, it, expect } from 'vitest'
import { DEV_USER, E2E_USER } from '@/lib/seed-dev-user'

describe('seeded local accounts', () => {
  it('DEV_USER points at the non-routable .local seed domain', () => {
    expect(DEV_USER).toEqual({ email: 'dev@lca-wiki.local', password: 'devpassword123' })
    expect(DEV_USER.email.endsWith('@lca-wiki.local')).toBe(true)
  })

  it('E2E_USER is a distinct account on the same seed domain', () => {
    expect(E2E_USER).toEqual({ email: 'e2e@lca-wiki.local', password: 'e2epassword123' })
    expect(E2E_USER.email).not.toBe(DEV_USER.email)
    expect(E2E_USER.password).not.toBe(DEV_USER.password)
  })

  it('both seed passwords are at least 8 characters long', () => {
    for (const user of [DEV_USER, E2E_USER]) {
      expect(user.password.length).toBeGreaterThanOrEqual(8)
      expect(user.email).toMatch(/^[^@\s]+@[^@\s]+$/)
    }
  })
})
