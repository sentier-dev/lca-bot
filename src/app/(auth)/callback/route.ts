import { NextResponse, type NextRequest } from 'next/server'

/**
 * Legacy callback route. Google OAuth now uses /api/auth/google/callback.
 * Redirect any stale hits to login.
 */
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/login`)
}
