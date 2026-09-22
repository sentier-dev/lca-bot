import { isPasswordValid, PASSWORD_REQUIREMENTS_TEXT } from '../../src/lib/validation/password'

export interface CreateUserArgs {
  email: string
  password: string | null
  googleOnly: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function parseEmailArg(value: string | undefined): string {
  if (!value || !EMAIL_RE.test(value)) {
    throw new Error('Usage: <email> is required and must be a valid address')
  }
  return value.trim().toLowerCase()
}

export function parseCreateUserArgs(argv: string[]): CreateUserArgs {
  const [emailArg, ...rest] = argv
  const email = parseEmailArg(emailArg)
  let password: string | null = null
  let googleOnly = false

  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i]
    if (flag === '--password') {
      const value = rest[i + 1]
      if (!value || value.startsWith('--')) throw new Error('--password needs a value')
      if (!isPasswordValid(value)) throw new Error(PASSWORD_REQUIREMENTS_TEXT)
      password = value
      i++
    } else if (flag === '--google-only') {
      googleOnly = true
    } else {
      throw new Error(`Unknown argument: ${flag}`)
    }
  }
  if (googleOnly && password) throw new Error('--google-only cannot be combined with --password')
  return { email, password, googleOnly }
}
