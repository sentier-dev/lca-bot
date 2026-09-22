import type { Metadata, Viewport } from 'next'
import { Nunito, JetBrains_Mono } from 'next/font/google'
import { getLocale, getTranslations } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'
import './globals.css'
import 'katex/dist/katex.min.css'
import { BfcacheReload } from '@/components/layout/bfcache-reload'
import { DevPerfMeasureGuard } from '@/components/layout/dev-perf-measure-guard'

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
  variable: '--font-nunito',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta.root')
  return {
    title: { default: 'LCA Wiki', template: '%s | LCA Wiki' },
    description: t('description'),
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
    robots: { index: false, follow: false },
    icons: {
      icon: [
        { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
        { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      ],
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
      shortcut: ['/favicon.ico'],
    },
  }
}

export const viewport: Viewport = {
  themeColor: '#F0EEE1',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  return (
    <html lang={locale} className={`${nunito.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <BfcacheReload />
        {process.env.NODE_ENV !== 'production' && <DevPerfMeasureGuard />}
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
}
