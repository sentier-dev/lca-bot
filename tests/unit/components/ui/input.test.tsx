import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRef } from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Input } from '@/components/ui/input'

afterEach(cleanup)

describe('Input', () => {
  it('renders an input carrying the base classes', () => {
    render(<Input placeholder="you@example.org" />)
    const input = screen.getByPlaceholderText('you@example.org')
    expect(input.tagName).toBe('INPUT')
    expect(input).toHaveClass('w-full', 'rounded-md', 'border-outline', 'transition-colors')
  })

  it('appends a custom className after the base classes', () => {
    render(<Input placeholder="custom" className="mt-4 border-error" />)
    const input = screen.getByPlaceholderText('custom')
    expect(input.className).toContain('mt-4 border-error')
    expect(input.className.trim().endsWith('mt-4 border-error')).toBe(true)
  })

  it('forwards the ref to the DOM node', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Input ref={ref} placeholder="ref" />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
    expect(ref.current?.placeholder).toBe('ref')
  })

  it('passes arbitrary input attributes through', () => {
    render(<Input type="password" name="password" required disabled defaultValue="secret" aria-label="Password" />)
    const input = screen.getByLabelText('Password') as HTMLInputElement
    expect(input.type).toBe('password')
    expect(input.name).toBe('password')
    expect(input.required).toBe(true)
    expect(input.disabled).toBe(true)
    expect(input.value).toBe('secret')
  })

  it('fires onChange with the typed value', () => {
    const onChange = vi.fn()
    render(<Input aria-label="Email" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.ch' } })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect((onChange.mock.calls[0][0].target as HTMLInputElement).value).toBe('a@b.ch')
  })

  it('has a stable displayName', () => {
    expect(Input.displayName).toBe('Input')
  })
})
