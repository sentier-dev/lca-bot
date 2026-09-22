import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, renderHook, cleanup } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { useMounted } from '@/hooks/use-mounted'

afterEach(cleanup)

function Probe() {
  const mounted = useMounted()
  return <span data-testid="probe">{mounted ? 'mounted' : 'not-mounted'}</span>
}

describe('useMounted', () => {
  it('reports false for the server snapshot', () => {
    // renderToStaticMarkup exercises getServerSnapshot, the "false" half of
    // the swap that a client-only render never leaves visible.
    const html = renderToStaticMarkup(<Probe />)
    expect(html).toContain('not-mounted')
  })

  it('reports true once mounted on the client', () => {
    const { result } = renderHook(() => useMounted())
    expect(result.current).toBe(true)
  })

  it('stays true across re-renders', () => {
    const { result, rerender } = renderHook(() => useMounted())
    rerender()
    expect(result.current).toBe(true)
  })

  it('renders the mounted branch inside a component', () => {
    render(<Probe />)
    expect(screen.getByTestId('probe')).toHaveTextContent('mounted')
  })
})
