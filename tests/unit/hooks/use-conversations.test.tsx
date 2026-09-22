import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useConversations, PAGE_SIZE } from '@/hooks/use-conversations'

const item = (i: number) => ({ id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, title: `Chat ${i}`, preview: null, messageCount: 2, updatedAt: new Date(i * 1000).toISOString(), createdAt: new Date(i * 1000).toISOString() })

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
  return Wrapper
}

afterEach(() => vi.unstubAllGlobals())

describe('useConversations', () => {
  it('loads the first page and appends the next one', async () => {
    const page1 = Array.from({ length: PAGE_SIZE }, (_, i) => item(i))
    const page2 = [item(PAGE_SIZE)]
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: page1, total: PAGE_SIZE + 1, limit: PAGE_SIZE, offset: 0 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: page2, total: PAGE_SIZE + 1, limit: PAGE_SIZE, offset: PAGE_SIZE }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useConversations(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.items).toHaveLength(PAGE_SIZE))
    expect(result.current.total).toBe(PAGE_SIZE + 1)
    expect(result.current.hasMore).toBe(true)
    await act(async () => { await result.current.loadMore() })
    await waitFor(() => expect(result.current.items).toHaveLength(PAGE_SIZE + 1))
    expect(result.current.hasMore).toBe(false)
    expect(String(fetchMock.mock.calls[1][0])).toContain(`offset=${PAGE_SIZE}`)
  })

  it('removes a row on delete and renames in place', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [item(1), item(2)], total: 2, limit: PAGE_SIZE, offset: 0 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ deleted: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ conversation: { ...item(2), title: 'Renamed' } }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useConversations(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.items).toHaveLength(2))
    await act(async () => { expect(await result.current.remove(item(1).id)).toBe(true) })
    expect(result.current.items.map((c) => c.id)).toEqual([item(2).id])
    expect(result.current.total).toBe(1)
    await act(async () => { expect(await result.current.rename(item(2).id, 'Renamed')).toBe(true) })
    expect(result.current.items[0].title).toBe('Renamed')
  })

  it('reports a load error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 500 })))
    const { result } = renderHook(() => useConversations(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.error).toBe(true))
  })
})
