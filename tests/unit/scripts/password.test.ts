import { describe, it, expect } from 'vitest'
import { generatePassword } from '../../../scripts/lib/password'
import { isPasswordValid } from '@/lib/validation/password'

describe('generatePassword', () => {
  it('produces a valid, 20-character password every time', () => {
    for (let i = 0; i < 50; i++) {
      const pwd = generatePassword()
      expect(pwd).toHaveLength(20)
      expect(isPasswordValid(pwd)).toBe(true)
    }
  })
  it('does not repeat', () => {
    expect(generatePassword()).not.toBe(generatePassword())
  })
})
