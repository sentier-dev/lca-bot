import type Anthropic from '@anthropic-ai/sdk'
import type {
  Message, MessageCreateParams, MessageParam, MessageStreamEvent, ContentBlock, ToolUseBlock,
} from '@anthropic-ai/sdk/resources/messages'

// Scripted stand-in for the Anthropic client, active when MOCK_ANTHROPIC=1.
// It drives the same tool loop the real model does, keyed on the conversation
// so far: search first, read the first hit, then answer citing the page. A
// question containing "unknown-topic" makes it call report_gap instead.
// Only the two methods the app uses exist: messages.stream and messages.create.

export const MOCK_TEXT_PREFIX = 'Mock answer.'
export const MOCK_TITLE = 'Functional unit basics'
export const MOCK_GAP_MARKER = 'unknown-topic'

let counter = 0
const nextId = (prefix: string) => `${prefix}_mock_${(++counter).toString(36)}`

function baseMessage(model: string, content: ContentBlock[], stop: Message['stop_reason']): Message {
  return {
    id: nextId('msg'),
    type: 'message',
    role: 'assistant',
    model,
    stop_reason: stop,
    stop_sequence: null,
    content,
    usage: { input_tokens: 10, output_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
  } as unknown as Message
}

function toolUse(name: string, input: Record<string, unknown>): ToolUseBlock {
  // `caller` is required on ToolUseBlock in SDK 0.82; the model-issued value is `direct`.
  return { type: 'tool_use', id: nextId('toolu'), name, input, caller: { type: 'direct' } }
}

function lastUserText(messages: MessageParam[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== 'user') continue
    if (typeof m.content === 'string') return m.content
    const text = m.content.find((b) => b.type === 'text')
    if (text && text.type === 'text') return text.text
  }
  return ''
}

function firstUserText(messages: MessageParam[]): string {
  const m = messages.find((x) => x.role === 'user')
  if (!m) return ''
  if (typeof m.content === 'string') return m.content
  const text = m.content.find((b) => b.type === 'text')
  return text && text.type === 'text' ? text.text : ''
}

interface LastToolResult { name: string; result: string }

// The name comes from the assistant tool_use block that the tool_result answers.
function lastToolResult(messages: MessageParam[]): LastToolResult | null {
  const last = messages[messages.length - 1]
  if (!last || last.role !== 'user' || typeof last.content === 'string') return null
  const result = last.content.find((b) => b.type === 'tool_result')
  if (!result || result.type !== 'tool_result') return null
  const prev = messages[messages.length - 2]
  if (!prev || prev.role !== 'assistant' || typeof prev.content === 'string') return null
  const use = prev.content.find((b) => b.type === 'tool_use' && b.id === result.tool_use_id)
  if (!use || use.type !== 'tool_use') return null
  const content = typeof result.content === 'string'
    ? result.content
    : (result.content ?? []).map((c) => (c.type === 'text' ? c.text : '')).join('')
  return { name: use.name, result: content }
}

function decide(params: MessageCreateParams): Message {
  const model = params.model
  const messages = params.messages
  const toolChoice = params.tool_choice
  // Only the title call is scripted from tool_choice; any other forced tool
  // falls through to the normal wiki decision below.
  if (toolChoice && toolChoice.type === 'tool' && toolChoice.name === 'suggest_title') {
    return baseMessage(model, [toolUse(toolChoice.name, { title: MOCK_TITLE })], 'tool_use')
  }
  const hasTools = (params.tools ?? []).length > 0
  const question = firstUserText(messages)
  const last = lastToolResult(messages)

  if (!hasTools) {
    return baseMessage(model, [{ type: 'text', text: `${MOCK_TEXT_PREFIX} ${lastUserText(messages)}`, citations: null } as ContentBlock], 'end_turn')
  }
  if (!last) {
    // The marker counts on the opening question and on the newest one, so a
    // gap can be raised mid-thread as well as on the first turn.
    const marked = `${question}\n${lastUserText(messages)}`.toLowerCase().includes(MOCK_GAP_MARKER)
    if (marked) {
      return baseMessage(model, [toolUse('report_gap', { question: lastUserText(messages) || question, note: 'mock gap' })], 'tool_use')
    }
    return baseMessage(model, [toolUse('search_wiki', { query: question })], 'tool_use')
  }
  if (last.name === 'search_wiki') {
    let path = 'index.md'
    try {
      const parsed = JSON.parse(last.result) as { hits?: Array<{ path: string }> }
      path = parsed.hits?.[0]?.path ?? path
    } catch { /* keep default */ }
    return baseMessage(model, [toolUse('read_page', { path })], 'tool_use')
  }
  if (last.name === 'report_gap') {
    return baseMessage(model, [{ type: 'text', text: `${MOCK_TEXT_PREFIX} The wiki does not cover this yet. See CONTRIBUTING.md.`, citations: null } as ContentBlock], 'end_turn')
  }
  let path = 'the page'
  try {
    path = (JSON.parse(last.result) as { path?: string }).path ?? path
  } catch { /* keep default */ }
  return baseMessage(model, [{
    type: 'text',
    text: `${MOCK_TEXT_PREFIX} According to ${path}, the answer to "${question}" is in the wiki.\n\nPages used: ${path}`,
    citations: null,
  } as ContentBlock], 'end_turn')
}

function* textDeltas(message: Message): Generator<MessageStreamEvent> {
  const text = message.content.filter((b) => b.type === 'text').map((b) => (b.type === 'text' ? b.text : '')).join('')
  const chunk = 12
  for (let i = 0; i < text.length; i += chunk) {
    yield {
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text: text.slice(i, i + chunk) },
    } as MessageStreamEvent
  }
}

class MockStream implements AsyncIterable<MessageStreamEvent> {
  constructor(private readonly message: Message) {}
  async *[Symbol.asyncIterator](): AsyncIterator<MessageStreamEvent> {
    for (const ev of textDeltas(this.message)) yield ev
  }
  async finalMessage(): Promise<Message> {
    return this.message
  }
}

export function createMockAnthropic(): Anthropic {
  const messages = {
    async create(params: MessageCreateParams): Promise<Message> {
      return decide(params)
    },
    stream(params: MessageCreateParams): MockStream {
      return new MockStream(decide(params))
    },
  }
  return { messages } as unknown as Anthropic
}
