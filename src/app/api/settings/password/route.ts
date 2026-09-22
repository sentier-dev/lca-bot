import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/session'
import { verifyUserPassword, updateUserPassword } from '@/db/queries/users'
import { checkRateLimit } from '@/lib/rate-limit'
import { unauthorized, rateLimited, apiError, serverError, badRequest, parseJsonObject } from '@/lib/errors'
import { isPasswordValid, PASSWORD_REQUIREMENTS_TEXT } from '@/lib/validation/password'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const rl = await checkRateLimit(user.id, 'password-change')
  if (!rl.success) return rateLimited()

  const body = await parseJsonObject(request)
  if (!body) return badRequest('Invalid JSON body')

  const { currentPassword, newPassword } = body

  if (typeof currentPassword !== 'string' || currentPassword.length === 0) {
    return apiError('currentPassword is required', 400)
  }
  if (typeof newPassword !== 'string' || newPassword.length === 0) {
    return apiError('newPassword is required', 400)
  }
  if (!isPasswordValid(newPassword)) {
    return apiError(PASSWORD_REQUIREMENTS_TEXT, 400)
  }

  const validCurrent = await verifyUserPassword(user.id, currentPassword)
  if (!validCurrent) {
    return apiError('Current password is incorrect', 403)
  }

  const updated = await updateUserPassword(user.id, newPassword)
  if (!updated) {
    return serverError()
  }

  return NextResponse.json({ ok: true })
}
