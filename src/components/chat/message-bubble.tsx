'use client'

import { useTranslations } from 'next-intl'
import type { ChatMessage } from '@/types/chat'
import { cn } from '@/lib/cn'
import { Markdown } from '@/components/ui/markdown'
import { CitationChips } from './citation-chips'
import { ToolTrace } from './tool-trace'
import { GapNote } from './gap-note'

interface Props {
  message: ChatMessage
  wikiCommit: string | null
  /** True while this assistant message is still streaming (no metadata yet). */
  streaming?: boolean
}

export function MessageBubble({ message, wikiCommit, streaming = false }: Props) {
  const t = useTranslations('chat.bubble')
  if (message.role === 'user') {
    return (
      <div className="flex flex-col items-end gap-1 ml-auto max-w-[80%] min-w-0" data-testid="message-user">
        <span className="text-[10px] uppercase tracking-wider text-on-surface-variant/60 mr-1">{t('you')}</span>
        <div className="bg-inverse-surface text-inverse-on-surface px-4 py-3 rounded-lg rounded-tr-none shadow-sm max-w-full min-w-0">
          <p className="font-body text-base leading-relaxed break-words whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-3 max-w-[92%] min-w-0" data-testid="message-assistant">
      <div className="w-8 h-8 rounded bg-surface-container-lowest flex items-center justify-center shrink-0 mt-1 border border-outline-variant/60 overflow-hidden">
        <img src="/dds-logo-green.svg" alt="" aria-hidden="true" className="w-6 h-auto" />
      </div>
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <span className="text-[10px] uppercase tracking-wider text-on-surface-variant/60 ml-1">{t('assistant')}</span>
        <div
          className={cn(
            'bg-surface-container-lowest px-4 py-3 rounded-lg rounded-tl-none shadow-sm border border-outline-variant/60 min-w-0 overflow-hidden',
            streaming && 'transition-[min-height] duration-200'
          )}
        >
          <Markdown content={message.content} />
          {streaming && (
            <span
              aria-hidden
              data-testid="streaming-caret"
              className="inline-block w-[2px] h-[1em] align-[-0.15em] ml-0.5 bg-primary animate-pulse"
            />
          )}
          {!streaming && (
            <>
              <CitationChips citations={message.citations ?? []} commit={wikiCommit} />
              {message.reportedGap && <GapNote />}
              <ToolTrace trace={message.toolTrace ?? []} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
