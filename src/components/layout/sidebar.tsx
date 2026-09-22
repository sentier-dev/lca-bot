'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/cn'
import { WIKI_REPO_URL } from '@/lib/wiki-links'

interface SidebarProps {
  open: boolean
  onToggle: () => void
}

const NAV_ITEM_DEFS = [
  { key: 'chat', icon: 'add_comment', href: '/chat' },
  { key: 'archive', icon: 'inventory_2', href: '/archive' },
  { key: 'settings', icon: 'settings', href: '/settings' },
] as const

export function Sidebar({ open, onToggle }: SidebarProps) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const prevPathname = useRef(pathname)

  // Close on any route change (covers browser back/forward).
  useEffect(() => {
    if (prevPathname.current !== pathname && open) onToggle()
    prevPathname.current = pathname
  }, [pathname, open, onToggle])

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (err) {
      // Swallowed on purpose so the rejection does not escape the click
      // handler; the navigation below still happens.
      console.warn('[sidebar] logout request failed', err)
    } finally {
      // Full navigation so the login page renders with cleared cookies.
      // Runs even when the request fails: the user asked to leave.
      window.location.href = '/login'
    }
  }

  function isActive(href: string) {
    if (href === '/chat') return pathname === '/chat' || pathname.startsWith('/chat/')
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[65] bg-on-surface/5 backdrop-blur-sm transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={onToggle}
        aria-hidden={!open}
      />
      <aside
        className={cn(
          'fixed left-0 top-0 h-full z-[70] flex flex-col w-72 bg-surface-container-low border-r border-outline-variant/60 shadow-[24px_0_32px_rgba(43,43,43,0.04)]',
          'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-hidden={!open}
      >
        <div className="px-6 py-8">
          <div className="flex items-center gap-3 mb-10">
            <Link
              href="/chat"
              onClick={onToggle}
              className="flex items-center gap-3 flex-1 min-w-0 -mx-1 px-1 py-1 rounded-lg hover:bg-surface-container/60 transition-colors"
              aria-label={t('brandLinkAria')}
            >
              <img src="/dds-logo-green.svg" alt="" aria-hidden="true" className="h-8 w-auto shrink-0" />
              <span className="font-headline text-lg font-bold tracking-tight text-primary truncate">LCA Wiki</span>
            </Link>
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
              aria-label={t('closeSidebarAria')}
              type="button"
            >
              <Icon name="close" size="sm" />
            </button>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold mb-4 px-2">{t('mainMenu')}</p>
          <nav className="space-y-1">
            {NAV_ITEM_DEFS.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={onToggle}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    active ? 'bg-primary/10 text-primary font-semibold' : 'text-secondary hover:bg-surface-container',
                  )}
                >
                  <Icon name={item.icon} />
                  <span className="font-body text-sm tracking-tight">{t(`items.${item.key}`)}</span>
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex-1" />
        <div className="px-4 pb-6 pt-4 border-t border-outline-variant/60 space-y-1">
          <a
            href={WIKI_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-secondary hover:bg-surface-container transition-all duration-200 w-full"
          >
            <Icon name="menu_book" />
            <span className="font-body text-sm tracking-tight">{t('wikiLink')}</span>
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-secondary hover:bg-surface-container transition-all duration-200 w-full"
            type="button"
          >
            <Icon name="logout" />
            <span className="font-body text-sm tracking-tight">{t('logout')}</span>
          </button>
        </div>
      </aside>
    </>
  )
}
