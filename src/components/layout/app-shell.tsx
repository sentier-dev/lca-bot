'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { QueryProvider } from '@/components/providers/query-provider'
import { Sidebar } from '@/components/layout/sidebar'
import { Icon } from '@/components/ui/icon'

interface AppShellProps {
  footer: React.ReactNode
  children: React.ReactNode
}

export function AppShell({ footer, children }: AppShellProps) {
  const t = useTranslations('nav')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const handleToggle = useCallback(() => setSidebarOpen((prev) => !prev), [])

  return (
    <QueryProvider>
      <div className="flex h-screen bg-surface text-on-surface">
        <Sidebar open={sidebarOpen} onToggle={handleToggle} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="relative z-[60] flex items-center gap-3 h-14 px-4 border-b border-outline-variant/60 bg-surface shrink-0">
            <button
              onClick={handleToggle}
              className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
              aria-label={t('toggleSidebarAria')}
              type="button"
            >
              <Icon name="menu" />
            </button>
            <Link
              href="/chat"
              aria-label={t('brandLinkAria')}
              className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-surface-container/60 transition-colors"
              data-testid="header-brand"
            >
              <img src="/dds-logo-green.svg" alt="" aria-hidden="true" className="h-7 w-auto" />
              <span className="font-headline font-bold text-primary tracking-tight">LCA Wiki</span>
            </Link>
          </header>
          <main className="flex-1 min-h-0 overflow-hidden flex flex-col">{children}</main>
          {footer}
        </div>
      </div>
    </QueryProvider>
  )
}
