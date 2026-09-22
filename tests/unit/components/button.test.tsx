import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { createRef } from 'react'
import { Button } from '@/components/ui/button'

afterEach(cleanup)

describe('Button', () => {
  it('renders children', () => {
    const { getByRole } = render(<Button>Click me</Button>)
    expect(getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('applies ink-gradient class for default/ink variant', () => {
    const { getByRole } = render(<Button>Test</Button>)
    expect(getByRole('button').className).toContain('ink-gradient')
  })

  it('applies secondary classes for secondary variant', () => {
    const { getByRole } = render(<Button variant="secondary">Test</Button>)
    const btn = getByRole('button')
    expect(btn.className).toContain('bg-surface-container-highest')
    expect(btn.className).toContain('text-on-surface')
  })

  it('applies ghost classes for ghost variant', () => {
    const { getByRole } = render(<Button variant="ghost">Test</Button>)
    const btn = getByRole('button')
    expect(btn.className).toContain('bg-transparent')
    expect(btn.className).toContain('text-primary')
  })

  it('applies sm size classes', () => {
    const { getByRole } = render(<Button size="sm">Test</Button>)
    const btn = getByRole('button')
    expect(btn.className).toContain('px-4')
    expect(btn.className).toContain('py-2')
    expect(btn.className).toContain('text-sm')
  })

  it('applies md size classes by default', () => {
    const { getByRole } = render(<Button>Test</Button>)
    const btn = getByRole('button')
    expect(btn.className).toContain('py-3')
    expect(btn.className).toContain('px-6')
    expect(btn.className).toContain('rounded-xl')
  })

  it('applies lg size classes', () => {
    const { getByRole } = render(<Button size="lg">Test</Button>)
    const btn = getByRole('button')
    expect(btn.className).toContain('py-4')
    expect(btn.className).toContain('px-8')
    expect(btn.className).toContain('text-lg')
  })

  it('forwards ref', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Test</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('handles disabled state', () => {
    const { getByRole } = render(<Button disabled>Test</Button>)
    const btn = getByRole('button')
    expect(btn).toBeDisabled()
    expect(btn.className).toContain('disabled:opacity-50')
    expect(btn.className).toContain('disabled:pointer-events-none')
  })

  it('passes additional HTML attributes through', () => {
    const onClick = vi.fn()
    const { getByTestId } = render(<Button data-testid="my-btn" onClick={onClick}>Test</Button>)
    const btn = getByTestId('my-btn')
    btn.click()
    expect(onClick).toHaveBeenCalledOnce()
  })
})
