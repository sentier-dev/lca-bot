import { updateSession } from '@/lib/auth/middleware'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: ['/chat/:path*', '/archive/:path*', '/settings/:path*', '/login'],
}
