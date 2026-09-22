# Changelog

## 0.2.0 (unreleased)

- Wiki sync (`src/lib/wiki/sync.ts`, `git.ts`) clones and re-syncs the public
  LCA wiki into `WIKI_DATA_DIR` and builds a MiniSearch index plus term and
  source maps, held process-wide on `globalThis` with an atomic swap.
- Five model-facing tools (`search_wiki`, `read_page`, `lookup_term`,
  `lookup_source`, `report_gap`) are the model's only access to the wiki.
- Streaming chat: a server-side Anthropic tool loop (`src/lib/chat/run-turn.ts`)
  runs over `/api/chat`, emitting Server-Sent Events with citations, tool
  trace steps and a typing indicator to the browser.
- Unanswerable questions are recorded to `wiki_gaps` via `report_gap`, shown
  in the UI as a gap note.
- Scripted mock client (`src/lib/anthropic/mock.ts`, `MOCK_ANTHROPIC=1`)
  drives the same tool loop with no network call, for tests and local dev.
- Conversation API (`/api/conversations`, `/api/conversations/[id]`):
  create, list, resume, rename, delete; `/chat` starts a new conversation,
  `/chat/[id]` resumes one.
- Sanitised markdown rendering for assistant messages (react-markdown +
  remark-gfm + rehype-sanitize).
- Live footer showing the wiki commit the answers came from
  (`src/components/layout/app-footer.tsx`).
- Archive page (`src/components/archive`, `src/hooks/use-conversations.ts`):
  paginated list with open, rename, delete and load more, an empty state, and
  a preview derived from the first user message for chats without a title.
  The chat page shows the conversation title once one is set or suggested.
- Deployment target left open (hubdds behind nginx is the likely option); no
  infrastructure code in the repo.

## 0.1.0 (unreleased)

- Imported the source app's skeleton (an unrelated content-authoring product)
  and removed every subsystem it brought along: billing, worker, mobile, admin
  and export.
- Fresh schema: `auth.users`, `password_reset_tokens`, `conversations`,
  `wiki_gaps`.
- Login with email + password, Google sign-in for existing accounts,
  password reset, change password, delete account. Accounts via
  `npm run create-user`.
- Replaced the Upstash Redis rate limiter with an in-memory sliding window,
  correct for a single app instance.
- CLI scripts `create-user`, `set-password` and `list-gaps`, sharing argument,
  password and database helpers under `scripts/lib`.
- `/api/health` checks the database only, with no S3 or Redis probes.
- Rewrote the end-to-end suite around the trimmed app: auth, password change,
  forgot-password, Google gating, OAuth callback, settings and delete-account.
- DdS branding: Nunito, JetBrains Mono, dashboard palette, DdS logo.
- Placeholder chat and archive pages (filled by Plans 2 and 3).
