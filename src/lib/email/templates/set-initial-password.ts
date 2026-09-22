import type { EmailMessage } from '../client'

interface Params {
  to: string
  setPasswordUrl: string
}

export function setInitialPasswordEmail({ to, setPasswordUrl }: Params): EmailMessage {
  const subject = 'Finish setting up your LCA Wiki account'
  const text = [
    'Welcome to LCA Wiki.',
    '',
    'To finish setting up your account, choose a password using the link below.',
    'The link expires in 1 hour.',
    '',
    setPasswordUrl,
    '',
    'If you weren\'t expecting this email, you can safely ignore it.',
  ].join('\n')
  const html = `<!doctype html>
<html><body style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#111">
  <h1 style="font-size:22px;margin:0 0 16px">Welcome to LCA Wiki</h1>
  <p style="font-size:16px;line-height:1.55;margin:0 0 16px">Click below to finish setting up your account by choosing a password.</p>
  <p style="margin:24px 0"><a href="${setPasswordUrl}" style="display:inline-block;background:#3c5343;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Set your password</a></p>
  <p style="font-size:14px;color:#555;line-height:1.55;margin:0 0 8px">This link expires in 1 hour.</p>
  <p style="font-size:14px;color:#555;line-height:1.55;margin:0">If you weren't expecting this email, you can safely ignore it.</p>
</body></html>`
  return { to, subject, text, html }
}
