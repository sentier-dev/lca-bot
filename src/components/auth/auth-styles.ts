// Shared Tailwind class strings for the three unauthenticated forms (login,
// forgot-password, set-password) so they cannot drift apart.

export const INPUT_CLASS =
  'mt-1 block w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus-visible:ring-primary/40 focus:border-transparent'

export const SUBMIT_CLASS =
  'inline-flex w-full justify-center rounded-lg ink-gradient px-4 py-2.5 text-sm font-semibold text-on-primary shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus-visible:ring-primary/40 focus:ring-offset-2 disabled:opacity-50 transition-opacity'
