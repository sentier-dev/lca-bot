// Google OAuth buttons render only when the backend routes can actually
// complete the flow: /api/auth/google needs the client ID and the callback
// token exchange needs the secret.
//
// Evaluated server-side at request time and passed down as a prop. A
// NEXT_PUBLIC_ flag cannot work here: those are inlined into the client
// bundle when the Docker image runs `next build` (without the flag set), so
// a runtime env var on the container never reaches the browser.
let warnedPartialConfig = false

export function isGoogleOAuthConfigured(): boolean {
  const hasId = !!process.env.GOOGLE_CLIENT_ID
  const hasSecret = !!process.env.GOOGLE_CLIENT_SECRET
  // Half-configured OAuth hides the buttons exactly like "intentionally off"
  // — surface the misconfiguration once so it doesn't pass silently.
  if (hasId !== hasSecret && !warnedPartialConfig) {
    warnedPartialConfig = true
    console.warn(
      '[auth] Google OAuth half-configured: exactly one of GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET is set — sign-in buttons hidden',
    )
  }
  return hasId && hasSecret
}
