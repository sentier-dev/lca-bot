import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { Markdown } from '@/components/ui/markdown'
import { MARKDOWN_WRAPPER_CLASS } from '@/components/ui/markdown-components'

afterEach(cleanup)

describe('Markdown', () => {
  it('renders the markdown inside the shared wrapper class', async () => {
    const { container } = render(<Markdown content={'# Hello\n\nSome **bold** text.'} />)

    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument())

    const wrapper = container.firstElementChild as HTMLElement
    for (const cls of MARKDOWN_WRAPPER_CLASS.split(' ')) {
      expect(wrapper.className).toContain(cls)
    }
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hello')
    expect(screen.getByText('bold').tagName).toBe('STRONG')
  })

  it('appends an extra className to the wrapper', async () => {
    const { container } = render(<Markdown content="plain" className="text-sm" />)
    await waitFor(() => expect(screen.getByText('plain')).toBeInTheDocument())
    expect((container.firstElementChild as HTMLElement).className).toContain('text-sm')
  })

  it('renders GFM tables and task lists through remark-gfm', async () => {
    const content = [
      '| Flow | Unit |',
      '| --- | ---: |',
      '| Steel | kg |',
      '',
      '- [x] done item',
      '- [ ] open item',
      '',
      '~~struck~~',
    ].join('\n')

    render(<Markdown content={content} />)

    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument())
    expect(screen.getByRole('columnheader', { name: 'Flow' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Steel' })).toBeInTheDocument()
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
    expect(checkboxes).toHaveLength(2)
    expect(checkboxes[0].checked).toBe(true)
    expect(checkboxes[1].checked).toBe(false)
    expect(screen.getByText('struck').tagName).toBe('DEL')
  })

  it('renders headings, lists, quotes, code, links and rules with the custom components', async () => {
    const content = [
      '## Heading two',
      '### Heading three',
      '#### Heading four',
      '',
      '> quoted line',
      '',
      '1. first',
      '2. second',
      '',
      '- bullet',
      '',
      'Inline `code` and *emphasis*.',
      '',
      '```ts',
      'const x = 1',
      '```',
      '',
      '---',
      '',
      '[wiki](https://github.com/sentier-dev/lca-wiki)',
    ].join('\n')

    const { container } = render(<Markdown content={content} />)

    await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument())

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Heading two')
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Heading three')
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Heading four')
    expect(container.querySelector('blockquote')).toHaveTextContent('quoted line')
    expect(container.querySelectorAll('ol li')).toHaveLength(2)
    expect(container.querySelectorAll('ul li')).toHaveLength(1)
    expect(screen.getByText('code').tagName).toBe('CODE')
    expect(screen.getByText('emphasis').tagName).toBe('EM')
    expect(container.querySelector('pre')).not.toBeNull()
    expect(container.querySelector('pre code')?.className).toContain('block')
    expect(container.querySelector('hr')).not.toBeNull()

    const link = screen.getByRole('link', { name: 'wiki' })
    expect(link).toHaveAttribute('href', 'https://github.com/sentier-dev/lca-wiki')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
