import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { renderWithIntl } from '../../../helpers/render-with-intl'
import { AccountSection } from '@/components/settings/account-section'

afterEach(cleanup)

const { mockApiFetch } = vi.hoisted(() => ({
  mockApiFetch: vi.fn(),
}))

vi.mock('@/lib/api-fetch', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}))

describe('AccountSection', () => {
  beforeEach(() => {
    mockApiFetch.mockReset()
  })

  it('renders the email in read-only form', () => {
    renderWithIntl(<AccountSection email="alice@example.com" provider="email" hasPassword={true} />)
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    expect(screen.getByText(/to change your email/i)).toBeInTheDocument()
  })

  it('renders the password form when provider is email', () => {
    renderWithIntl(<AccountSection email="alice@example.com" provider="email" hasPassword={true} />)
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm/i)).toBeInTheDocument()
  })

  it('names the sign-in method for each provider', () => {
    renderWithIntl(<AccountSection email="alice@example.com" provider="email" hasPassword={true} />)
    expect(screen.getByText('Email and password')).toBeInTheDocument()
    cleanup()
    renderWithIntl(<AccountSection email="alice@example.com" provider="google" hasPassword={false} />)
    expect(screen.getByText('Google')).toBeInTheDocument()
  })

  it('renders the OAuth-locked state for a Google account with no password', () => {
    renderWithIntl(<AccountSection email="alice@example.com" provider="google" hasPassword={false} />)
    expect(screen.getByText(/sign in with Google/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/current password/i)).not.toBeInTheDocument()
  })

  it('keeps the password form for a Google account that still has a password', () => {
    renderWithIntl(<AccountSection email="alice@example.com" provider="google" hasPassword={true} />)
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument()
  })

  it('blocks submission when new password does not meet requirements', async () => {
    renderWithIntl(<AccountSection email="alice@example.com" provider="email" hasPassword={true} />)

    fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'oldpass' } })
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'short' } })
    fireEvent.change(screen.getByLabelText(/confirm/i), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: /change password/i }))

    await waitFor(() => {
      expect(screen.getByText(/Password must be at least 10 characters/i)).toBeInTheDocument()
    })
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('blocks submission when new and confirm do not match', async () => {
    renderWithIntl(<AccountSection email="alice@example.com" provider="email" hasPassword={true} />)

    fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'oldpass' } })
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'Newpassword1!' } })
    fireEvent.change(screen.getByLabelText(/confirm/i), { target: { value: 'Differentpw1!' } })
    fireEvent.click(screen.getByRole('button', { name: /change password/i }))

    await waitFor(() => {
      expect(screen.getByText(/do not match/i)).toBeInTheDocument()
    })
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('calls the password API on valid submission', async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    })

    renderWithIntl(<AccountSection email="alice@example.com" provider="email" hasPassword={true} />)

    fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'Oldpass12!!' } })
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'Newpassword1!' } })
    fireEvent.change(screen.getByLabelText(/confirm/i), { target: { value: 'Newpassword1!' } })
    fireEvent.click(screen.getByRole('button', { name: /change password/i }))

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/api/settings/password', expect.objectContaining({
        method: 'POST',
      }))
    })
    const call = mockApiFetch.mock.calls[0]
    const body = JSON.parse((call[1] as RequestInit).body as string)
    expect(body).toEqual({ currentPassword: 'Oldpass12!!', newPassword: 'Newpassword1!' })
  })

  it('shows an error when the API returns a failure', async () => {
    mockApiFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Current password is incorrect' }),
    })

    renderWithIntl(<AccountSection email="alice@example.com" provider="email" hasPassword={true} />)

    fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'Wrong12345!' } })
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'Newpassword1!' } })
    fireEvent.change(screen.getByLabelText(/confirm/i), { target: { value: 'Newpassword1!' } })
    fireEvent.click(screen.getByRole('button', { name: /change password/i }))

    await waitFor(() => {
      expect(screen.getByText(/Current password is incorrect/i)).toBeInTheDocument()
    })
  })

  it('renders a sign-out button that posts to /api/auth/logout', async () => {
    mockApiFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })

    renderWithIntl(<AccountSection email="alice@example.com" provider="email" hasPassword={true} />)

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }))

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({
        method: 'POST',
      }))
    })
  })
})
