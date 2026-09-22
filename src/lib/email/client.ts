import { Resend } from 'resend'

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text: string
}

let cachedClient: Resend | null = null

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  if (!cachedClient) {
    cachedClient = new Resend(apiKey)
  }
  return cachedClient
}

/**
 * Best-effort email send. In dev (no RESEND_API_KEY), logs the message to
 * stdout so the magic link is recoverable from container logs. In prod,
 * calls Resend and swallows errors — the calling code must not let an
 * email outage propagate (a failed reset mail must not fail the request).
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const client = getClient()
  if (!client) {
    console.log('[email:dev]', {
      to: message.to,
      subject: message.subject,
      text: message.text,
    })
    return
  }

  const fromEmail = process.env.EMAIL_FROM
  if (!fromEmail) {
    console.error('[email] EMAIL_FROM not configured; skipping send', { to: message.to })
    return
  }
  const fromName = process.env.EMAIL_FROM_NAME ?? 'LCA Wiki'

  try {
    const { error } = await client.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    })
    if (error) {
      console.error('[email] Resend send failed', {
        to: message.to,
        subject: message.subject,
        error: error.message,
      })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[email] Resend send failed', { to: message.to, subject: message.subject, error: msg })
  }
}
