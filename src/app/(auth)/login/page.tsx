import { isGoogleOAuthConfigured } from '@/lib/auth/google-oauth-flag'
import { env } from '@/lib/env'
import { LoginContent } from './login-content'

// Reads runtime env (Google OAuth config, contact address), so it must not be
// prerendered at build time.
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return <LoginContent googleOAuthEnabled={isGoogleOAuthConfigured()} contactEmail={env.contactEmail} />
}
