import { describe, it, expect, afterEach } from 'vitest'
import type { ReactNode } from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import { ClientDate } from '@/components/ui/client-date'

afterEach(cleanup)

const ISO = '2024-03-05T12:00:00.000Z'

// ClientDate reads the formatter, not the message catalog, so this pins the
// timezone instead of using the shared intl helper. Without a fixed zone the
// formatted day depends on the machine running the suite.
function Wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" timeZone="UTC" messages={{}}>
      {children}
    </NextIntlClientProvider>
  )
}

describe('ClientDate', () => {
  it('renders an empty time element before mount (server pass)', () => {
    const html = renderToStaticMarkup(
      <Wrapper>
        <ClientDate iso={ISO} />
      </Wrapper>,
    )
    expect(html).toContain(ISO)
    // Empty element: no formatted label until useMounted flips to true.
    expect(html).toContain('></time>')
    expect(html).not.toMatch(/Mar/)
  })

  it('formats the date once mounted, defaulting to month + day', () => {
    render(
      <Wrapper>
        <ClientDate iso={ISO} />
      </Wrapper>,
    )
    const el = screen.getByText('Mar 5')
    expect(el.tagName).toBe('TIME')
    expect(el).toHaveAttribute('datetime', ISO)
  })

  it('honours custom format options', () => {
    render(
      <Wrapper>
        <ClientDate iso={ISO} formatOptions={{ year: 'numeric', month: 'long', day: 'numeric' }} />
      </Wrapper>,
    )
    expect(screen.getByText('March 5, 2024')).toBeInTheDocument()
  })

  it('applies the className to the time element', () => {
    render(
      <Wrapper>
        <ClientDate iso={ISO} className="text-xs text-outline" />
      </Wrapper>,
    )
    expect(screen.getByText('Mar 5')).toHaveClass('text-xs', 'text-outline')
  })

  it('renders nothing for an unparseable iso string but keeps the attribute', () => {
    const { container } = render(
      <Wrapper>
        <ClientDate iso="not-a-date" />
      </Wrapper>,
    )
    const time = container.querySelector('time')
    expect(time).not.toBeNull()
    expect(time?.textContent).toBe('')
    expect(time).toHaveAttribute('datetime', 'not-a-date')
  })
})
