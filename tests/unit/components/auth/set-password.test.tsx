import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { renderWithIntl } from '../../../helpers/render-with-intl'

const push = vi.fn()
const refresh = vi.fn()
const params = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => params,
}))

import SetPasswordPage from '@/app/(auth)/set-password/page'

const STRONG_PASSWORD = 'Str0ng-Passw0rd!'

function fillForm(password = STRONG_PASSWORD, confirm = password) {
  fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: password } })
  fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: confirm } })
  fireEvent.click(screen.getByRole('button', { name: 'Set password and sign in' }))
}

describe('SetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    params.set('token', 'tok-123')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
  })

  afterEach(() => {
    cleanup()
    params.delete('token')
    vi.unstubAllGlobals()
  })

  it('shows the missing-token screen with a back link when there is no token', () => {
    params.delete('token')
    renderWithIntl(<SetPasswordPage />)

    expect(screen.getByText(/this link is missing a token/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login')
    expect(screen.queryByLabelText(/new password/i)).toBeNull()
  })

  it('redirects to /chat after a successful submit', async () => {
    renderWithIntl(<SetPasswordPage />)
    fillForm()

    await waitFor(() => expect(push).toHaveBeenCalledWith('/chat'))
    expect(fetch).toHaveBeenCalledWith('/api/auth/set-password', expect.objectContaining({ method: 'POST' }))
  })

  it('shows the generic error when the request rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    renderWithIntl(<SetPasswordPage />)
    fillForm()

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })
})
