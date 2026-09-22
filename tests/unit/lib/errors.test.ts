import { describe, it, expect } from 'vitest'
import {
  apiError,
  unauthorized,
  forbidden,
  notFound,
  rateLimited,
  conflict,
  badRequest,
  serverError,
  parseJsonObject,
} from '@/lib/errors'

describe('error helpers', () => {
  it('apiError returns JSON response with correct status and message', async () => {
    const response = apiError('Custom error', 418)
    const body = await response.json()

    expect(response.status).toBe(418)
    expect(body.error).toBe('Custom error')
  })

  it('unauthorized returns 401', async () => {
    const response = unauthorized()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('forbidden returns 403', async () => {
    const response = forbidden()
    expect(response.status).toBe(403)
  })

  it('notFound returns 404', async () => {
    const response = notFound()
    expect(response.status).toBe(404)
  })

  it('rateLimited returns 429', async () => {
    const response = rateLimited()
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.error).toBe('Too many requests')
  })

  it('badRequest returns 400 with custom message', async () => {
    const response = badRequest('Invalid input')
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Invalid input')
  })

  it('conflict returns 409 with custom message', async () => {
    const response = conflict('Already generating')
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toBe('Already generating')
  })

  it('serverError returns 500', async () => {
    const response = serverError()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe('Something went wrong')
  })
})

describe('parseJsonObject', () => {
  function makeRequest(raw: string): Request {
    return new Request('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: raw,
    })
  }

  it('returns the parsed object for a JSON object body', async () => {
    await expect(parseJsonObject(makeRequest('{"email":"a@b.c"}'))).resolves.toEqual({ email: 'a@b.c' })
  })

  it('returns an empty object for an empty JSON object', async () => {
    await expect(parseJsonObject(makeRequest('{}'))).resolves.toEqual({})
  })

  it.each([
    ['the literal null', 'null'],
    ['an array', '[1,2,3]'],
    ['a number', '42'],
    ['a string', '"hello"'],
    ['a boolean', 'true'],
    ['unparseable JSON', '{not json'],
  ])('returns null for %s', async (_label, raw) => {
    await expect(parseJsonObject(makeRequest(raw))).resolves.toBeNull()
  })
})
