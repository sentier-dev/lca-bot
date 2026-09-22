# lca-bot: agent notes

Chatbot in front of the public LCA wiki (sentier-dev/lca-wiki). Next.js 16 App
Router, Drizzle on Postgres, JWT cookies. English only. Single-instance
deployment (in-memory rate limiter).

## Rules

- Deployment target is not decided (hubdds behind nginx is the likely option); there is
  no infrastructure code in this repo. Ask before adding any.
- Accounts are created only by `npm run create-user`. There is no self-service
  account creation, no email verification, no guest mode, no billing. Do not
  add them.
- Google sign-in logs an EXISTING account in; the callback never inserts a user.
- No per-message caps. No em-dashes in user-facing text.
- `MOCK_ANTHROPIC=1` short-circuits every Anthropic call (`src/lib/anthropic/mock.ts`):
  it scripts the tool loop (search, read the first hit, answer citing it) with
  no network call, so tests and local dev never need a real API key. A
  question containing "unknown-topic" makes it call `report_gap` instead.
- `messages/en.json` holds every UI string; components call `useTranslations`.
- Migrations in `supabase/migrations/*.sql` are idempotent and re-run on every
  compose `up`. Bootstrap (schema `auth`, `auth.users`) is `docker/db/00-init.sql`.
- Design tokens in `src/app/globals.css` keep Material-style names
  (`bg-surface`, `text-primary`) mapped to the DdS palette; do not hardcode hex
  in components.
- Tests: `npm run test:unit` (vitest, happy-dom), `npm run test:integration`
  (compose db), `npm run test:e2e` (Playwright). `npm run test:coverage` is the
  same unit run with the 80 percent gate CI enforces; server pages, the db
  client and the schema are excluded from it.
- Tests that need the database are under `tests/integration` and expect
  `DATABASE_URL`, `JWT_SECRET` (40+ chars) and `MOCK_ANTHROPIC=1` in the
  environment; the compose db listens on localhost:54322.
- e2e specs read dev-mode emails from `docker compose logs app`; keep
  `RESEND_API_KEY` unset locally.
- Never commit `.env.docker` or `.env.local`.

## Wiki layer

- `src/lib/wiki/` : git sync (`sync.ts`, `git.ts`), the MiniSearch index and
  term/source maps (`build-index.ts`, `search.ts`, `sources.ts`,
  `frontmatter.ts`, `loader.ts`), the five model-facing tools (`tools.ts`:
  `search_wiki`, `read_page`, `lookup_term`, `lookup_source`, `report_gap`),
  and the process-wide `wikiStore` (`store.ts`), which holds the current index
  on `globalThis` behind a `Symbol.for` key (so it survives Next.js loading
  this module into more than one bundle) and swaps it atomically on each sync.
- `src/lib/chat/` : the server-side Anthropic streaming tool loop
  (`run-turn.ts`) and its typed events (`events.ts`), consumed by
  `src/app/api/chat` to build the SSE response and persist the exchange.
- `src/app/api/wiki/{sync,status}`, `src/components/chat/*`.
- The model only ever sees the wiki through the five tools; never add
  filesystem or network access to them.
