import { NextResponse } from 'next/server'
import { clearAuthCookies } from '@/lib/auth/cookies'

export async function POST() {
  const response = NextResponse.json({ success: true })
  for (const cookie of clearAuthCookies()) {
    response.cookies.set(cookie)
  }
  return response
}
