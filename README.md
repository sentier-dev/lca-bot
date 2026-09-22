# LCA Wiki bot (lca-bot)

A login-gated chatbot in front of the public LCA wiki
([sentier-dev/lca-wiki](https://github.com/sentier-dev/lca-wiki)). Users ask
questions about LCA practice, Brightway, the Sentier platform and the BAFU and
ecoinvent databases; answers come from the wiki and cite its pages. Previous
chats are kept in an archive and can be resumed.

A [Départ de Sentier](https://www.d-d-s.ch) project.

## Status

Plans 1 to 3 done. Runs locally with Docker Compose; the hosting target is not
decided yet (hubdds behind nginx is the likely option).
five wiki tools, the streaming chat with citations, unanswerable-question
capture (`wiki_gaps`), the live wiki-commit footer, and the archive (open,
rename, delete, load more, empty state, conversation titles) are all live.
The spec lives in the maintainers' private workspace wiki.

## Run locally

```bash
cp .env.docker.example .env.docker      # fill JWT_SECRET (openssl rand -base64 48) and ANTHROPIC_API_KEY
docker compose --env-file .env.docker up -d --build
DATABASE_URL=postgres://postgres:postgres@localhost:54322/postgres npm run create-user -- you@example.org
open http://localhost:3000
```

`MOCK_ANTHROPIC=1` lifts the `ANTHROPIC_API_KEY` requirement and replaces
every Anthropic call with a scripted mock client (search, read the first hit,
answer with a citation; a question containing "unknown-topic" triggers the
gap path instead) so the stack boots and answers without a real key. Unset it
to talk to the real model.

The wiki has two modes. By default the app container clones
`WIKI_REPO_URL` into `WIKI_DATA_DIR` itself and re-syncs on
`WIKI_SYNC_INTERVAL_MINUTES`. To serve a local checkout instead (for example
`~/dds/lca-wiki`), copy `docker-compose.override.example.yml` to
`docker-compose.override.yml` (compose merges it automatically) and set
`WIKI_SYNC_DISABLED=1` in `.env.docker` so the app never `git pull`s over it.
Running `npm run dev` outside Docker always uses the local-checkout mode:
`WIKI_DATA_DIR=/home/laurenz/dds/lca-wiki WIKI_SYNC_DISABLED=1 npm run dev`.

Accounts are created only with `npm run create-user`. `npm run set-password -- <email>`
resets one from the terminal; `npm run list-gaps` prints the questions the wiki
could not answer. The login page tells visitors to write to `CONTACT_EMAIL`
(default `info@d-d-s.ch`) for an account. Google sign-in works for existing
accounts, and its button only appears, when both `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET` are set.

## Develop

```bash
npm install
docker compose --env-file .env.docker up -d db migrate
npm run dev                # http://localhost:3000 against the compose database
npm run lint && npm run typecheck && npm run test:unit
npm run test:coverage      # the unit run plus the 80 percent gate CI enforces
npm run test:integration   # needs the compose db
npm run test:e2e           # boots the compose app, runs Playwright
```

Stack: Next.js 16 (App Router), React 19, Tailwind 4, next-intl (English),
Drizzle ORM on Postgres 17, jose JWT cookies, Anthropic SDK (Claude Opus 5 for
answers, Haiku 4.5 for titles).

## Layout

| Path | What |
|---|---|
| `src/app/(auth)` | login, forgot-password, set-password |
| `src/app/(app)` | chat, archive, settings (behind the session check) |
| `src/app/api` | auth, settings, health, `chat`, `wiki/{status,sync}` |
| `src/lib/auth` | JWT, cookies, session, edge middleware, Google OAuth state |
| `src/lib/wiki` | git sync, MiniSearch index, the five chat tools, wiki store on `globalThis` |
| `src/lib/chat` | the server-side Anthropic tool loop and its typed events |
| `src/lib/wiki-links.ts` | The public wiki URL as one constant for sidebar, footer and settings |
| `src/components/archive` | the archive list: row, list, empty state, view |
| `src/hooks/use-conversations.ts` | archive data hook: paginated list, delete, rename, over TanStack Query |
| `src/db` | Drizzle schema and query modules |
| `src/db/connection.ts` | The postgres client options shared by the app and the CLI scripts |
| `docker/db/00-init.sql`, `supabase/migrations` | bootstrap and idempotent migrations |
| `scripts/` | account and gap CLIs, icon rendering |
| `POST /api/wiki/sync` | forces a re-sync now; requires the `x-wiki-sync-secret` header to match `WIKI_SYNC_SECRET` |

## Licence

MIT (see `LICENSE`). Wiki content the bot quotes is CC-BY 4.0 by its authors.
