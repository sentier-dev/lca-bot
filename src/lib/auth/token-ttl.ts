// Single source of truth for the password-reset / login-link / bootstrap
// token lifetime shown in transactional UI copy (library.bootstrap.body,
// auth.forgotPassword.submittedBody, system.checkEmail.body — see
// messages/*.json). Kept as its own dependency-free module (rather than
// living in db/queries/password-tokens.ts) so client components can import
// the number without pulling in the Drizzle/Postgres client.
//
// Keep in sync with TOKEN_LIFETIME_MS in src/db/queries/password-tokens.ts.
export const PASSWORD_TOKEN_TTL_HOURS = 1
