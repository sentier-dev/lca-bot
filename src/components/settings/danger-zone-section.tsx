'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api-fetch'
import { Button } from '@/components/ui/button'
import { TypedConfirmDialog } from '@/components/ui/typed-confirm-dialog'

export function DangerZoneSection() {
  const t = useTranslations('settings.dangerZone')
  const tCommon = useTranslations('common')

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePending, setDeletePending] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const deletePhrase = t('deletePhrase')

  async function handleDeleteConfirm() {
    setDeletePending(true)
    setDeleteError(null)
    try {
      const res = await apiFetch('/api/settings/delete-account', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json()
        setDeleteError(body.error ?? t('deleteAccount.failed'))
        setDeletePending(false)
        return
      }
      window.location.href = '/login'
    } catch {
      setDeleteError(tCommon('networkError'))
      setDeletePending(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-6">
        <h3 className="font-headline font-semibold text-on-surface mb-2">{t('deleteAccount.heading')}</h3>
        <p className="text-sm text-on-surface-variant mb-4">
          {t('deleteAccount.body')}
        </p>
        {deleteError && <p className="text-sm text-error mb-3">{deleteError}</p>}
        <Button variant="secondary" size="sm" onClick={() => setDeleteOpen(true)}>
          {t('deleteAccount.button')}
        </Button>
      </div>

      <TypedConfirmDialog
        open={deleteOpen}
        title={t('deleteDialog.title')}
        description={t('deleteDialog.description', { phrase: deletePhrase })}
        confirmationPhrase={deletePhrase}
        confirmLabel={deletePending ? t('deleting') : tCommon('delete')}
        cancelLabel={tCommon('cancel')}
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteOpen(false)}
      />
    </section>
  )
}
