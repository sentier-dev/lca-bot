import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/auth/cookies'
import { NextRequest } from 'next/server'

export async function mintTestTokens(userId: string, email: string) {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(userId, email),
    signRefreshToken(userId),
  ])
  return { accessToken, refreshToken }
}

export function buildCookieHeader(accessToken: string, refreshToken?: string): string {
  let cookie = `${ACCESS_TOKEN_COOKIE}=${accessToken}`
  if (refreshToken) {
    cookie += `; ${REFRESH_TOKEN_COOKIE}=${refreshToken}`
  }
  return cookie
}

interface RequestOptions {
  method?: string
  body?: unknown
  accessToken?: string
  refreshToken?: string
  headers?: Record<string, string>
}

export function makeRequest(url: string, options: RequestOptions = {}): NextRequest {
  const { method = 'GET', body, accessToken, refreshToken, headers: extraHeaders = {} } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  }

  if (accessToken) {
    headers['Cookie'] = buildCookieHeader(accessToken, refreshToken)
  }

  return new NextRequest(`http://localhost:3000${url}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
}
