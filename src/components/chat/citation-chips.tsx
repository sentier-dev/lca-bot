'use client'

import { useTranslations } from 'next-intl'
import { pageUrl } from '@/lib/wiki-links'

interface Props { citations: string[]; commit: string | null }

export function CitationChips({ citations, commit }: Props) {
  const t = useTranslations('chat.citations')
  if (citations.length === 0) return null
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2" data-testid="citations">
      <span className="text-[10px] uppercase tracking-wider text-on-surface-variant/70 font-semibold">{t('label')}</span>
      {citations.map((path) => (
        <a
          key={path}
          href={pageUrl(commit, path)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container border border-tertiary/40 hover:bg-tertiary/30 transition-colors break-all"
        >
          {path}
        </a>
      ))}
    </div>
  )
}
