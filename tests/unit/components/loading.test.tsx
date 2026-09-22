import { describe, it, expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { renderWithIntl } from '../../helpers/render-with-intl'
import { LoadingDots, LoadingSkeleton } from '@/components/ui/loading'

afterEach(cleanup)

describe('LoadingDots', () => {
  it('renders 3 dot elements', () => {
    const { getByLabelText } = renderWithIntl(<LoadingDots />)
    const container = getByLabelText('Loading')
    const dots = container.querySelectorAll('span')
    expect(dots).toHaveLength(3)
  })

  it('has aria-label "Loading"', () => {
    const { getByLabelText } = renderWithIntl(<LoadingDots />)
    expect(getByLabelText('Loading')).toBeInTheDocument()
  })
})

describe('LoadingSkeleton', () => {
  it('renders correct number of lines', () => {
    const { getByLabelText } = renderWithIntl(<LoadingSkeleton lines={5} />)
    const container = getByLabelText('Loading content')
    const lines = container.querySelectorAll('div')
    expect(lines).toHaveLength(5)
  })

  it('defaults to 3 lines', () => {
    const { getByLabelText } = renderWithIntl(<LoadingSkeleton />)
    const container = getByLabelText('Loading content')
    const lines = container.querySelectorAll('div')
    expect(lines).toHaveLength(3)
  })

  it('last line has w-3/4 class', () => {
    const { getByLabelText } = renderWithIntl(<LoadingSkeleton />)
    const container = getByLabelText('Loading content')
    const lines = container.querySelectorAll('div')
    const lastLine = lines[lines.length - 1]
    expect(lastLine.className).toContain('w-3/4')
  })
})
