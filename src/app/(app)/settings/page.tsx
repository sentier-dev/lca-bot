import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getSessionUser } from '@/lib/auth/session'
import { getUserWithProvider } from '@/db/queries/users'
import { AccountSection } from '@/components/settings/account-section'
import { DangerZoneSection } from '@/components/settings/danger-zone-section'
import { Icon } from '@/components/ui/icon'
import { WIKI_REPO_URL } from '@/lib/wiki-links'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getSessionUser()
  if (!session) redirect('/login')
  const user = await getUserWithProvider(session.id)
  if (!user) redirect('/login')

  const t = await getTranslations('settings')

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="px-6 py-10 max-w-3xl mx-auto">
        <div className="mb-10">
          <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight flex items-center gap-3">
            <Icon name="settings" size="lg" className="text-primary" />
            {t('title')}
          </h1>
          <p className="mt-2 text-on-surface-variant text-sm">{t('subtitle')}</p>
        </div>
        <div className="space-y-12">
          <AccountSection email={user.email} provider={user.provider} hasPassword={user.hasPassword} />
          <section>
            <h2 className="font-headline text-xl font-semibold text-on-surface mb-4">{t('wiki.heading')}</h2>
            <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-6 text-sm text-on-surface-variant">
              <p>{t('wiki.body')}</p>
              <a
                href={WIKI_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block font-mono text-primary underline underline-offset-2"
              >
                {t('wiki.link')}
              </a>
            </div>
          </section>
          <DangerZoneSection />
        </div>
      </div>
    </div>
  )
}
