'use client'

import { useTranslations } from 'next-intl'
import { GoogleIcon } from '@/components/auth/google-icon'

interface GoogleAuthSectionProps {
  disabled?: boolean
  // Called just before the OAuth redirect so the parent can flip its loading
  // state (the redirect unloads the page, so there is no "after").
  onStart?: () => void
  // Already-validated same-origin path to land on after the OAuth flow.
  // Carried through the signed OAuth state by /api/auth/google?next=.
  next?: string | null
}

// "Continue with Google" button + the "or" divider above the login form.
// Rendered only when the server says OAuth is configured. Sign-in is
// find-only: there is no sign-up form, accounts come from the CLI.
export function GoogleAuthSection({ disabled = false, onStart, next = null }: GoogleAuthSectionProps) {
  const t = useTranslations('auth.shared')

  function handleClick() {
    onStart?.()
    window.location.href = next
      ? `/api/auth/google?next=${encodeURIComponent(next)}`
      : '/api/auth/google'
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-outline bg-surface-container-lowest px-4 py-2.5 text-sm font-medium text-on-surface shadow-sm hover:bg-surface-container-low focus:outline-none focus:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 transition-colors"
      >
        <GoogleIcon />
        {t('continueWithGoogle')}
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-outline-variant" />
        <span className="text-xs text-outline">{t('or')}</span>
        <div className="flex-1 border-t border-outline-variant" />
      </div>
    </>
  )
}
