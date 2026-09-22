import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { Icon } from '@/components/ui/icon'

afterEach(cleanup)

describe('Icon', () => {
  it('renders a span with material-symbols-outlined class', () => {
    const { getByText } = render(<Icon name="home" />)
    const el = getByText('home')
    expect(el.tagName).toBe('SPAN')
    expect(el.className).toContain('material-symbols-outlined')
  })

  it('renders the icon name as text content', () => {
    const { getByText } = render(<Icon name="settings" />)
    expect(getByText('settings')).toBeInTheDocument()
  })

  it('applies text-sm class for sm size', () => {
    const { getByText } = render(<Icon name="home" size="sm" />)
    expect(getByText('home').className).toContain('text-sm')
  })

  it('applies text-xl class for md size (default)', () => {
    const { getByText } = render(<Icon name="home" />)
    expect(getByText('home').className).toContain('text-xl')
  })

  it('applies text-3xl class for lg size', () => {
    const { getByText } = render(<Icon name="home" size="lg" />)
    expect(getByText('home').className).toContain('text-3xl')
  })

  it('applies filled style when filled prop is true', () => {
    const { getByText } = render(<Icon name="home" filled />)
    const el = getByText('home')
    expect(el.style.fontVariationSettings).toBe("'FILL' 1")
  })

  it('does not apply filled style by default', () => {
    const { getByText } = render(<Icon name="home" />)
    const el = getByText('home')
    expect(el.style.fontVariationSettings).toBe('')
  })

  it('passes className through', () => {
    const { getByText } = render(<Icon name="home" className="custom-class" />)
    expect(getByText('home').className).toContain('custom-class')
  })
})
