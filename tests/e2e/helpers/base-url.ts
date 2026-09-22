/**
 * Single source of truth for the app's base URL in e2e specs.
 *
 * playwright.config.ts's `use.baseURL` covers page.goto()/page.request calls,
 * but a handful of specs need the literal origin outside of page context
 * (e.g. plain `fetch()` reachability probes, or matching an absolute
 * navigation URL). Those specs must import APP_URL from here instead of
 * hardcoding `http://localhost:3000`, so `APP_URL=http://localhost:3100`
 * repoints the whole suite at once.
 */
export const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'
