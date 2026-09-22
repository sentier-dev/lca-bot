'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ClientDate } from '@/components/ui/client-date'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/cn'
import type { ConversationListItem } from '@/hooks/use-conversations'

const PREVIEW_CHARS = 80
const MAX_TITLE_CHARS = 200

interface Props {
  item: ConversationListItem
  onDelete: (id: string) => Promise<boolean>
  onRename: (id: string, title: string) => Promise<boolean>
}

export function displayTitle(item: Pick<ConversationListItem, 'title' | 'preview'>, untitled: string): string {
  if (item.title) return item.title
  if (item.preview) {
    const flat = item.preview.replace(/\s+/g, ' ').trim()
    return flat.length > PREVIEW_CHARS ? `${flat.slice(0, PREVIEW_CHARS).trimEnd()}…` : flat
  }
  return untitled
}

export function ArchiveRow({ item, onDelete, onRename }: Props) {
  const t = useTranslations('archive')
  const tCommon = useTranslations('common')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.title ?? '')
  const [error, setError] = useState<string | null>(null)
  const title = displayTitle(item, t('untitled'))

  async function confirmDelete() {
    setConfirmOpen(false)
    setDeleting(true)
    setError(null)
    const ok = await onDelete(item.id)
    if (!ok) {
      setDeleting(false)
      setError(t('deleteFailed'))
    }
  }

  async function saveTitle() {
    const next = draft.trim().slice(0, MAX_TITLE_CHARS)
    if (!next || next === item.title) {
      setEditing(false)
      setDraft(item.title ?? '')
      return
    }
    setError(null)
    const ok = await onRename(item.id, next)
    if (!ok) setError(t('renameFailed'))
    setEditing(false)
  }

  return (
    <li
      className={cn('rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-4 py-3 flex items-start gap-3', deleting && 'opacity-50 pointer-events-none')}
      data-testid="archive-row"
    >
      <div className="min-w-0 flex-1">
        {editing ? (
          <form onSubmit={(e) => { e.preventDefault(); void saveTitle() }} className="flex items-center gap-2">
            <label className="sr-only" htmlFor={`rename-${item.id}`}>{t('renameLabel')}</label>
            <input
              id={`rename-${item.id}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => void saveTitle()}
              onKeyDown={(e) => { if (e.key === 'Escape') { setEditing(false); setDraft(item.title ?? '') } }}
              maxLength={MAX_TITLE_CHARS}
              autoFocus
              className="w-full rounded-md border border-outline bg-surface-container-lowest px-2 py-1 text-sm text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              data-testid="archive-rename-input"
            />
          </form>
        ) : (
          <Link href={`/chat/${item.id}`} className="block font-semibold text-on-surface hover:text-primary truncate" aria-label={t('openAria', { title })} data-testid="archive-open">
            {title}
          </Link>
        )}
        <p className="mt-0.5 text-xs text-on-surface-variant font-mono flex flex-wrap gap-x-2">
          <span>{t('messages', { count: item.messageCount })}</span>
          <span aria-hidden="true">·</span>
          <ClientDate iso={item.updatedAt} formatOptions={{ year: 'numeric', month: 'short', day: 'numeric' }} />
        </p>
        {error && <p role="alert" className="mt-1 text-xs text-error">{error}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button type="button" onClick={() => { setDraft(item.title ?? title); setEditing(true) }} aria-label={t('renameAria', { title })} className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/5" data-testid="archive-rename">
          <Icon name="edit" size="sm" />
        </button>
        <button type="button" onClick={() => setConfirmOpen(true)} aria-label={t('deleteAria', { title })} className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/5" data-testid="archive-delete">
          <Icon name="delete" size="sm" />
        </button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title={t('deleteDialog.title')}
        description={t('deleteDialog.description', { title })}
        confirmLabel={tCommon('delete')}
        cancelLabel={tCommon('keep')}
        variant="danger"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setConfirmOpen(false)}
      />
    </li>
  )
}
