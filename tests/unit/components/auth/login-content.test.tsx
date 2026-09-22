import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithIntl } from '../../../helpers/render-with-intl'

const params = new URLSearchParams()
vi.mock('next/navigation', () => ({
  useSearchParams: () => params,
  useRouter: () => ({ push: vi.fn() }),
}))

import { LoginContent } from '@/app/(auth)/login/login-content'

describe('LoginContent', () => {
  afterEach(() => {
    params.delete('error')
  })

  it('renders email + password, no signup link, and the access note', () => {
    renderWithIntl(<LoginContent googleOAuthEnabled={false} contactEmail="hello@d-d-s.ch" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /sign up/i })).toBeNull()
    expect(screen.getByText(/accounts are created by Départ de Sentier/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'hello@d-d-s.ch' })).toHaveAttribute('href', 'mailto:hello@d-d-s.ch')
    expect(screen.queryByRole('button', { name: /google/i })).toBeNull()
  })

  it('shows the Google button when configured', () => {
    renderWithIntl(<LoginContent googleOAuthEnabled contactEmail="hello@d-d-s.ch" />)
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument()
  })

  it('maps a callback error code to a message', () => {
    params.set('error', 'no_account')
    renderWithIntl(<LoginContent googleOAuthEnabled contactEmail="hello@d-d-s.ch" />)
    expect(screen.getByRole('alert')).toHaveTextContent(/no LCA Wiki account/i)
  })
})
