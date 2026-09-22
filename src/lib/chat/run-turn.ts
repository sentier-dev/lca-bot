import type Anthropic from '@anthropic-ai/sdk'
import type { MessageParam, ContentBlockParam, ToolUseBlock } from '@anthropic-ai/sdk/resources/messages'
import { buildSystemBlocks } from '@/lib/anthropic/prompts/wiki-assistant'
import { WIKI_TOOLS, executeTool } from '@/lib/wiki/tools'
import type { WikiIndex } from '@/lib/wiki/types'
import type { ToolTraceEntry } from '@/types/chat'
import { describeToolCall, type ChatEvent } from './events'

export const MAX_TOOL_ROUNDS = 8
export const MAX_OUTPUT_TOKENS = 4096

export interface RunTurnInput {
  client: Anthropic
  model: string
  index: WikiIndex
  publicBaseUrl: string
  history: MessageParam[]
  recordGap: (gap: { question: string; note: string | null }) => Promise<unknown>
  emit: (event: ChatEvent) => void
  today?: string
  /** Aborts the upstream request when the caller disconnects. */
  signal?: AbortSignal
}

export interface RunTurnResult {
  text: string
  citations: string[]
  toolTrace: ToolTraceEntry[]
  reportedGap: boolean
  stopReason: 'end_turn' | 'max_tool_rounds' | 'max_tokens' | 'other'
}

/** Tool output is always a JSON object; anything else is treated as a failure. */
function parseToolOutput(output: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(output)
    return parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/**
 * The streaming tool loop. Streams text deltas as they arrive, executes every
 * tool_use block the model emits, feeds the results back, and stops when the
 * model ends its turn or the round cap is reached. Citations are the distinct
 * paths passed to read_page, in order.
 */
export async function runTurn(input: RunTurnInput): Promise<RunTurnResult> {
  const system = buildSystemBlocks({
    indexMarkdown: input.index.indexMarkdown,
    commit: input.index.commit,
    publicBaseUrl: input.publicBaseUrl,
    today: input.today ?? new Date().toISOString().slice(0, 10),
  })
  const messages: MessageParam[] = [...input.history]
  const citations: string[] = []
  const toolTrace: ToolTraceEntry[] = []
  let reportedGap = false
  let text = ''
  let stopReason: RunTurnResult['stopReason'] = 'other'

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const stream = input.client.messages.stream({
      model: input.model,
      max_tokens: MAX_OUTPUT_TOKENS,
      system,
      tools: WIKI_TOOLS,
      messages,
    }, { signal: input.signal })
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        text += event.delta.text
        input.emit({ type: 'text_delta', text: event.delta.text })
      }
    }
    const final = await stream.finalMessage()
    const toolUses = final.content.filter((b): b is ToolUseBlock => b.type === 'tool_use')

    if (final.stop_reason !== 'tool_use' || toolUses.length === 0) {
      stopReason = final.stop_reason === 'end_turn' ? 'end_turn' : final.stop_reason === 'max_tokens' ? 'max_tokens' : 'other'
      break
    }
    if (round === MAX_TOOL_ROUNDS) {
      stopReason = 'max_tool_rounds'
      break
    }

    const results: ContentBlockParam[] = []
    for (const use of toolUses) {
      const toolInput = (use.input ?? {}) as Record<string, unknown>
      input.emit({ type: 'tool_start', name: use.name, input: toolInput })
      toolTrace.push({ name: use.name, input: toolInput })
      const output = await executeTool(use.name, toolInput, { index: input.index, recordGap: input.recordGap })
      const parsed = parseToolOutput(output)
      if (use.name === 'read_page' && typeof toolInput.path === 'string' && parsed !== null && parsed.error === undefined) {
        if (!citations.includes(toolInput.path)) citations.push(toolInput.path)
      }
      if (use.name === 'report_gap' && parsed?.recorded === true) reportedGap = true
      input.emit({ type: 'tool_end', name: use.name, summary: describeToolCall(use.name, toolInput) })
      results.push({ type: 'tool_result', tool_use_id: use.id, content: output })
    }
    messages.push({ role: 'assistant', content: final.content })
    messages.push({ role: 'user', content: results })
  }

  return { text: text.trim(), citations, toolTrace, reportedGap, stopReason }
}
