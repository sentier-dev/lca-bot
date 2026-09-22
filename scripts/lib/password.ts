import { randomInt } from 'node:crypto'

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWER = 'abcdefghijkmnopqrstuvwxyz'
const DIGITS = '23456789'
const SPECIAL = '!#%*+-=?@'
const ALL = UPPER + LOWER + DIGITS + SPECIAL

const pick = (set: string) => set[randomInt(set.length)]

/** 20 chars, guaranteed to satisfy src/lib/validation/password.ts. */
export function generatePassword(length = 20): string {
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SPECIAL)]
  while (chars.length < length) chars.push(pick(ALL))
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}
