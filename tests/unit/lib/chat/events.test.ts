import { describe, it, expect } from 'vitest'
import { describeToolCall, encodeSse, type ChatEvent } from '@/lib/chat/events'

describe('encodeSse', () => {
  it('writes one SSE frame per event with the type as the event name', () => {
    const ev: ChatEvent = { type: 'text_delta', text: 'hel\nlo' }
    expect(new TextDecoder().decode(encodeSse(ev))).toBe('event: text_delta\ndata: {"type":"text_delta","text":"hel\\nlo"}\n\n')
  })
})

describe('describeToolCall', () => {
  it('labels every wiki tool and falls back for an unknown one', () => {
    expect(describeToolCall('search_wiki', { query: 'functional unit' })).toBe('Searching the wiki for "functional unit"')
    expect(describeToolCall('read_page', { path: 'core/README.md' })).toBe('Reading core/README.md')
    expect(describeToolCall('read_page', {})).toBe('Reading a page')
    expect(describeToolCall('lookup_term', { term: 'activity' })).toBe('Looking up "activity" in the vocabulary')
    expect(describeToolCall('lookup_source', { id: 'ilcd-2010' })).toBe('Resolving source ilcd-2010')
    expect(describeToolCall('report_gap', { question: 'q' })).toBe('Recording a gap in the wiki')
    expect(describeToolCall('mystery', {})).toBe('Calling mystery')
  })
})
