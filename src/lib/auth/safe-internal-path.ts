// Shared guard for user-influenced redirect targets (?next= param, back-link
// hrefs). Accepts only same-origin absolute paths.
//
// The naive `startsWith('/') && !startsWith('//')` check is bypassable:
// browsers treat backslashes as forward slashes in special-scheme URLs and
// strip tab/newline during parsing, so `/\evil.com` or `/\t/evil.com` would
// pass the prefix checks and then navigate off-origin — an open redirect on
// the credential flow.
export function isSafeInternalPath(path: string | null | undefined): path is string {
  if (!path) return false
  if (!path.startsWith('/')) return false
  if (path.startsWith('//')) return false
  if (/[\\\s]/.test(path)) return false
  // API and framework-internal routes are same-origin but not navigable
  // pages — landing a user on raw JSON (or chaining them into an OAuth
  // flow) is never an intended redirect target.
  if (path.startsWith('/api/') || path.startsWith('/_next/')) return false
  return true
}
