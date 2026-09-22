import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { DevPerfMeasureGuard } from '@/components/layout/dev-perf-measure-guard'

afterEach(cleanup)

describe('DevPerfMeasureGuard', () => {
  it('swallows performance.measure errors while mounted and restores on unmount', () => {
    // Simulates the framework instrumentation bug (vercel/next.js#86060):
    // measure throwing on a negative timestamp.
    const throwing = vi.fn(() => {
      throw new TypeError("'AppLayout' cannot have a negative time stamp.")
    })
    const original = window.performance.measure
    window.performance.measure = throwing as unknown as Performance['measure']

    const { unmount } = render(<DevPerfMeasureGuard />)
    expect(() => window.performance.measure('AppLayout')).not.toThrow()
    expect(throwing).toHaveBeenCalled()

    unmount()
    expect(() => window.performance.measure('AppLayout')).toThrow()

    window.performance.measure = original
  })
})
