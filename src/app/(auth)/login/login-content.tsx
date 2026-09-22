'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { AuthPanel } from '@/components/auth/auth-panel'
import { INPUT_CLASS, SUBMIT_CLASS } from '@/components/auth/auth-styles'
import { GoogleAuthSection } from '@/components/auth/google-auth-section'
import { isSafeInternalPath } from '@/lib/auth/safe-internal-path'
import { useBfcacheReset } from '@/hooks/use-bfcache-reset'

interface LoginContentProps {
  googleOAuthEnabled: boolean
  contactEmail: string
}

const CALLBACK_ERROR_CODES = [
  'rate_limited', 'google_auth_denied', 'missing_code', 'invalid_state', 'google_token_exchange_failed',
  'google_userinfo_failed', 'google_no_email', 'no_account', 'auth_callback_failed',
] as const
type CallbackErrorCode = (typeof CALLBACK_ERROR_CODES)[number]

function isCallbackErrorCode(value: string | null): value is CallbackErrorCode {
  return value !== null && (CALLBACK_ERROR_CODES as readonly string[]).includes(value)
}

export function LoginContent(props: LoginContentProps) {
  return (
    <Suspense>
      <LoginForm {...props} />
    </Suspense>
  )
}

function LoginForm({ googleOAuthEnabled, contactEmail }: LoginContentProps) {
  const t = useTranslations('auth.login')
  const tShared = useTranslations('auth.shared')
  const tCommon = useTranslations('common')
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const callbackError = searchParams.get('error')
  const [error, setError] = useState<string | null>(
    isCallbackErrorCode(callbackError) ? t(`errors.${callbackError}`) : null,
  )

  // Back from the Google consent screen restores this page from bfcache with
  // loading=true frozen; unfreeze it.
  useBfcacheReset(() => setLoading(false))

  const nextPath =
    [searchParams.get('next'), searchParams.get('redirectedFrom')].find(isSafeInternalPath) ?? null

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? t('loginFailedFallback'))
        setLoading(false)
        return
      }
      window.location.href = nextPath ?? '/chat'
    } catch {
      setError(tCommon('error'))
      setLoading(false)
    }
  }

  return (
    <AuthPanel title={t('title')} subtitle={t('subtitle')}>
      {error && (
        <div role="alert" className="rounded-md bg-error-container border border-error/20 px-4 py-3 text-sm text-on-error-container">
          {error}
        </div>
      )}

      {googleOAuthEnabled && (
        <GoogleAuthSection
          disabled={loading}
          next={nextPath}
          onStart={() => {
            setError(null)
            setLoading(true)
          }}
        />
      )}

      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-on-surface mb-1">{tShared('emailLabel')}</label>
          <input id="email" type="email" autoComplete="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} className={INPUT_CLASS} placeholder={tShared('emailPlaceholder')} />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-on-surface mb-1">{tShared('passwordLabel')}</label>
          <input id="password" type="password" autoComplete="current-password" required value={password}
            onChange={(e) => setPassword(e.target.value)} className={INPUT_CLASS} placeholder="••••••••" />
          <div className="mt-1 flex justify-end">
            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              {t('forgotPasswordLink')}
            </Link>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className={SUBMIT_CLASS}
        >
          {loading ? t('submitting') : t('submit')}
        </button>
      </form>

      <div className="text-center text-xs text-on-surface-variant border-t border-outline-variant/60 pt-4">
        <p className="font-semibold text-on-surface">{t('noAccountTitle')}</p>
        <p className="mt-1">
          {t.rich('noAccountBody', {
            email: contactEmail,
            link: () => <a href={`mailto:${contactEmail}`} className="text-primary underline underline-offset-2">{contactEmail}</a>,
          })}
        </p>
      </div>
    </AuthPanel>
  )
}
