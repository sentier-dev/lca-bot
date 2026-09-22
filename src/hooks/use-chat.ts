'use client'

import { useCallback, useRef, useState } from 'react'
import type { ChatEvent } from '@/lib/chat/events'
import type { ChatMessage } from '@/types/chat'
import { fetchWithRefresh } from '@/lib/auth/refresh-client'
import { isSafeInternalPath } from '@/lib/auth/safe-internal-path'

export type ChatStatus = 'idle' | 'streaming' | 'error'
export type ChatErrorCode = 'turn_failed' | 'wiki_unavailable' | 'network' | 'conversation_full' | 'unauthorized'

interface UseChatOptions {
  conversationId: string | null
  initialMessages: ChatMessage[]
  initialWikiCommit?: string | null
  onConversationCreated?: (id: string, title: string | null) => void
  onTitle?: (title: string) => void
}

const STEP_LABELS: Record<string, (input: Record<string, unknown>) => string> = {
  search_wiki: (i) => `Searching the wiki for "${String(i.query ?? '')}"`,
  read_page: (i) => `Reading ${String(i.path ?? 'a page')}`,
  lookup_term: (i) => `Looking up "${String(i.term ?? '')}"`,
  lookup_source: (i) => `Resolving source ${String(i.id ?? '')}`,
  report_gap: () => 'Recording a gap in the wiki',
}

function statusToCode(status: number): ChatErrorCode {
  if (status === 503) return 'wiki_unavailable'
  if (status === 409) return 'conversation_full'
  if (status === 401) return 'unauthorized'
  return 'turn_failed'
}

/** Parses complete SSE frames out of a growing buffer; returns the leftover. */
export function drainFrames(buffer: string, onEvent: (e: ChatEvent) => void): string {
  let rest = buffer
  let idx: number
  while ((idx = rest.indexOf('\n\n')) !== -1) {
    const frame = rest.slice(0, idx)
    rest = rest.slice(idx + 2)
    const dataLine = frame.split('\n').find((l) => l.startsWith('data: '))
    if (!dataLine) continue
    try {
      onEvent(JSON.parse(dataLine.slice(6)) as ChatEvent)
    } catch {
      // ignore a malformed frame; the stream continues
    }
  }
  return rest
}

export function useChat(options: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>(options.initialMessages)
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [errorCode, setErrorCode] = useState<ChatErrorCode | null>(null)
  const [currentStep, setCurrentStep] = useState<string | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [wikiCommit, setWikiCommit] = useState<string | null>(options.initialWikiCommit ?? null)
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null)
  const conversationIdRef = useRef<string | null>(options.conversationId)
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(async (content: string) => {
    const text = content.trim()
    if (!text || status === 'streaming') return
    setStatus('streaming')
    setErrorCode(null)
    setCurrentStep(null)
    setStreamingText('')
    setLastFailedMessage(null)
    const userMessage: ChatMessage = { id: `local-${Date.now()}`, role: 'user', content: text, createdAt: new Date().toISOString() }
    setMessages((prev) => [...prev, userMessage])

    const controller = new AbortController()
    abortRef.current = controller
    let assembled = ''
    try {
      const res = await fetchWithRefresh('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: conversationIdRef.current, message: text }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) {
        // fetchWithRefresh already tried a silent refresh once; a 401 here
        // means the refresh cookie is gone or invalid too, so send the user
        // to sign in instead of showing an error they can't retry past.
        if (res.status === 401 && typeof window !== 'undefined') {
          const pathname = window.location.pathname
          window.location.href = isSafeInternalPath(pathname)
            ? `/login?redirectedFrom=${encodeURIComponent(pathname)}`
            : '/login'
          return
        }
        setErrorCode(statusToCode(res.status))
        setLastFailedMessage(text)
        setStatus('error')
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      // `finished` means a done frame arrived; `failed` means the turn ended
      // badly, either on an error frame or on a stream that stopped early.
      let finished = false
      let failed = false
      const handle = (event: ChatEvent) => {
        switch (event.type) {
          case 'text_delta':
            assembled += event.text
            setStreamingText(assembled)
            setCurrentStep(null)
            break
          case 'tool_start':
            setCurrentStep((STEP_LABELS[event.name] ?? (() => `Calling ${event.name}`))(event.input))
            break
          case 'tool_end':
            break
          case 'done': {
            finished = true
            const assistant: ChatMessage = {
              id: event.messageId, role: 'assistant', content: assembled, createdAt: new Date().toISOString(),
              citations: event.citations, toolTrace: event.toolTrace, reportedGap: event.reportedGap,
            }
            setMessages((prev) => [...prev, assistant])
            setWikiCommit(event.wikiCommit)
            if (!conversationIdRef.current) {
              conversationIdRef.current = event.conversationId
              options.onConversationCreated?.(event.conversationId, event.title)
            } else if (event.title) {
              options.onTitle?.(event.title)
            }
            break
          }
          case 'error':
            failed = true
            break
        }
      }
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer = drainFrames(buffer + decoder.decode(value, { stream: true }), handle)
      }
      drainFrames(buffer + '\n\n', handle)
      if (!finished) failed = true
      if (failed) {
        setErrorCode('turn_failed')
        setLastFailedMessage(text)
      }
      setStatus(failed ? 'error' : 'idle')
    } catch {
      setErrorCode('network')
      setLastFailedMessage(text)
      setStatus('error')
    } finally {
      setCurrentStep(null)
      setStreamingText('')
      abortRef.current = null
    }
  }, [options, status])

  const retry = useCallback(async () => {
    const failed = lastFailedMessage
    if (!failed) return
    // Drop the local copy of the failed user message before resending.
    setMessages((prev) => (prev.length && prev[prev.length - 1].role === 'user' && prev[prev.length - 1].content === failed ? prev.slice(0, -1) : prev))
    await send(failed)
  }, [lastFailedMessage, send])

  const stop = useCallback(() => abortRef.current?.abort(), [])

  return { messages, status, errorCode, currentStep, streamingText, wikiCommit, lastFailedMessage, conversationId: conversationIdRef.current, send, retry, stop }
}
