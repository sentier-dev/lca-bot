import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

export const ACCESS_TOKEN_COOKIE = 'lw-access-token'
export const REFRESH_TOKEN_COOKIE = 'lw-refresh-token'

const IS_PROD = process.env.NODE_ENV === 'production'

const BASE_OPTIONS: Partial<ResponseCookie> = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: 'lax',
  path: '/',
}

export function accessTokenCookie(token: string): ResponseCookie {
  return {
    name: ACCESS_TOKEN_COOKIE,
    value: token,
    ...BASE_OPTIONS,
    maxAge: 60 * 60, // 1 hour
  }
}

export function refreshTokenCookie(token: string): ResponseCookie {
  return {
    name: REFRESH_TOKEN_COOKIE,
    value: token,
    ...BASE_OPTIONS,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  }
}

export function clearAuthCookies(): ResponseCookie[] {
  return [
    { name: ACCESS_TOKEN_COOKIE, value: '', ...BASE_OPTIONS, maxAge: 0 },
    { name: REFRESH_TOKEN_COOKIE, value: '', ...BASE_OPTIONS, maxAge: 0 },
  ]
}
