import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockSend, mockResendConstructor } = vi.hoisted(() => {
  const mockSend = vi.fn()
  // Use `function` (not arrow) so the mock is constructable. When `new`'d,
  // returning an object replaces the implicit `this` and becomes the instance.
  const mockResendConstructor = vi.fn(function () {
    return { emails: { send: mockSend } }
  })
  return { mockSend, mockResendConstructor }
})

vi.mock('resend', () => ({
  Resend: mockResendConstructor,
}))

describe('sendEmail', () => {
  const originalEnv = { ...process.env }
  let consoleLogSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mockSend.mockReset()
    mockResendConstructor.mockClear()
    process.env = { ...originalEnv }
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
    consoleLogSpy.mockRestore()
  })

  it('logs to stdout when RESEND_API_KEY is unset', async () => {
    delete process.env.RESEND_API_KEY
    process.env.EMAIL_FROM = 'noreply@example.org'
    const { sendEmail } = await import('@/lib/email/client')
    await sendEmail({ to: 'u@example.com', subject: 'X', html: '<p>hi</p>', text: 'hi' })
    expect(mockSend).not.toHaveBeenCalled()
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[email:dev]'),
      expect.objectContaining({ to: 'u@example.com', subject: 'X' }),
    )
  })

  it('calls Resend when RESEND_API_KEY is set', async () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.EMAIL_FROM = 'noreply@example.org'
    process.env.EMAIL_FROM_NAME = 'LCA Wiki'
    mockSend.mockResolvedValue({ data: { id: 'msg_1' }, error: null })
    const { sendEmail } = await import('@/lib/email/client')
    await sendEmail({ to: 'u@example.com', subject: 'X', html: '<p>hi</p>', text: 'hi' })
    expect(mockResendConstructor).toHaveBeenCalledWith('re_test')
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      to: 'u@example.com',
      from: 'LCA Wiki <noreply@example.org>',
      subject: 'X',
      text: 'hi',
      html: '<p>hi</p>',
    }))
  })

  it('does not throw if Resend rejects — logs and returns', async () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.EMAIL_FROM = 'noreply@example.org'
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockSend.mockRejectedValue(new Error('boom'))
    const { sendEmail } = await import('@/lib/email/client')
    await expect(sendEmail({ to: 'u@example.com', subject: 'X', html: '<p>hi</p>', text: 'hi' }))
      .resolves.toBeUndefined()
    expect(consoleErrorSpy).toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })

  it('logs when Resend returns an error response (non-throwing failure)', async () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.EMAIL_FROM = 'noreply@example.org'
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockSend.mockResolvedValue({ data: null, error: { name: 'validation_error', message: 'bad domain' } })
    const { sendEmail } = await import('@/lib/email/client')
    await sendEmail({ to: 'u@example.com', subject: 'X', html: '<p>hi</p>', text: 'hi' })
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[email]'),
      expect.objectContaining({ error: 'bad domain' }),
    )
    consoleErrorSpy.mockRestore()
  })
})
