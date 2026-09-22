import { describe, it, expect } from 'vitest'
import { passwordResetEmail } from '@/lib/email/templates/password-reset'
import { setInitialPasswordEmail } from '@/lib/email/templates/set-initial-password'

const RESET_URL = 'https://wiki.example.org/reset-password?token=abc123%2Fdef'
const SET_URL = 'https://wiki.example.org/set-password?token=xyz789%2Fghi'

describe('passwordResetEmail', () => {
  const message = passwordResetEmail({ to: 'user@example.com', resetUrl: RESET_URL })

  it('addresses the recipient and uses the reset subject', () => {
    expect(message.to).toBe('user@example.com')
    expect(message.subject).toBe('Reset your LCA Wiki password')
  })

  it('puts the reset url in both the text and html bodies', () => {
    expect(message.text).toContain(RESET_URL)
    expect(message.html).toContain(RESET_URL)
  })

  it('renders the url as a clickable anchor href in the html', () => {
    expect(message.html).toContain(`<a href="${RESET_URL}"`)
    expect(message.html).toMatch(/<a href="[^"]*"[^>]*>Reset password<\/a>/)
  })

  it('is a complete html document', () => {
    expect(message.html.startsWith('<!doctype html>')).toBe(true)
    expect(message.html).toContain('</html>')
    expect(message.html).toContain('<h1')
  })

  it('states the one hour expiry in both bodies', () => {
    expect(message.text).toContain('expires in 1 hour')
    expect(message.html).toContain('expires in 1 hour')
  })

  it('tells an unexpecting recipient to ignore the mail', () => {
    expect(message.text).toContain("If you didn't request this")
    expect(message.html).toContain("If you didn't request this")
  })

  it('emits plain text with no html tags', () => {
    expect(message.text).not.toMatch(/<[a-z]/i)
    expect(message.text.split('\n').length).toBeGreaterThan(1)
  })

  it('carries the url through verbatim for each call', () => {
    const other = passwordResetEmail({ to: 'b@example.com', resetUrl: 'https://x.test/r?t=1&u=2' })
    expect(other.to).toBe('b@example.com')
    expect(other.text).toContain('https://x.test/r?t=1&u=2')
    expect(other.html).toContain('href="https://x.test/r?t=1&u=2"')
  })
})

describe('setInitialPasswordEmail', () => {
  const message = setInitialPasswordEmail({ to: 'new@example.com', setPasswordUrl: SET_URL })

  it('addresses the recipient and uses the onboarding subject', () => {
    expect(message.to).toBe('new@example.com')
    expect(message.subject).toBe('Finish setting up your LCA Wiki account')
  })

  it('puts the set-password url in both the text and html bodies', () => {
    expect(message.text).toContain(SET_URL)
    expect(message.html).toContain(SET_URL)
  })

  it('renders the url as a clickable anchor href in the html', () => {
    expect(message.html).toContain(`<a href="${SET_URL}"`)
    expect(message.html).toMatch(/<a href="[^"]*"[^>]*>Set your password<\/a>/)
  })

  it('is a complete html document that welcomes the user', () => {
    expect(message.html.startsWith('<!doctype html>')).toBe(true)
    expect(message.html).toContain('Welcome to LCA Wiki')
    expect(message.text).toContain('Welcome to LCA Wiki.')
  })

  it('states the one hour expiry in both bodies', () => {
    expect(message.text).toContain('The link expires in 1 hour.')
    expect(message.html).toContain('expires in 1 hour')
  })

  it('tells an unexpecting recipient to ignore the mail', () => {
    expect(message.text).toContain("If you weren't expecting this email")
    expect(message.html).toContain("If you weren't expecting this email")
  })

  it('emits plain text with no html tags', () => {
    expect(message.text).not.toMatch(/<[a-z]/i)
  })
})

describe('both templates', () => {
  it('produce distinct subjects and a full EmailMessage shape', () => {
    const reset = passwordResetEmail({ to: 'a@example.com', resetUrl: RESET_URL })
    const setup = setInitialPasswordEmail({ to: 'a@example.com', setPasswordUrl: SET_URL })
    expect(reset.subject).not.toBe(setup.subject)
    for (const message of [reset, setup]) {
      expect(Object.keys(message).sort()).toEqual(['html', 'subject', 'text', 'to'])
      for (const value of Object.values(message)) {
        expect(typeof value).toBe('string')
        expect(value.length).toBeGreaterThan(0)
      }
    }
  })
})
