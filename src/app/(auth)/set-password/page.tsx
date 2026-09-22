'use client'

import { Suspense, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { AuthPanel } from '@/components/auth/auth-panel'
import { INPUT_CLASS, SUBMIT_CLASS } from '@/components/auth/auth-styles'
import { PasswordRequirements } from '@/components/ui/password-requirements'
import { isPasswordValid } from '@/lib/validation/password'

export const dynamic = 'force-dynamic'

function SetPasswordPageBody() {
  const router = useRouter()
  const params = useSearchParams()
  const t = useTranslations('system.setPassword')
  const tShared = useTranslations('system.shared')
  const tPassword = useTranslations('password')
  const tCommon = useTranslations('common')
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isPasswordValid(password)) { setError(tPassword('requirements')); return }
    if (password !== confirm) { setError(t('mismatch')); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error ?? tCommon('genericError'))
        return
      }
      router.push('/chat')
      router.refresh()
    } catch {
      setError(tCommon('error'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <AuthPanel title={t('title')}>
        <p className="text-sm text-error">{tShared('missingTokenBody')}</p>
        <p className="text-center text-xs">
          <Link href="/login" className="text-primary underline underline-offset-2">{tShared('backToLogin')}</Link>
        </p>
      </AuthPanel>
    )
  }

  return (
    <AuthPanel title={t('title')} subtitle={t('intro')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-on-surface">{tPassword('newLabel')}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={10}
            required
            className={INPUT_CLASS}
          />
          <PasswordRequirements password={password} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-on-surface">{tPassword('confirmLabel')}</span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            minLength={10}
            required
            className={INPUT_CLASS}
          />
        </label>
        {error && <p className="text-sm text-error">{error}</p>}
        <button type="submit" disabled={submitting} className={SUBMIT_CLASS}>
          {submitting ? t('setting') : t('submit')}
        </button>
      </form>
    </AuthPanel>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SetPasswordPageBody />
    </Suspense>
  )
}
