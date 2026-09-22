import type Anthropic from '@anthropic-ai/sdk'
import { SUGGEST_TITLE_SYSTEM, SUGGEST_TITLE_TOOL } from '@/lib/anthropic/prompts/suggest-title'

const MAX_TITLE_CHARS = 80
const TIMEOUT_MS = 10_000

export interface SuggestTitleArgs {
  client: Anthropic
  model: string
  question: string
  answer: string
}

/** Best effort: null on any failure, timeout or empty title. Never blocks the chat. */
export async function suggestConversationTitle({ client, model, question, answer }: SuggestTitleArgs): Promise<string | null> {
  try {
    const response = await client.messages.create({
      model,
      max_tokens: 64,
      system: SUGGEST_TITLE_SYSTEM,
      tools: [SUGGEST_TITLE_TOOL],
      tool_choice: { type: 'tool', name: SUGGEST_TITLE_TOOL.name },
      messages: [{ role: 'user', content: `Question: ${question.slice(0, 1000)}\n\nAnswer: ${answer.slice(0, 1500)}` }],
    }, { timeout: TIMEOUT_MS })
    const block = response.content.find((b) => b.type === 'tool_use')
    if (!block || block.type !== 'tool_use') return null
    const title = (block.input as { title?: unknown }).title
    if (typeof title !== 'string') return null
    const trimmed = title.trim().replace(/[.!?]+$/, '')
    if (!trimmed || trimmed.toLowerCase() === 'untitled') return null
    return trimmed.slice(0, MAX_TITLE_CHARS)
  } catch (err) {
    console.warn('[title-suggest] failed:', err instanceof Error ? err.message : err)
    return null
  }
}
