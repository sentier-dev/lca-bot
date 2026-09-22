import type { EmailMessage } from '../client'

interface Params {
  to: string
  resetUrl: string
}

export function passwordResetEmail({ to, resetUrl }: Params): EmailMessage {
  const subject = 'Reset your LCA Wiki password'
  const text = [
    'You (or someone) requested a password reset for your LCA Wiki account.',
    '',
    'Click the link below to choose a new password. The link expires in 1 hour.',
    '',
    resetUrl,
    '',
    'If you didn\'t request this, you can safely ignore this email.',
  ].join('\n')
  const html = `<!doctype html>
<html><body style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#111">
  <h1 style="font-size:22px;margin:0 0 16px">Reset your password</h1>
  <p style="font-size:16px;line-height:1.55;margin:0 0 16px">Click below to choose a new password.</p>
  <p style="margin:24px 0"><a href="${resetUrl}" style="display:inline-block;background:#3c5343;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Reset password</a></p>
  <p style="font-size:14px;color:#555;line-height:1.55;margin:0 0 8px">This link expires in 1 hour.</p>
  <p style="font-size:14px;color:#555;line-height:1.55;margin:0">If you didn't request this, you can safely ignore this email.</p>
</body></html>`
  return { to, subject, text, html }
}
