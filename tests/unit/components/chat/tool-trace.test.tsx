import { describe, it, expect, afterEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { renderWithIntl } from '../../../helpers/render-with-intl'
import { ToolTrace } from '@/components/chat/tool-trace'

afterEach(cleanup)

describe('ToolTrace', () => {
  it('counts the steps in the summary and labels every call', () => {
    renderWithIntl(<ToolTrace trace={[
      { name: 'search_wiki', input: { query: 'functional unit', branch: 'core' } },
      { name: 'read_page', input: { path: 'core/README.md', offset: 200 } },
      { name: 'lookup_term', input: { term: 'cut-off' } },
      { name: 'lookup_source', input: { id: 'ilcd-2010' } },
      { name: 'report_gap', input: {} },
      { name: 'unknown_tool', input: {} },
    ]} />)

    expect(screen.getByText('Looked at 6 steps')).toBeInTheDocument()
    expect(screen.getByText('search_wiki "functional unit" in core')).toBeInTheDocument()
    expect(screen.getByText('read_page core/README.md from 200')).toBeInTheDocument()
    expect(screen.getByText('lookup_term "cut-off"')).toBeInTheDocument()
    expect(screen.getByText('lookup_source ilcd-2010')).toBeInTheDocument()
    expect(screen.getByText('report_gap')).toBeInTheDocument()
    expect(screen.getByText('unknown_tool')).toBeInTheDocument()
  })

  it('uses the singular form for one step and omits optional inputs', () => {
    renderWithIntl(<ToolTrace trace={[{ name: 'read_page', input: { path: 'index.md' } }]} />)
    expect(screen.getByText('Looked at 1 step')).toBeInTheDocument()
    expect(screen.getByText('read_page index.md')).toBeInTheDocument()
  })

  it('renders nothing for an empty trace', () => {
    const { container } = renderWithIntl(<ToolTrace trace={[]} />)
    expect(container.querySelector('[data-testid="tool-trace"]')).toBeNull()
  })
})
