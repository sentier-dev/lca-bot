import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { MAX_HISTORY_MESSAGES, type ChatMessage } from '@/types/chat'

/** Last MAX_HISTORY_MESSAGES messages, cut so the first one is a user turn. */
export function trimHistory(messages: ChatMessage[]): ChatMessage[] {
  let slice = messages.slice(-MAX_HISTORY_MESSAGES)
  while (slice.length > 0 && slice[0].role !== 'user') slice = slice.slice(1)
  return slice
}

/**
 * Stored messages become plain text turns; citations and traces stay in the
 * database. Consecutive messages of the same role are folded into one turn:
 * a turn that failed can leave two user messages behind, and the API rejects
 * a history that does not alternate.
 */
export function toAnthropicMessages(messages: ChatMessage[]): MessageParam[] {
  return messages.reduce<MessageParam[]>((turns, m) => {
    const last = turns[turns.length - 1]
    if (last && last.role === m.role) {
      return [...turns.slice(0, -1), { role: last.role, content: `${String(last.content)}\n\n${m.content}` }]
    }
    return [...turns, { role: m.role, content: m.content }]
  }, [])
}
