export const PASSWORD_MIN_LENGTH = 10

// Stable ids — components map id -> `password.<id>` catalog key for the
// translated label. Never rename without updating the four catalogs.
export type PasswordCheckId = 'minLength' | 'uppercase' | 'number' | 'special'

export interface PasswordCheck {
  id: PasswordCheckId
  met: boolean
}

const UPPERCASE_RE = /[A-Z]/
const NUMBER_RE = /\d/
const SPECIAL_RE = /[^A-Za-z0-9]/

export function getPasswordChecks(password: string): PasswordCheck[] {
  return [
    { id: 'minLength', met: password.length >= PASSWORD_MIN_LENGTH },
    { id: 'uppercase', met: UPPERCASE_RE.test(password) },
    { id: 'number', met: NUMBER_RE.test(password) },
    { id: 'special', met: SPECIAL_RE.test(password) },
  ]
}

export function isPasswordValid(password: string): boolean {
  return getPasswordChecks(password).every((c) => c.met)
}

// English only, deliberately: API routes return this in server error bodies,
// and server errors stay English in v1 (see wiki/subsystems/i18n.md). Client
// displays use the translated `password.requirements` catalog key instead —
// its en value is kept identical to this string.
export const PASSWORD_REQUIREMENTS_TEXT =
  'Password must be at least 10 characters with one uppercase letter, one number, and one special character.'
