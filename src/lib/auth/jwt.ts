import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

let _jwtSecret: Uint8Array | null = null

function getJwtSecret(): Uint8Array {
  if (_jwtSecret) return _jwtSecret
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error(
      'JWT_SECRET environment variable is required. ' +
      'Generate one with: openssl rand -base64 48'
    )
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long')
  }
  _jwtSecret = new TextEncoder().encode(secret)
  return _jwtSecret
}

const JWT_ISSUER = 'lca-wiki'
const JWT_EXPIRATION = '1h'
const REFRESH_EXPIRATION = '7d'

export interface AuthTokenPayload extends JWTPayload {
  sub: string       // user UUID
  email: string
  role: 'authenticated'
}

export async function signAccessToken(userId: string, email: string): Promise<string> {
  return new SignJWT({
    sub: userId,
    email,
    role: 'authenticated',
    aud: 'authenticated',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(getJwtSecret())
}

export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({
    sub: userId,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime(REFRESH_EXPIRATION)
    .sign(getJwtSecret())
}

export async function verifyToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: JWT_ISSUER,
    })
    return payload as AuthTokenPayload
  } catch {
    return null
  }
}
