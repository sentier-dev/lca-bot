// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// The real env module is used here so the MOCK_ANTHROPIC wiring is exercised
// end to end; process.env is stubbed instead of mocking '@/lib/env'.
function stubRealKeyEnv() {
  vi.stubEnv('MOCK_ANTHROPIC', '')
  vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test-key')
  vi.stubEnv('CHAT_MODEL', 'claude-test-chat')
  vi.stubEnv('TITLE_MODEL', 'claude-test-title')
  vi.stubEnv('JWT_SECRET', 'x'.repeat(40))
  vi.stubEnv('DATABASE_URL', 'postgres://x')
}

describe('anthropic client', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    stubRealKeyEnv()
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('constructs the SDK client with the api key from env', async () => {
    const { anthropic } = await import('@/lib/anthropic/client')
    expect(anthropic).toBeTruthy()
    expect((anthropic as unknown as { apiKey: string }).apiKey).toBe('sk-ant-test-key')
    expect(typeof anthropic.messages.create).toBe('function')
  })

  it('MODELS maps chat and title to the configured env models', async () => {
    const { MODELS } = await import('@/lib/anthropic/client')
    expect(MODELS).toEqual({ chat: 'claude-test-chat', title: 'claude-test-title' })
    expect(MODELS.chat).not.toBe(MODELS.title)
  })

  it('exports a single shared client instance per module registry', async () => {
    const first = await import('@/lib/anthropic/client')
    const second = await import('@/lib/anthropic/client')
    expect(first.anthropic).toBe(second.anthropic)
    expect(first.MODELS).toBe(second.MODELS)
  })

  it('SystemBlock shaped values are accepted with and without cache_control', async () => {
    const { MODELS } = await import('@/lib/anthropic/client')
    type SystemBlock = import('@/lib/anthropic/client').SystemBlock
    const plain: SystemBlock = { type: 'text', text: 'you are helpful' }
    const cached: SystemBlock = {
      type: 'text',
      text: 'a long wiki prelude',
      cache_control: { type: 'ephemeral' },
    }
    expect(plain.cache_control).toBeUndefined()
    expect(cached.cache_control).toEqual({ type: 'ephemeral' })
    expect(Object.keys(MODELS)).toContain('chat')
  })
})

describe('anthropic client switch', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses the mock when MOCK_ANTHROPIC=1', async () => {
    vi.stubEnv('MOCK_ANTHROPIC', '1')
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    vi.stubEnv('JWT_SECRET', 'x'.repeat(40))
    vi.stubEnv('DATABASE_URL', 'postgres://x')
    vi.resetModules()
    const { anthropic } = await import('@/lib/anthropic/client')
    const { MOCK_TITLE } = await import('@/lib/anthropic/mock')
    const msg = await anthropic.messages.create({
      model: 'm', max_tokens: 5,
      tools: [{ name: 'suggest_title', description: 't', input_schema: { type: 'object', properties: {} } }],
      tool_choice: { type: 'tool', name: 'suggest_title' },
      messages: [{ role: 'user', content: 'hi' }],
    })
    const block = msg.content.find((b) => b.type === 'tool_use')
    expect(block && block.type === 'tool_use' && (block.input as { title: string }).title).toBe(MOCK_TITLE)
  })
})
