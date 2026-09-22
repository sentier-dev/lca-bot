'use client'

import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-fetch'

export const PAGE_SIZE = 30
export const CONVERSATIONS_KEY = ['conversations'] as const

export interface ConversationListItem {
  id: string
  title: string | null
  preview: string | null
  messageCount: number
  updatedAt: string
  createdAt: string
}

interface Page {
  items: ConversationListItem[]
  total: number
  limit: number
  offset: number
}

async function fetchPage(offset: number): Promise<Page> {
  const res = await apiFetch(`/api/conversations?limit=${PAGE_SIZE}&offset=${offset}`)
  if (!res.ok) throw new Error(`conversations ${res.status}`)
  return res.json()
}

/** The archive list: first page via TanStack Query (always fresh on mount), extra pages appended locally. */
export function useConversations() {
  const queryClient = useQueryClient()
  const first = useQuery({ queryKey: CONVERSATIONS_KEY, queryFn: () => fetchPage(0), staleTime: 0, refetchOnMount: 'always' })
  const [extra, setExtra] = useState<ConversationListItem[]>([])
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [renamed, setRenamed] = useState<Map<string, string>>(new Map())
  const [loadingMore, setLoadingMore] = useState(false)

  const base = first.data?.items ?? []
  const items = [...base, ...extra]
    .filter((c) => !removed.has(c.id))
    .map((c) => (renamed.has(c.id) ? { ...c, title: renamed.get(c.id)! } : c))
  const total = Math.max(0, (first.data?.total ?? 0) - removed.size)
  const hasMore = base.length + extra.length < (first.data?.total ?? 0)

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const page = await fetchPage(base.length + extra.length)
      setExtra((prev) => [...prev, ...page.items.filter((p) => !prev.some((e) => e.id === p.id))])
    } finally {
      setLoadingMore(false)
    }
  }, [base.length, extra.length, hasMore, loadingMore])

  const remove = useCallback(async (id: string) => {
    try {
      const res = await apiFetch(`/api/conversations/${id}`, { method: 'DELETE' })
      if (!res.ok) return false
      setRemoved((prev) => new Set(prev).add(id))
      // Mark the list stale without an immediate refetch: the currently
      // mounted query is still actively observed, and an immediate refetch
      // here would race the in-flight rename/delete calls that follow. The
      // next mount (staleTime: 0, refetchOnMount: 'always') picks up fresh data.
      void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY, refetchType: 'none' })
      return true
    } catch {
      return false
    }
  }, [queryClient])

  const rename = useCallback(async (id: string, title: string) => {
    try {
      const res = await apiFetch(`/api/conversations/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }),
      })
      if (!res.ok) return false
      const body = (await res.json()) as { conversation: { title: string | null } }
      setRenamed((prev) => new Map(prev).set(id, body.conversation.title ?? title))
      return true
    } catch {
      return false
    }
  }, [])

  return { items, total, hasMore, loading: first.isLoading, loadingMore, error: first.isError, loadMore, remove, rename, refetch: first.refetch }
}
