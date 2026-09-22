'use client'

import { useTranslations } from 'next-intl'
import { MessageInput } from './message-input'

const CHIP_KEYS = ['e1', 'e2', 'e3'] as const

interface EmptyStateProps {
  onSend: (text: string) => void
  disabled?: boolean
}

/**
 * Landing layout shown before the first message: brand, a centred
 * input and short suggestion pills. Owns the whole "chat-empty" surface so
 * `ChatView` can swap it for the normal message list + bottom bar as a unit
 * once the conversation starts.
 */
export function EmptyState({ onSend, disabled = false }: EmptyStateProps) {
  const t = useTranslations('chat.empty')
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-6 px-4 py-12" data-testid="chat-empty">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-3">
          <img src="/dds-logo-green.svg" alt="Départ de Sentier" className="h-14 w-auto" />
          <span className="font-headline text-5xl font-bold text-primary tracking-tight">{t('wordmark')}</span>
        </div>
        <p className="text-sm text-on-surface-variant max-w-md text-center">{t('body')}</p>
      </div>
      <div className="w-full max-w-3xl">
        <MessageInput onSend={onSend} disabled={disabled} autoFocus />
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {CHIP_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onSend(t(`examples.${k}`))}
            disabled={disabled}
            className="px-4 py-1.5 rounded-full bg-surface-container-lowest/70 text-on-surface-variant text-sm border border-outline hover:bg-surface-container-lowest hover:text-primary hover:border-primary/40 transition-all duration-300 disabled:opacity-50"
          >
            {t(`chips.${k}`)}
          </button>
        ))}
      </div>
    </div>
  )
}
