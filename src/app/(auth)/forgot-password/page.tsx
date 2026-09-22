'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { AuthPanel } from '@/components/auth/auth-panel'
import { INPUT_CLASS, SUBMIT_CLASS } from '@/components/auth/auth-styles'
import { PASSWORD_TOKEN_TTL_HOURS } from '@/lib/auth/token-ttl'

export const dynamic = 'force-dynamic'

export default function ForgotPasswordPage() {
  const t = useTranslations('auth.forgotPassword')
  const tShared = useTranslations('auth.shared')
  const tCommon = useTranslations('common')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSubmitted(true)
    } catch {
      setError(tCommon('error'))
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <AuthPanel title={t('submittedTitle')}>
        <p className="text-sm text-on-surface-variant">
          {t.rich('submittedBody', {
            email,
            bold: (chunks) => <strong className="font-semibold text-on-surface">{chunks}</strong>,
            hours: PASSWORD_TOKEN_TTL_HOURS,
          })}
        </p>
        <p className="text-center text-xs">
          <Link href="/login" className="text-primary underline underline-offset-2">{t('backToLogin')}</Link>
        </p>
      </AuthPanel>
    )
  }

  return (
    <AuthPanel title={t('title')} subtitle={t('subtitle')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-on-surface">{tShared('emailLabel')}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder={tShared('emailPlaceholder')}
            className={INPUT_CLASS}
          />
        </label>
        {error && <p role="alert" className="text-sm text-error">{error}</p>}
        <button type="submit" disabled={submitting || !email} className={SUBMIT_CLASS}>
          {submitting ? tCommon('sending') : t('submit')}
        </button>
      </form>

      <p className="text-center text-xs">
        <Link href="/login" className="text-primary underline underline-offset-2">{t('backToLogin')}</Link>
      </p>
    </AuthPanel>
  )
}
