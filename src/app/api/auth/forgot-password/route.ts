import { NextRequest, NextResponse } from 'next/server'
import { clientIp } from '@/lib/request-ip'
import { findUserByEmail } from '@/db/queries/users'
import { issueToken } from '@/db/queries/password-tokens'
import { sendEmail } from '@/lib/email/client'
import { passwordResetEmail } from '@/lib/email/templates/password-reset'
import { setInitialPasswordEmail } from '@/lib/email/templates/set-initial-password'
import { checkRateLimit } from '@/lib/rate-limit'
import { rateLimited, badRequest, parseJsonObject } from '@/lib/errors'

function appBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return url.replace(/\/$/, '')
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request)
  const rl = await checkRateLimit(ip, 'forgot-password')
  if (!rl.success) return rateLimited()

  const body = await parseJsonObject(request)
  if (!body) return badRequest('Invalid JSON body')
  const { email } = body
  if (typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }

  const normalized = email.trim().toLowerCase()
  const user = await findUserByEmail(normalized)
  if (!user) return NextResponse.json({ ok: true })

  const purpose = user.passwordHash ? 'reset' : 'set_initial'
  const { secret } = await issueToken(user.id, purpose)
  const url = `${appBaseUrl()}/set-password?token=${secret}`
  const message = purpose === 'reset'
    ? passwordResetEmail({ to: normalized, resetUrl: url })
    : setInitialPasswordEmail({ to: normalized, setPasswordUrl: url })
  try {
    await sendEmail(message)
  } catch (err) {
    console.error('[forgot-password] email send failed', err)
  }
  return NextResponse.json({ ok: true })
}
