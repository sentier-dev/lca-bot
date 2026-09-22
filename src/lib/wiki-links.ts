// The public wiki repository, as shown in the sidebar, the footer and the
// settings page. Hard-coded for Plan 1: env.wiki.repoUrl is a server-only
// value with a `.git` suffix, and these three call sites include client
// components. Plan 2 derives this from env.wiki.repoUrl on the server and
// passes it down, so there stays exactly one source of truth.
export const WIKI_REPO_URL = 'https://github.com/sentier-dev/lca-wiki'

/** GitHub URL of a wiki page at a commit; unknown commits fall back to main. */
export function pageUrl(commit: string | null | undefined, path: string): string {
  const ref = commit && commit !== 'unknown' ? commit : 'main'
  const encoded = path.split('/').map(encodeURIComponent).join('/')
  return `${WIKI_REPO_URL}/blob/${ref}/${encoded}`
}
