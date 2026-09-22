'use client'

import { useTranslations } from 'next-intl'

export function TypingIndicator({ step }: { step: string | null }) {
  const t = useTranslations('chat')
  return (
    <div className="flex items-start gap-3 max-w-[85%]" data-testid="typing-indicator" aria-live="polite">
      <div className="w-8 h-8 rounded bg-surface-container-lowest flex items-center justify-center shrink-0 mt-1 border border-outline-variant/60 overflow-hidden">
        <img src="/dds-logo-green.svg" alt="" aria-hidden="true" className="w-6 h-auto" />
      </div>
      <div className="flex items-center gap-3 px-4 py-3 bg-surface-container-lowest rounded-lg border border-outline-variant/60">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 bg-outline rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 bg-outline rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 bg-outline rounded-full animate-bounce" />
        </div>
        <span className="text-xs text-on-surface-variant font-mono">{step ?? t('working')}</span>
      </div>
    </div>
  )
}
