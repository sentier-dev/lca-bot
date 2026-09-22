'use client'

import { useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Icon } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const t = useTranslations('common')
  const resolvedConfirmLabel = confirmLabel ?? t('confirm')
  const resolvedCancelLabel = cancelLabel ?? t('cancel')
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) confirmRef.current?.focus()
  }, [open])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    },
    [onCancel]
  )

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-on-surface/20 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1.0] }}
            className="relative w-full max-w-sm rounded-2xl bg-surface-container-lowest p-6 shadow-[0_24px_64px_rgba(0,0,0,0.12)] border border-outline-variant/20"
          >
            <div className="flex items-start gap-4 mb-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  variant === 'danger'
                    ? 'bg-error-container'
                    : 'bg-surface-container'
                }`}
              >
                <Icon
                  name={variant === 'danger' ? 'delete' : 'help_outline'}
                  className={
                    variant === 'danger'
                      ? 'text-on-error-container'
                      : 'text-on-surface-variant'
                  }
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  id="confirm-title"
                  className="font-headline font-semibold text-on-surface text-base"
                >
                  {title}
                </h3>
                <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">
                  {description}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="secondary" size="sm" onClick={onCancel}>
                {resolvedCancelLabel}
              </Button>
              <button
                ref={confirmRef}
                onClick={onConfirm}
                className={`px-4 py-2 text-sm rounded-lg font-semibold transition-all active:scale-[0.97] focus:outline-none focus-visible:ring-2 ${
                  variant === 'danger'
                    ? 'bg-error text-on-error hover:bg-error/90 focus-visible:ring-error/40'
                    : 'ink-gradient text-on-primary focus-visible:ring-primary/40'
                }`}
                type="button"
              >
                {resolvedConfirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
