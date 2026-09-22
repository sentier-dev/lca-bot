import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, fireEvent, cleanup } from '@testing-library/react'
import { renderWithIntl } from '../../../helpers/render-with-intl'

vi.mock('next/navigation', () => ({
  usePathname: () => '/archive',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

import { Sidebar } from '@/components/layout/sidebar'

// The suite runs without vitest globals, so RTL's auto-cleanup is not wired up.
afterEach(cleanup)

describe('Sidebar', () => {
  it('shows the three nav items, the brand and a logout button', () => {
    renderWithIntl(<Sidebar open onToggle={() => {}} />)
    expect(screen.getByRole('link', { name: 'New chat' })).toHaveAttribute('href', '/chat')
    expect(screen.getByRole('link', { name: 'Archive' })).toHaveAttribute('href', '/archive')
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings')
    expect(screen.getByText('LCA Wiki')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
    expect(screen.queryByText(/course|library|drafts/i)).toBeNull()
  })

  it('marks the current route active', () => {
    renderWithIntl(<Sidebar open onToggle={() => {}} />)
    expect(screen.getByRole('link', { name: 'Archive' }).className).toContain('bg-primary/10')
    expect(screen.getByRole('link', { name: 'Settings' }).className).not.toContain('bg-primary/10')
  })

  it('calls the logout API and navigates to /login', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const location = { href: '', assign: vi.fn() }
    Object.defineProperty(window, 'location', { value: location, writable: true })
    renderWithIntl(<Sidebar open onToggle={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' }))
    await vi.waitFor(() => expect(location.href).toBe('/login'))
    vi.unstubAllGlobals()
  })

  it('still navigates to /login when the logout request fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'))
    vi.stubGlobal('fetch', fetchMock)
    const location = { href: '', assign: vi.fn() }
    Object.defineProperty(window, 'location', { value: location, writable: true })
    renderWithIntl(<Sidebar open onToggle={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))
    await vi.waitFor(() => expect(location.href).toBe('/login'))
    vi.unstubAllGlobals()
  })
})
