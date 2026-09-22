import { NextResponse } from 'next/server'

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export function unauthorized() { return apiError('Unauthorized', 401) }
export function forbidden() { return apiError('Forbidden', 403) }
export function notFound() { return apiError('Not found', 404) }
export function rateLimited() { return apiError('Too many requests', 429) }
export function conflict(message: string) { return apiError(message, 409) }
export function badRequest(message: string) { return apiError(message, 400) }
export function serverError() { return apiError('Something went wrong', 500) }
export function serviceUnavailable(message = 'Service unavailable') { return apiError(message, 503) }

/** Parses a JSON object body; returns null when the body is not valid JSON or not an object. */
export async function parseJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json()
    if (typeof body !== 'object' || body === null || Array.isArray(body)) return null
    return body as Record<string, unknown>
  } catch {
    return null
  }
}
