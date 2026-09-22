import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { LinkButton } from '@/components/ui/link-button'

afterEach(cleanup)

describe('LinkButton', () => {
  it('renders a link to the given href with its children', () => {
    render(<LinkButton href="/chat">Start a chat</LinkButton>)
    const link = screen.getByRole('link', { name: 'Start a chat' })
    expect(link).toHaveAttribute('href', '/chat')
  })

  it('carries the gradient button styling', () => {
    render(<LinkButton href="/chat">Start a chat</LinkButton>)
    const link = screen.getByRole('link', { name: 'Start a chat' })
    expect(link).toHaveClass('inline-flex', 'ink-gradient', 'text-on-primary', 'rounded-lg')
  })

  it('merges a custom className with the defaults', () => {
    render(
      <LinkButton href="/archive" className="w-full">
        Archive
      </LinkButton>,
    )
    const link = screen.getByRole('link', { name: 'Archive' })
    expect(link).toHaveClass('w-full', 'ink-gradient')
  })

  it('lets a custom className win a tailwind-merge conflict', () => {
    render(
      <LinkButton href="/archive" className="px-8">
        Archive
      </LinkButton>,
    )
    const link = screen.getByRole('link', { name: 'Archive' })
    expect(link).toHaveClass('px-8')
    expect(link.className).not.toContain('px-4')
  })

  it('renders non-text children', () => {
    render(
      <LinkButton href="/chat">
        <span data-testid="icon">icon</span>
        <span>Label</span>
      </LinkButton>,
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveTextContent('iconLabel')
  })
})
