import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, cleanup } from '@testing-library/react'
import { useBfcacheReset } from '@/hooks/use-bfcache-reset'

afterEach(() => {
  cleanup()
})

function firePageshow(persisted: boolean) {
  const event = new Event('pageshow')
  Object.defineProperty(event, 'persisted', { value: persisted })
  window.dispatchEvent(event)
}

describe('useBfcacheReset', () => {
  it('runs the reset callback when the page is restored from bfcache', () => {
    const reset = vi.fn()
    renderHook(() => useBfcacheReset(reset))

    firePageshow(true)
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('does not run on a normal page load (persisted=false)', () => {
    const reset = vi.fn()
    renderHook(() => useBfcacheReset(reset))

    firePageshow(false)
    expect(reset).not.toHaveBeenCalled()
  })

  it('removes the listener on unmount', () => {
    const reset = vi.fn()
    const { unmount } = renderHook(() => useBfcacheReset(reset))
    unmount()

    firePageshow(true)
    expect(reset).not.toHaveBeenCalled()
  })
})
