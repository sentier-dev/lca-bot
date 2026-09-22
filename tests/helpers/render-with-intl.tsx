import type { ComponentType, ReactElement, ReactNode } from 'react'
import { render } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import en from '../../messages/en.json'

type Messages = typeof en

interface RenderWithIntlOptions {
  locale?: string
  messages?: Messages
  // Wraps INSIDE the intl provider — use for other providers a component
  // under test needs (e.g. QueryClientProvider), so callers don't have to
  // hand-roll their own NextIntlClientProvider nesting.
  wrapper?: ComponentType<{ children: ReactNode }>
}

// Composable IntlWrapper: nest other providers inside it directly when you
// need more control than renderWithIntl's `wrapper` option gives you.
export function IntlWrapper({
  locale = 'en',
  messages = en,
  children,
}: {
  locale?: string
  messages?: Messages
  children: ReactNode
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}

// Standard wrapper for client components that call useTranslations.
// Defaults to the English catalog — assertions match en.json strings.
// Pass `wrapper` to compose additional providers (e.g. QueryClientProvider)
// inside the intl provider without hand-rolling the nesting at each call site.
export function renderWithIntl(
  ui: ReactElement,
  { locale = 'en', messages = en, wrapper: Wrapper }: RenderWithIntlOptions = {},
) {
  return render(
    <IntlWrapper locale={locale} messages={messages}>
      {Wrapper ? <Wrapper>{ui}</Wrapper> : ui}
    </IntlWrapper>,
  )
}
