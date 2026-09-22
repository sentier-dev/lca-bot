import type { Tool } from '@anthropic-ai/sdk/resources/messages'

export const SUGGEST_TITLE_SYSTEM = `You name a chat from its first question and answer. Call suggest_title with a 2 to 5 word title in sentence case that names the specific subject of the question (the concept, tool, database or task asked about). No quotes, no trailing punctuation, never the word "Untitled", never a generic title such as "LCA question". Output exactly one tool call.`

export const SUGGEST_TITLE_TOOL: Tool = {
  name: 'suggest_title',
  description: 'Record a short title for the conversation.',
  input_schema: {
    type: 'object',
    properties: { title: { type: 'string', description: '2 to 5 words, sentence case.' } },
    required: ['title'],
  },
}
