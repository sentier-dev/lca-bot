import { describe, it, expect } from 'vitest'
import { parseCreateUserArgs } from '../../../scripts/lib/args'

describe('parseCreateUserArgs', () => {
  it('reads the email and optional password', () => {
    expect(parseCreateUserArgs(['a@b.ch'])).toEqual({ email: 'a@b.ch', password: null, googleOnly: false })
    expect(parseCreateUserArgs(['A@B.ch', '--password', 'Secret-123!'])).toEqual({ email: 'a@b.ch', password: 'Secret-123!', googleOnly: false })
    expect(parseCreateUserArgs(['a@b.ch', '--google-only'])).toEqual({ email: 'a@b.ch', password: null, googleOnly: true })
  })

  it('rejects missing or malformed input', () => {
    expect(() => parseCreateUserArgs([])).toThrow(/email/i)
    expect(() => parseCreateUserArgs(['not-an-email'])).toThrow(/email/i)
    expect(() => parseCreateUserArgs(['a@b.ch', '--password'])).toThrow(/password/i)
    expect(() => parseCreateUserArgs(['a@b.ch', '--password', 'short', ])).toThrow(/at least 10/i)
    expect(() => parseCreateUserArgs(['a@b.ch', '--google-only', '--password', 'Secret-123!'])).toThrow(/google-only/i)
  })
})
