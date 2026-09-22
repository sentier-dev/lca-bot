'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api-fetch'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { PasswordRequirements } from '@/components/ui/password-requirements'
import { isPasswordValid } from '@/lib/validation/password'

interface AccountSectionProps {
  email: string
  provider: 'email' | 'google'
  hasPassword: boolean
}

// Validation logic centralised in @/lib/validation/password

export function AccountSection({ email, provider, hasPassword }: AccountSectionProps) {
  const t = useTranslations('settings.account')
  const tCommon = useTranslations('common')
  const tPassword = useTranslations('password')
  // Password UI keys off password presence, not provider: an email account
  // that later signed in with Google has provider flipped to 'google' by
  // linkOAuthProvider while keeping its password, so it keeps the change form.
  const isEmailProvider = hasPassword

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!success) return
    const timeout = setTimeout(() => setSuccess(false), 5000)
    return () => clearTimeout(timeout)
  }, [success])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!isPasswordValid(newPassword)) {
      setError(tPassword('requirements'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('password.mismatch'))
      return
    }

    setPending(true)
    try {
      const res = await apiFetch('/api/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? t('password.updateFailed'))
        return
      }
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      setError(tCommon('networkError'))
    } finally {
      setPending(false)
    }
  }

  async function handleSignOut() {
    await apiFetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <section>
      <h2 className="font-headline text-xl font-semibold text-on-surface mb-4">{t('heading')}</h2>
      <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-6 space-y-8">
        {/* Email row */}
        <div>
          <label className="block text-xs uppercase tracking-wider text-on-surface-variant/70 font-medium mb-1">
            {t('email.label')}
          </label>
          <p className="text-on-surface">{email}</p>
          <p className="text-xs text-on-surface-variant/60 mt-1">{t('email.contactSupport')}</p>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-on-surface-variant/70 font-medium mb-1">
            {t('signInMethod.label')}
          </label>
          <p className="text-on-surface">{provider === 'google' ? t('signInMethod.google') : t('signInMethod.email')}</p>
        </div>

        {/* Password subsection */}
        <div className="border-t border-outline-variant/40 pt-6">
          <h3 className="font-headline text-sm font-semibold text-on-surface mb-3">{t('password.heading')}</h3>

          {!isEmailProvider && (
            <p className="text-sm text-on-surface-variant">
              {t('password.oauthNotice')}
            </p>
          )}

          {isEmailProvider && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-sm">
                <span className="text-on-surface-variant">{t('password.currentLabel')}</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="block text-sm">
                <span className="text-on-surface-variant">{tPassword('newLabel')}</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <PasswordRequirements password={newPassword} />
              </label>
              <label className="block text-sm">
                <span className="text-on-surface-variant">{tPassword('confirmLabel')}</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>

              {error && <p className="text-sm text-error">{error}</p>}
              {success && (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary"
                >
                  <Icon name="check_circle" filled size="sm" className="mt-0.5" />
                  <span>
                    <span className="font-medium">{t('password.updateSuccess')}</span>{' '}
                    <span className="text-primary/80">{t('password.updateSuccessBody')}</span>
                  </span>
                </div>
              )}

              <div className="pt-1">
                <Button type="submit" variant="ink" size="sm" disabled={pending}>
                  {pending ? t('password.updating') : t('password.submit')}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Sign out */}
        <div className="border-t border-outline-variant/40 pt-6">
          <Button variant="secondary" size="sm" onClick={handleSignOut}>
            {t('signOut')}
          </Button>
        </div>
      </div>
    </section>
  )
}
