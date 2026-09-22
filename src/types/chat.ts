export type ChatRole = 'user' | 'assistant'

export interface ToolTraceEntry {
  name: string
  input: Record<string, unknown>
}

/** One element of conversations.messages (jsonb). */
export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  createdAt: string
  /** Wiki page paths the answer was read from; assistant messages only. */
  citations?: string[]
  /** Tool calls made while answering; assistant messages only. */
  toolTrace?: ToolTraceEntry[]
  /** True when the model called report_gap for this answer. */
  reportedGap?: boolean
}

export const MAX_MESSAGE_CHARS = 4000
export const MAX_HISTORY_MESSAGES = 40
