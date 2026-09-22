import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SignJWT } from 'jose'

// jwt.ts caches the encoded secret in a module-level variable, so every test
// re-imports the module after setting the environment it needs.
const TEST_SECRET = 'test-secret-value-that-is-long-enough-1234567890'
const ORIGINAL_SECRET = process.env.JWT_SECRET

async function loadJwt(secret: string | undefined) {
  vi.resetModules()
  if (secret === undefined) delete process.env.JWT_SECRET
  else process.env.JWT_SECRET = secret
  return import('@/lib/auth/jwt')
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.JWT_SECRET
  else process.env.JWT_SECRET = ORIGINAL_SECRET
})

describe('signAccessToken / verifyToken', () => {
  it('round trips an access token', async () => {
    const { signAccessToken, verifyToken } = await loadJwt(TEST_SECRET)

    const token = await signAccessToken('user-1', 'a@b.ch')
    const payload = await verifyToken(token)

    expect(payload).not.toBeNull()
    expect(payload?.sub).toBe('user-1')
    expect(payload?.email).toBe('a@b.ch')
    expect(payload?.role).toBe('authenticated')
    expect(payload?.aud).toBe('authenticated')
    expect(payload?.iss).toBe('lca-wiki')
    expect(payload?.type).toBeUndefined()
  })

  it('round trips a refresh token carrying type: refresh', async () => {
    const { signRefreshToken, verifyToken } = await loadJwt(TEST_SECRET)

    const token = await signRefreshToken('user-2')
    const payload = await verifyToken(token)

    expect(payload?.sub).toBe('user-2')
    expect(payload?.type).toBe('refresh')
    expect(payload?.email).toBeUndefined()
  })

  it('reuses the cached secret across calls in one module instance', async () => {
    const { signAccessToken, verifyToken } = await loadJwt(TEST_SECRET)

    const [first, second] = await Promise.all([
      signAccessToken('user-1', 'a@b.ch'),
      signAccessToken('user-1', 'a@b.ch'),
    ])

    expect(await verifyToken(first)).not.toBeNull()
    expect(await verifyToken(second)).not.toBeNull()
  })
})

describe('verifyToken rejections', () => {
  it('returns null for a tampered token', async () => {
    const { signAccessToken, verifyToken } = await loadJwt(TEST_SECRET)

    const token = await signAccessToken('user-1', 'a@b.ch')
    const [header, body, signature] = token.split('.')
    const tampered = `${header}.${body}x.${signature}`

    expect(await verifyToken(tampered)).toBeNull()
  })

  it('returns null for a token signed with a different secret', async () => {
    const { verifyToken } = await loadJwt(TEST_SECRET)

    const foreign = await new SignJWT({ sub: 'user-1', email: 'a@b.ch' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer('lca-wiki')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('another-secret-that-is-long-enough-0987654321'))

    expect(await verifyToken(foreign)).toBeNull()
  })

  it('returns null for an expired token', async () => {
    const { verifyToken } = await loadJwt(TEST_SECRET)

    const expired = await new SignJWT({ sub: 'user-1', email: 'a@b.ch' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer('lca-wiki')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(new TextEncoder().encode(TEST_SECRET))

    expect(await verifyToken(expired)).toBeNull()
  })

  it('returns null for a token minted by another issuer', async () => {
    const { verifyToken } = await loadJwt(TEST_SECRET)

    const wrongIssuer = await new SignJWT({ sub: 'user-1', email: 'a@b.ch' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer('somebody-else')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(TEST_SECRET))

    expect(await verifyToken(wrongIssuer)).toBeNull()
  })

  it('returns null for a string that is not a JWT at all', async () => {
    const { verifyToken } = await loadJwt(TEST_SECRET)

    expect(await verifyToken('not-a-token')).toBeNull()
  })
})

describe('JWT_SECRET validation', () => {
  it('throws when JWT_SECRET is missing', async () => {
    const { signAccessToken } = await loadJwt(undefined)

    await expect(signAccessToken('user-1', 'a@b.ch')).rejects.toThrow(
      /JWT_SECRET environment variable is required/,
    )
  })

  it('throws when JWT_SECRET is empty', async () => {
    const { signRefreshToken } = await loadJwt('')

    await expect(signRefreshToken('user-1')).rejects.toThrow(
      /JWT_SECRET environment variable is required/,
    )
  })

  it('throws when JWT_SECRET is shorter than 32 characters', async () => {
    const { signAccessToken } = await loadJwt('too-short')

    await expect(signAccessToken('user-1', 'a@b.ch')).rejects.toThrow(
      /at least 32 characters long/,
    )
  })
})
