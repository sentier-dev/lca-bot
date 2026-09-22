import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, fireEvent, cleanup } from '@testing-library/react'
import { useQueryClient } from '@tanstack/react-query'
import { renderWithIntl } from '../../../helpers/render-with-intl'

vi.mock('next/navigation', () => ({
  usePathname: () => '/chat',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

import { AppShell } from '@/components/layout/app-shell'

afterEach(cleanup)

function QueryClientProbe() {
  const client = useQueryClient()
  return <span data-testid="has-client">{client ? 'yes' : 'no'}</span>
}

function renderShell() {
  return renderWithIntl(
    <AppShell footer={<footer data-testid="footer">footer slot</footer>}>
      <p data-testid="page">page content</p>
    </AppShell>,
  )
}

describe('AppShell', () => {
  it('renders the brand header, the children and the footer slot', () => {
    renderShell()

    expect(screen.getByTestId('header-brand')).toHaveAttribute('href', '/chat')
    expect(screen.getByTestId('page')).toHaveTextContent('page content')
    expect(screen.getByTestId('footer')).toHaveTextContent('footer slot')
    expect(screen.getAllByText('LCA Wiki').length).toBeGreaterThan(0)
  })

  it('renders the sidebar closed on first paint', () => {
    const { container } = renderShell()

    const aside = container.querySelector('aside') as HTMLElement
    expect(aside.className).toContain('-translate-x-full')
    expect(aside).toHaveAttribute('aria-hidden', 'true')
  })

  it('opens the sidebar from the header toggle and closes it again', () => {
    const { container } = renderShell()
    const toggle = screen.getByRole('button', { name: 'Toggle sidebar' })

    fireEvent.click(toggle)
    const aside = container.querySelector('aside') as HTMLElement
    expect(aside.className).toContain('translate-x-0')
    expect(aside).toHaveAttribute('aria-hidden', 'false')

    fireEvent.click(toggle)
    expect((container.querySelector('aside') as HTMLElement).className).toContain('-translate-x-full')
  })

  it('closes the sidebar from the sidebar close button', () => {
    const { container } = renderShell()

    fireEvent.click(screen.getByRole('button', { name: 'Toggle sidebar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close sidebar' }))

    expect((container.querySelector('aside') as HTMLElement).className).toContain('-translate-x-full')
  })

  it('provides a react-query client to its subtree', () => {
    // A useQueryClient consumer throws during render when no provider is
    // above it, so reading the client proves QueryProvider wraps the shell.
    renderWithIntl(
      <AppShell footer={null}>
        <QueryClientProbe />
      </AppShell>,
    )
    expect(screen.getByTestId('has-client')).toHaveTextContent('yes')
  })
})

describe('AppShell header brand', () => {
  it('links the logo and name to a new chat', async () => {
    const { screen } = await import('@testing-library/react')
    const { renderWithIntl } = await import('../../../helpers/render-with-intl')
    const { AppShell } = await import('@/components/layout/app-shell')
    renderWithIntl(<AppShell footer={null}><div /></AppShell>)
    expect(screen.getByTestId('header-brand')).toHaveAttribute('href', '/chat')
  })
})
