import { describe, it, expect } from 'vitest'
import {
  isPasswordValid,
  getPasswordChecks,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS_TEXT,
} from '@/lib/validation/password'
import en from '../../../messages/en.json'

describe('isPasswordValid', () => {
  it('accepts a password that meets all requirements', () => {
    expect(isPasswordValid('Securepass1!')).toBe(true)
  })

  it('rejects a password shorter than 10 characters', () => {
    expect(isPasswordValid('Short1!A')).toBe(false)
  })

  it('rejects a password without an uppercase letter', () => {
    expect(isPasswordValid('securepass1!')).toBe(false)
  })

  it('rejects a password without a number', () => {
    expect(isPasswordValid('Securepass!')).toBe(false)
  })

  it('rejects a password without a special character', () => {
    expect(isPasswordValid('Securepass1')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isPasswordValid('')).toBe(false)
  })
})

describe('getPasswordChecks', () => {
  it('returns four checks', () => {
    const checks = getPasswordChecks('anything')
    expect(checks).toHaveLength(4)
  })

  it('returns stable ids for each check, in order', () => {
    const checks = getPasswordChecks('anything')
    expect(checks.map((c) => c.id)).toEqual(['minLength', 'uppercase', 'number', 'special'])
  })

  it('marks all checks as met for a valid password', () => {
    const checks = getPasswordChecks('Securepass1!')
    expect(checks.every((c) => c.met)).toBe(true)
  })

  it('marks length as unmet for a short password', () => {
    const checks = getPasswordChecks('Aa1!')
    const lengthCheck = checks.find((c) => c.id === 'minLength')
    expect(lengthCheck?.met).toBe(false)
  })

  it('every check id resolves to a non-empty en catalog label under password.*', () => {
    const checks = getPasswordChecks('anything')
    for (const check of checks) {
      const label = (en.password as Record<string, string>)[check.id]
      expect(label).toBeTruthy()
    }
  })

  it('en catalog labels match the original English display strings', () => {
    const password = en.password as Record<string, string>
    expect(password.minLength).toBe('At least 10 characters')
    expect(password.uppercase).toBe('One uppercase letter')
    expect(password.number).toBe('One number')
    expect(password.special).toBe('One special character')
  })
})

describe('PASSWORD_MIN_LENGTH', () => {
  it('is 10', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(10)
  })
})

describe('PASSWORD_REQUIREMENTS_TEXT / password.requirements coupling', () => {
  // The server-side English constant (returned by API routes) and the
  // client-side translated catalog key must stay byte-identical in en, or
  // the two copies of this sentence silently drift apart. Lock it here so a
  // future edit to either side fails CI instead of just one of them.
  it('matches the en catalog value for password.requirements', () => {
    expect(en.password.requirements).toBe(PASSWORD_REQUIREMENTS_TEXT)
  })
})
