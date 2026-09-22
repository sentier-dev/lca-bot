import { NextResponse, type NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/auth/cookies'

export const PROTECTED_PREFIXES = ['/chat', '/archive', '/settings'] as const
const AUTH_ROUTES = ['/login'] as const
export const HOME_PATH = '/chat'

// Edge runtime: only the JWT is checked here. An expired (or missing) access
// token with a still-live refresh cookie is bounced through
// GET /api/auth/refresh, which mints a fresh pair and redirects back to
// `next`; the middleware matcher (src/middleware.ts) excludes /api/*, so that
// route is never itself intercepted here and cannot loop.
export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request })
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value

  let authenticated = false
  if (accessToken) {
    const payload = await verifyToken(accessToken)
    authenticated = !!(payload?.sub && payload?.email && payload.type !== 'refresh')
  }

  const { pathname, search } = request.nextUrl
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const isAuthRoute = (AUTH_ROUTES as readonly string[]).includes(pathname)

  if (!authenticated && (isProtected || isAuthRoute)) {
    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value
    if (refreshToken) {
      const refreshPayload = await verifyToken(refreshToken)
      if (refreshPayload?.sub && refreshPayload.type === 'refresh') {
        const refreshUrl = request.nextUrl.clone()
        refreshUrl.pathname = '/api/auth/refresh'
        refreshUrl.search = ''
        refreshUrl.searchParams.set('next', `${pathname}${search}`)
        return NextResponse.redirect(refreshUrl)
      }
    }
  }

  if (isProtected && !authenticated) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    loginUrl.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthRoute && authenticated) {
    const home = request.nextUrl.clone()
    home.pathname = HOME_PATH
    home.search = ''
    return NextResponse.redirect(home)
  }

  return response
}
