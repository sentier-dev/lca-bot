'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/icon'
import { MAX_MESSAGE_CHARS } from '@/types/chat'

interface MessageInputProps {
  onSend: (content: string) => void
  disabled?: boolean
  placeholder?: string
  maxChars?: number
  /** Focuses the textarea on mount, for the landing layout's centred bar. */
  autoFocus?: boolean
}

/** The counter appears once the draft passes this share of the cap. */
const COUNTER_THRESHOLD = 0.8

export function MessageInput({
  onSend,
  disabled = false,
  placeholder,
  maxChars = MAX_MESSAGE_CHARS,
  autoFocus = false,
}: MessageInputProps) {
  const t = useTranslations('chat')
  // Resolved here rather than as a parameter default: a translation hook in a
  // default-parameter expression would run conditionally.
  const resolvedPlaceholder = placeholder ?? t('input.placeholder')
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus()
  }, [autoFocus])

  const resize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
    // Only scroll once max-h clamps the height. When empty, a wrapping
    // placeholder inflates scrollHeight, and a scrollable textarea paints a
    // stray scrollbar thumb next to the placeholder on Android Chrome.
    el.style.overflowY = el.scrollHeight > el.clientHeight ? 'auto' : 'hidden'
  }, [])

  const tooLong = value.length > maxChars

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value)
    resize()
  }

  function submit() {
    const trimmed = value.trim()
    if (!trimmed || disabled || trimmed.length > maxChars) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.overflowY = 'hidden'
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="bg-surface-container-lowest rounded-lg shadow-xl border border-outline-variant px-4 py-2 w-full min-w-0">
      {value.length > maxChars * COUNTER_THRESHOLD && (
        <div
          className={cn('pt-1 text-right font-mono text-[11px]', tooLong ? 'text-warning' : 'text-on-surface-variant')}
          data-testid="chat-counter"
        >
          {value.length}/{maxChars}
        </div>
      )}
      <div className="flex items-center w-full min-w-0">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={resolvedPlaceholder}
          rows={1}
          data-testid="chat-input"
          className={cn(
            'flex-1 min-w-0 bg-transparent border-none focus:ring-0 focus:outline-none',
            'text-on-surface placeholder:text-outline/40 py-2 pr-2',
            'resize-none max-h-48 overflow-y-hidden custom-scrollbar font-body text-base break-words leading-6'
          )}
        />
        <button
          onClick={submit}
          disabled={disabled || !value.trim() || tooLong}
          className={cn(
            'shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-transparent',
            'text-primary hover:text-primary/80 hover:bg-primary/5',
            'active:scale-95 transition-all',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none disabled:hover:bg-transparent'
          )}
          aria-label={t('input.sendAria')}
          data-testid="chat-send"
          type="button"
        >
          <Icon name="send" filled />
        </button>
      </div>
    </div>
  )
}
