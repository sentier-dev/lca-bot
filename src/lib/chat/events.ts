import type { ToolTraceEntry } from '@/types/chat'

export type ChatEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_start'; name: string; input: Record<string, unknown> }
  | { type: 'tool_end'; name: string; summary: string }
  | { type: 'done'; conversationId: string; messageId: string; citations: string[]; toolTrace: ToolTraceEntry[]; reportedGap: boolean; wikiCommit: string | null; title: string | null }
  | { type: 'error'; code: string; message: string }

const encoder = new TextEncoder()

/** One SSE frame: `event: <type>` then `data: <json>` then a blank line. */
export function encodeSse(event: ChatEvent): Uint8Array {
  return encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
}

/** Short human label for a tool call, shown in the typing indicator. */
export function describeToolCall(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'search_wiki': return `Searching the wiki for "${String(input.query ?? '')}"`
    case 'read_page': return `Reading ${String(input.path ?? 'a page')}`
    case 'lookup_term': return `Looking up "${String(input.term ?? '')}" in the vocabulary`
    case 'lookup_source': return `Resolving source ${String(input.id ?? '')}`
    case 'report_gap': return 'Recording a gap in the wiki'
    default: return `Calling ${name}`
  }
}
