import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { renderWithIntl } from '../../../helpers/render-with-intl'
import { DangerZoneSection } from '@/components/settings/danger-zone-section'

afterEach(cleanup)

const { mockApiFetch } = vi.hoisted(() => ({
  mockApiFetch: vi.fn(),
}))

vi.mock('@/lib/api-fetch', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}))

describe('DangerZoneSection', () => {
  beforeEach(() => {
    mockApiFetch.mockReset()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '' } as Location,
    })
  })

  it('renders the Delete Account button', () => {
    renderWithIntl(<DangerZoneSection />)
    expect(screen.getByRole('button', { name: /delete account/i })).toBeInTheDocument()
  })

  it('does not show the typed-confirmation dialog initially', () => {
    renderWithIntl(<DangerZoneSection />)
    expect(screen.queryByPlaceholderText(/delete my account/i)).not.toBeInTheDocument()
  })

  it('opens the typed-confirmation dialog when the button is clicked', () => {
    renderWithIntl(<DangerZoneSection />)
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }))
    expect(screen.getByPlaceholderText(/delete my account/i)).toBeInTheDocument()
  })

  it('keeps the confirm button disabled until the exact phrase is typed', () => {
    renderWithIntl(<DangerZoneSection />)
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }))

    const input = screen.getByPlaceholderText(/delete my account/i)
    fireEvent.change(input, { target: { value: 'delete' } })

    // The dialog's confirm button is labelled "Delete" per our component
    // (a separate button from the outer "Delete Account" card button).
    const dialogConfirm = screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement
    expect(dialogConfirm.disabled).toBe(true)

    fireEvent.change(input, { target: { value: 'delete my account' } })
    expect(dialogConfirm.disabled).toBe(false)
  })

  it('calls the delete-account API on confirmation and navigates to /login', async () => {
    mockApiFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })

    renderWithIntl(<DangerZoneSection />)
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }))

    const input = screen.getByPlaceholderText(/delete my account/i)
    fireEvent.change(input, { target: { value: 'delete my account' } })

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/api/settings/delete-account', expect.objectContaining({
        method: 'POST',
      }))
    })
    await waitFor(() => {
      expect(window.location.href).toBe('/login')
    })
  })

  it('shows the server error message when the delete request fails', async () => {
    mockApiFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Account is locked.' }) })

    renderWithIntl(<DangerZoneSection />)
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }))
    fireEvent.change(screen.getByPlaceholderText(/delete my account/i), {
      target: { value: 'delete my account' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Account is locked.')).toBeInTheDocument()
    expect(window.location.href).toBe('')
  })

  it('falls back to the generic failure copy when the body carries no error', async () => {
    mockApiFetch.mockResolvedValue({ ok: false, json: async () => ({}) })

    renderWithIntl(<DangerZoneSection />)
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }))
    fireEvent.change(screen.getByPlaceholderText(/delete my account/i), {
      target: { value: 'delete my account' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Failed to delete account.')).toBeInTheDocument()
  })

  it('shows the network error copy when the request throws', async () => {
    mockApiFetch.mockRejectedValue(new Error('offline'))

    renderWithIntl(<DangerZoneSection />)
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }))
    fireEvent.change(screen.getByPlaceholderText(/delete my account/i), {
      target: { value: 'delete my account' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Network error. Try again.')).toBeInTheDocument()
    expect(window.location.href).toBe('')
  })

  it('swaps the confirm label to the pending copy while the request is in flight', async () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}))

    renderWithIntl(<DangerZoneSection />)
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }))
    fireEvent.change(screen.getByPlaceholderText(/delete my account/i), {
      target: { value: 'delete my account' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('button', { name: 'Deleting…' })).toBeInTheDocument()
  })

  it('closes the dialog on cancel without calling the API', async () => {
    renderWithIntl(<DangerZoneSection />)
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/delete my account/i)).not.toBeInTheDocument()
    })
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('renders the delete-account explanation', () => {
    renderWithIntl(<DangerZoneSection />)
    expect(screen.getByText(/permanently deletes your account/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Delete account' })).toBeInTheDocument()
  })
})
