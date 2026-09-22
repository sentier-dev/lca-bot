// During `next build` env vars are absent: return a placeholder so module
// initialisers pass their non-empty checks. Nothing calls out at build time.
const IS_BUILD = process.env.NEXT_PHASE === 'phase-production-build'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value && !IS_BUILD) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value ?? 'build-placeholder'
}

function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined
}

const DEFAULT_SYNC_INTERVAL_MINUTES = 60

/** Minutes between wiki syncs; anything unparseable or non-positive means the default. */
function syncIntervalMinutes(): number {
  const parsed = Number.parseInt(process.env.WIKI_SYNC_INTERVAL_MINUTES ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SYNC_INTERVAL_MINUTES
}

const IS_PROD = process.env.NODE_ENV === 'production'
const MOCK_ANTHROPIC = process.env.MOCK_ANTHROPIC === '1'

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: IS_PROD,
  appUrl: IS_PROD ? requireEnv('NEXT_PUBLIC_APP_URL') : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  // Where the login page tells visitors to write for an account. Overridable
  // so a deployment can point at a different inbox without a code change.
  contactEmail: process.env.CONTACT_EMAIL?.trim() || 'info@d-d-s.ch',
  auth: {
    jwtSecret: requireEnv('JWT_SECRET'),
  },
  db: {
    url: requireEnv('DATABASE_URL'),
  },
  anthropic: {
    mock: MOCK_ANTHROPIC,
    apiKey: MOCK_ANTHROPIC ? 'mock' : requireEnv('ANTHROPIC_API_KEY'),
    chatModel: process.env.CHAT_MODEL ?? 'claude-opus-5',
    titleModel: process.env.TITLE_MODEL ?? 'claude-haiku-4-5-20251001',
  },
  wiki: {
    repoUrl: process.env.WIKI_REPO_URL ?? 'https://github.com/sentier-dev/lca-wiki.git',
    publicBaseUrl: (process.env.WIKI_PUBLIC_BASE_URL ?? 'https://github.com/sentier-dev/lca-wiki/blob').replace(/\/$/, ''),
    dataDir: process.env.WIKI_DATA_DIR ?? '/data/wiki',
    syncIntervalMinutes: syncIntervalMinutes(),
    syncDisabled: process.env.WIKI_SYNC_DISABLED === '1',
    syncSecret: optionalEnv('WIKI_SYNC_SECRET'),
  },
  google: {
    clientId: optionalEnv('GOOGLE_CLIENT_ID'),
    clientSecret: optionalEnv('GOOGLE_CLIENT_SECRET'),
  },
  email: {
    resendApiKey: optionalEnv('RESEND_API_KEY'),
    from: optionalEnv('EMAIL_FROM'),
    fromName: process.env.EMAIL_FROM_NAME ?? 'LCA Wiki',
  },
} as const
