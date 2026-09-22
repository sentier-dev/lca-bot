import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, cleanup } from '@testing-library/react'
import { renderWithIntl } from '../../../helpers/render-with-intl'
import { GoogleAuthSection } from '@/components/auth/google-auth-section'

afterEach(cleanup)

beforeEach(() => {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { href: '' } as Location,
  })
})

describe('GoogleAuthSection', () => {
  it('renders the Google button, its icon and the "or" divider', () => {
    const { container } = renderWithIntl(<GoogleAuthSection />)

    const button = screen.getByRole('button', { name: 'Continue with Google' })
    expect(button).toHaveAttribute('type', 'button')
    expect((button as HTMLButtonElement).disabled).toBe(false)
    expect(container.querySelector('svg')).not.toBeNull()
    expect(screen.getByText('or')).toBeInTheDocument()
  })

  it('redirects to the plain OAuth start route when there is no next path', () => {
    renderWithIntl(<GoogleAuthSection />)

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))

    expect(window.location.href).toBe('/api/auth/google')
  })

  it('carries an explicit next path through as an encoded query param', () => {
    renderWithIntl(<GoogleAuthSection next="/chat/abc?tab=sources" />)

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))

    expect(window.location.href).toBe(`/api/auth/google?next=${encodeURIComponent('/chat/abc?tab=sources')}`)
  })

  it('treats an explicit null next like no next at all', () => {
    renderWithIntl(<GoogleAuthSection next={null} />)

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))

    expect(window.location.href).toBe('/api/auth/google')
  })

  it('calls onStart just before redirecting', () => {
    const onStart = vi.fn()
    renderWithIntl(<GoogleAuthSection onStart={onStart} next="/settings" />)

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))

    expect(onStart).toHaveBeenCalledTimes(1)
    expect(window.location.href).toBe('/api/auth/google?next=%2Fsettings')
  })

  it('renders disabled without an onStart handler and does not navigate', () => {
    renderWithIntl(<GoogleAuthSection disabled />)

    const button = screen.getByRole('button', { name: 'Continue with Google' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(window.location.href).toBe('')
  })
})
