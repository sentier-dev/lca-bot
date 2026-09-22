import { describe, it, expect, afterEach } from 'vitest'
import type { ComponentType } from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { MARKDOWN_WRAPPER_CLASS, markdownComponents } from '@/components/ui/markdown-components'

afterEach(cleanup)

// react-markdown types every override as a loose element type; rendering them
// directly is the only way to reach branches the parser never produces (a
// non-checkbox <input>, for instance).
const components = markdownComponents as unknown as Record<string, ComponentType<Record<string, unknown>>>

describe('markdownComponents', () => {
  it('exposes a wrapper class that keeps display math scrollable', () => {
    expect(MARKDOWN_WRAPPER_CLASS).toContain('break-words')
    expect(MARKDOWN_WRAPPER_CLASS).toContain('[overflow-wrap:anywhere]')
  })

  it('renders an inline code element when there is no language class', () => {
    const Code = components.code
    const { container } = render(<Code>inline</Code>)
    const el = container.querySelector('code') as HTMLElement
    expect(el.className).toContain('px-1.5')
    expect(el.className).not.toContain('block')
  })

  it('renders a block code element for a language- class', () => {
    const Code = components.code
    const { container } = render(<Code className="language-python">print(1)</Code>)
    const el = container.querySelector('code') as HTMLElement
    expect(el.className).toContain('block')
    expect(el.className).toContain('whitespace-pre-wrap')
  })

  it('renders a read-only checked checkbox for task-list items', () => {
    const Input = components.input
    render(<Input type="checkbox" checked />)
    const box = screen.getByRole('checkbox') as HTMLInputElement
    expect(box.checked).toBe(true)
    expect(box.readOnly).toBe(true)
  })

  it('renders an unchecked checkbox when `checked` is missing', () => {
    const Input = components.input
    render(<Input type="checkbox" />)
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false)
  })

  it('drops any input that is not a checkbox', () => {
    const Input = components.input
    const { container } = render(<Input type="text" />)
    expect(container.querySelector('input')).toBeNull()
  })

  it('passes alignment styles through to th and td', () => {
    const Th = components.th
    const Td = components.td
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <Th style={{ textAlign: 'right' }}>Header</Th>
            <Td style={{ textAlign: 'center' }}>Cell</Td>
          </tr>
        </tbody>
      </table>,
    )
    expect((container.querySelector('th') as HTMLElement).style.textAlign).toBe('right')
    expect((container.querySelector('td') as HTMLElement).style.textAlign).toBe('center')
  })

  it('renders the remaining block and inline overrides', () => {
    const names = ['h1', 'h2', 'h3', 'h4', 'p', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'pre', 'del']
    for (const name of names) {
      const C = components[name]
      const { container, unmount } = render(<C>{name}</C>)
      expect(container.textContent).toBe(name)
      expect(container.firstElementChild?.tagName.toLowerCase()).toBe(name)
      unmount()
    }
  })

  it('renders the table wrapper chain', () => {
    const Table = components.table
    const Thead = components.thead
    const Tbody = components.tbody
    const Tr = components.tr
    const { container } = render(
      <Table>
        <Thead>
          <Tr>
            <th>H</th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <td>C</td>
          </Tr>
        </Tbody>
      </Table>,
    )
    expect(container.querySelector('div')?.className).toContain('overflow-x-auto')
    expect(container.querySelector('table')).not.toBeNull()
    expect(container.querySelectorAll('tr')).toHaveLength(2)
  })

  it('renders a horizontal rule and an external link', () => {
    const Hr = components.hr
    const A = components.a
    const { container } = render(<Hr />)
    expect(container.querySelector('hr')?.className).toContain('my-6')

    render(<A href="https://example.org">example</A>)
    const link = screen.getByRole('link', { name: 'example' })
    expect(link).toHaveAttribute('href', 'https://example.org')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
