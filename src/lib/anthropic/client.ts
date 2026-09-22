import Anthropic from '@anthropic-ai/sdk'
import { env } from '@/lib/env'
import { createMockAnthropic } from './mock'

// MOCK_ANTHROPIC=1 swaps in the scripted client; no request ever leaves the process.
export const anthropic: Anthropic = env.anthropic.mock
  ? createMockAnthropic()
  : new Anthropic({ apiKey: env.anthropic.apiKey })

export const MODELS = {
  chat: env.anthropic.chatModel,
  title: env.anthropic.titleModel,
} as const

export type SystemBlock = {
  type: 'text'
  text: string
  cache_control?: { type: 'ephemeral' }
}
