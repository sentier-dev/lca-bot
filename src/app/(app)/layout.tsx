import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/session'
import { AppShell } from '@/components/layout/app-shell'
import { AppFooter } from '@/components/layout/app-footer'

// Every authed route renders per request: the session check must run each time.
export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  return <AppShell footer={<AppFooter />}>{children}</AppShell>
}
