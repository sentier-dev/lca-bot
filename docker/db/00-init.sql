-- Bootstrap for a fresh database. Idempotent: also re-run by the compose
-- `migrate` service and by the production deploy step.

CREATE SCHEMA IF NOT EXISTS auth;
GRANT ALL ON SCHEMA auth TO postgres;

CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;

CREATE TABLE IF NOT EXISTS auth.users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE NOT NULL,
  password_hash text,                        -- NULL for Google-only accounts
  provider      text NOT NULL DEFAULT 'email' CHECK (provider IN ('email', 'google')),
  provider_id   text,                        -- Google subject once linked
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_users_provider_subject_unique
  ON auth.users (provider, provider_id)
  WHERE provider_id IS NOT NULL;

GRANT ALL ON auth.users TO postgres;
