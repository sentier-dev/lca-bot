-- 00001: application tables. Idempotent (IF NOT EXISTS throughout) because
-- the compose `migrate` service re-applies every file on each `up`.

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,            -- sha256 of the URL secret; the secret is never stored
  purpose     text NOT NULL CHECK (purpose IN ('set_initial', 'reset')),
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_purpose_active
  ON password_reset_tokens (user_id, purpose)
  WHERE used_at IS NULL;

-- One row per chat. The whole thread lives in `messages` (jsonb array, see
-- src/types/chat.ts for the element shape); `wiki_commit` is the lca-wiki
-- commit the latest answer was produced from.
CREATE TABLE IF NOT EXISTS conversations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text,
  messages      jsonb NOT NULL DEFAULT '[]'::jsonb,
  message_count integer NOT NULL DEFAULT 0,
  wiki_commit   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
  ON conversations (user_id, updated_at DESC);

-- Questions the wiki could not answer, written by the model's report_gap tool.
CREATE TABLE IF NOT EXISTS wiki_gaps (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  question        text NOT NULL,
  note            text,
  wiki_commit     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wiki_gaps_created ON wiki_gaps (created_at DESC);
