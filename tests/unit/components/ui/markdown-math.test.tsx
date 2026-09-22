import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { Markdown } from '@/components/ui/markdown'

afterEach(cleanup)

describe('Markdown math rendering', () => {
  it('renders inline LaTeX math as KaTeX markup', async () => {
    const { container } = render(<Markdown content="Solve $Ax=B$ for x." />)

    await waitFor(() => expect(container.querySelector('.katex')).not.toBeNull())

    expect(container.textContent).not.toContain('$Ax=B$')
    // The whole span/mrow structure lives inside a single inline .katex node.
    expect(container.querySelectorAll('.katex')).toHaveLength(1)
  })

  it('renders display LaTeX math (double dollar block) as KaTeX display markup', async () => {
    const content = ['Balance equation:', '', '$$', 'A x = B', '$$'].join('\n')
    const { container } = render(<Markdown content={content} />)

    await waitFor(() => expect(container.querySelector('.katex-display')).not.toBeNull())

    expect(container.textContent).not.toContain('$$')
  })

  it('keeps currency mentions as literal text instead of rendering them as math', async () => {
    render(<Markdown content="Steel costs $5 and $10 per kg." />)

    await waitFor(() => expect(screen.getByText(/Steel costs/)).toBeInTheDocument())

    expect(screen.getByText('Steel costs $5 and $10 per kg.')).toBeInTheDocument()
  })

  it('still strips a script tag when the message also contains math', async () => {
    const content = 'Solve $x$ for the flow.\n\n<script>alert(1)</script>'
    const { container } = render(<Markdown content={content} />)

    await waitFor(() => expect(container.querySelector('.katex')).not.toBeNull())

    expect(container.querySelector('script')).toBeNull()
    expect(container.innerHTML).not.toContain('alert(1)')
  })
})
