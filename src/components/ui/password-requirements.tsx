'use client'

import { useTranslations } from 'next-intl'
import { getPasswordChecks } from '@/lib/validation/password'

interface PasswordRequirementsProps {
  password: string
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const t = useTranslations('password')
  const checks = getPasswordChecks(password)
  const allMet = checks.every((c) => c.met)

  if (allMet && password.length > 0) return null

  return (
    <ul className="mt-1.5 space-y-0.5 text-xs" role="list" aria-label={t('requirementsAria')}>
      {checks.map((check) => (
        <li key={check.id} className="flex items-center gap-1.5">
          {password.length === 0 ? (
            <span className="h-3.5 w-3.5 flex items-center justify-center text-outline" aria-hidden="true">
              <Circle />
            </span>
          ) : check.met ? (
            <span className="h-3.5 w-3.5 flex items-center justify-center text-primary" aria-hidden="true">
              <Check />
            </span>
          ) : (
            <span className="h-3.5 w-3.5 flex items-center justify-center text-error" aria-hidden="true">
              <Cross />
            </span>
          )}
          <span className={
            password.length === 0
              ? 'text-on-surface-variant/70'
              : check.met
                ? 'text-primary'
                : 'text-error'
          }>
            {t(check.id)}
          </span>
        </li>
      ))}
    </ul>
  )
}

function Circle() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" aria-hidden="true">
      <circle cx="4" cy="4" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 6.5L5 9l4.5-6" />
    </svg>
  )
}

function Cross() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" />
    </svg>
  )
}
