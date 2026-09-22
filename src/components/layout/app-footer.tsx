import { getTranslations } from 'next-intl/server'
import { wikiStore } from '@/lib/wiki/store'
import { WIKI_REPO_URL, pageUrl } from '@/lib/wiki-links'

export async function AppFooter() {
  const t = await getTranslations('footer')
  const status = wikiStore.status()
  const synced = status.syncedAt ? new Date(status.syncedAt).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : null
  return (
    <footer className="shrink-0 border-t border-outline-variant/60 bg-surface px-4 py-2 text-[11px] text-on-surface-variant flex flex-wrap items-center gap-x-3" data-testid="app-footer">
      <span>
        {t('answersFrom')}{' '}
        <a href={WIKI_REPO_URL} target="_blank" rel="noopener noreferrer" className="font-mono text-primary underline underline-offset-2">sentier-dev/lca-wiki</a>
        {status.commit ? (
          <>
            {' '}{t('commit')}{' '}
            <a href={pageUrl(status.commit, 'index.md')} target="_blank" rel="noopener noreferrer" className="font-mono text-primary underline underline-offset-2">{status.commit.slice(0, 7)}</a>
          </>
        ) : (
          <span className="font-mono"> ({t('loading')})</span>
        )}
        {synced && <span className="font-mono">{' '}· {t('synced')} {synced}</span>}
      </span>
      <span aria-hidden="true">·</span>
      <span>{t('project')}</span>
    </footer>
  )
}
