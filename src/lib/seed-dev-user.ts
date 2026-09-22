/** Local accounts seeded by the compose `migrate` service. Never present in production. */
export const DEV_USER = { email: 'dev@lca-wiki.local', password: 'devpassword123' } as const
export const E2E_USER = { email: 'e2e@lca-wiki.local', password: 'e2epassword123' } as const
