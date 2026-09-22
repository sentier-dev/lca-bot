# LCA Wiki bot

A chatbot in front of the public LCA wiki, [sentier-dev/lca-wiki](https://github.com/sentier-dev/lca-wiki).
Ask about LCA practice, Brightway, the Sentier platform, BAFU or ecoinvent.
Answers come from the wiki only and cite the pages they rest on.
Every chat is kept in an archive and can be resumed.

A [Départ de Sentier](https://www.d-d-s.ch) project.

## How it works

The app clones the wiki and indexes it in memory.
Claude reads it through five tools: search, read page, look up term, look up source, report gap.
The answer streams to the browser with the pages it used as clickable citations.
Questions the wiki cannot answer are recorded for the maintainers.

## Run locally

```bash
cp .env.docker.example .env.docker
# set JWT_SECRET (openssl rand -base64 48) and ANTHROPIC_API_KEY
docker compose --env-file .env.docker up -d --build
DATABASE_URL=postgres://postgres:postgres@localhost:54322/postgres npm run create-user -- you@example.org
open http://localhost:3000
```

Accounts are created only with `npm run create-user`.
`npm run set-password -- <email>` resets a password.
`npm run list-gaps` prints the questions the wiki could not answer.
Google sign-in works for existing accounts when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.

Set `MOCK_ANTHROPIC=1` to run without an API key; a scripted client answers instead of the model.

## The wiki checkout

By default the app clones `WIKI_REPO_URL` into `WIKI_DATA_DIR` and pulls every `WIKI_SYNC_INTERVAL_MINUTES`.
`POST /api/wiki/sync` with the `x-wiki-sync-secret` header forces a pull.

To serve a local checkout instead, copy `docker-compose.override.example.yml` to `docker-compose.override.yml` and set `WIKI_SYNC_DISABLED=1`.
Outside Docker: `WIKI_DATA_DIR=/path/to/lca-wiki WIKI_SYNC_DISABLED=1 npm run dev`.

## Develop

```bash
npm install
docker compose --env-file .env.docker up -d db migrate
npm run dev
npm run lint && npm run typecheck && npm run test:coverage
npm run test:integration   # needs the compose database
npm run test:e2e           # boots the compose app, runs Playwright
```

Next.js 16, React 19, Tailwind 4, Drizzle on Postgres 17, Anthropic SDK (Claude Opus 5 for answers, Haiku 4.5 for titles).

## Layout

| Path | What |
|---|---|
| `src/app/(auth)` | login, forgot password, set password |
| `src/app/(app)` | chat, archive, settings |
| `src/app/api` | auth, settings, health, chat, conversations, wiki status and sync |
| `src/lib/auth` | JWT cookies, session, middleware, Google sign-in |
| `src/lib/wiki` | git sync, search index, the five tools |
| `src/lib/chat` | the streaming tool loop and its events |
| `src/components` | chat, archive, layout and UI components |
| `src/db` | Drizzle schema, queries, connection |
| `supabase/migrations`, `docker/db` | idempotent SQL applied on every compose start |
| `scripts/` | account and gap CLIs, icon rendering |

## Licence

MIT, see `LICENSE`.
Wiki content quoted by the bot is CC-BY 4.0 by its authors.
