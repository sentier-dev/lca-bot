import { NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getSessionUser } from '@/lib/auth/session'
import { unauthorized, notFound, badRequest, conflict, serviceUnavailable, serverError, parseJsonObject } from '@/lib/errors'
import { anthropic, MODELS } from '@/lib/anthropic/client'
import { env } from '@/lib/env'
import { wikiStore } from '@/lib/wiki/store'
import { runTurn } from '@/lib/chat/run-turn'
import { encodeSse, type ChatEvent } from '@/lib/chat/events'
import { toAnthropicMessages, trimHistory } from '@/lib/chat/history'
import { suggestConversationTitle } from '@/lib/title-suggest'
import { getConversation, createConversation, replaceMessages, renameConversation } from '@/db/queries/conversations'
import { recordWikiGap } from '@/db/queries/wiki-gaps'
import { MAX_HISTORY_MESSAGES, MAX_MESSAGE_CHARS, type ChatMessage } from '@/types/chat'

export const dynamic = 'force-dynamic'
// Long answers with several tool rounds can take a while; Node runtime, no edge.
export const runtime = 'nodejs'
export const maxDuration = 300

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * POST /api/chat  { conversationId: string | null, message: string }
 * Streams Server-Sent Events (see src/lib/chat/events.ts). The user message
 * is appended before the model runs; the assistant message is persisted only
 * on success, so a failed stream leaves the question in place for a retry.
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const body = await parseJsonObject(request)
  if (!body) return badRequest('Invalid JSON body')
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) return badRequest('message is required')
  if (message.length > MAX_MESSAGE_CHARS) return badRequest(`message must be at most ${MAX_MESSAGE_CHARS} characters`)
  const requestedId = body.conversationId
  if (requestedId !== null && requestedId !== undefined && (typeof requestedId !== 'string' || !UUID_RE.test(requestedId))) {
    return badRequest('conversationId must be a UUID or null')
  }

  const index = wikiStore.get()
  if (!index) return serviceUnavailable('The wiki index is not loaded yet. Try again in a moment.')

  const userMessage: ChatMessage = { id: randomUUID(), role: 'user', content: message, createdAt: new Date().toISOString() }
  let conversationId: string
  let history: ChatMessage[]
  let withUser: ChatMessage[]
  // Every database call before the stream opens can still answer with a status
  // code; once the response is streaming, failures can only be SSE events.
  try {
    if (typeof requestedId === 'string') {
      const existing = await getConversation(requestedId, user.id)
      if (!existing) return notFound()
      if (existing.messages.length >= MAX_HISTORY_MESSAGES) return conflict('This conversation is full. Start a new chat to continue.')
      conversationId = existing.id
      history = existing.messages
    } else {
      const created = await createConversation(user.id)
      conversationId = created.id
      history = []
    }
    withUser = [...history, userMessage]
    // A false result means the row is gone or is owned by somebody else.
    const stored = await replaceMessages(conversationId, user.id, withUser, index.commit)
    if (!stored) return notFound()
  } catch (err) {
    console.error('[chat] could not open the conversation', err)
    return serverError()
  }
  const isFirstExchange = history.length === 0

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // The reader can go away mid-answer (closed tab, lost connection).
      // Enqueueing then throws, and that must not abandon the turn: the
      // assistant message still has to be persisted for the next visit.
      const safeEmit = (event: ChatEvent) => {
        try {
          controller.enqueue(encodeSse(event))
        } catch {
          // no reader left; keep going
        }
      }
      try {
        const result = await runTurn({
          client: anthropic,
          model: MODELS.chat,
          index,
          publicBaseUrl: env.wiki.publicBaseUrl,
          history: toAnthropicMessages(trimHistory(withUser)),
          recordGap: (gap) => recordWikiGap({ userId: user.id, conversationId, question: gap.question, note: gap.note, wikiCommit: index.commit }),
          emit: safeEmit,
          signal: request.signal,
        })
        const assistant: ChatMessage = {
          id: randomUUID(),
          role: 'assistant',
          content: result.text || (result.reportedGap ? 'The wiki does not cover this yet.' : 'No answer was produced.'),
          createdAt: new Date().toISOString(),
          citations: result.citations,
          toolTrace: result.toolTrace,
          reportedGap: result.reportedGap,
        }
        await replaceMessages(conversationId, user.id, [...withUser, assistant], index.commit)

        // From here the answer is stored, so nothing may still turn into an
        // error event: a missing title only costs the conversation its name.
        let title: string | null = null
        if (isFirstExchange) {
          try {
            title = await suggestConversationTitle({ client: anthropic, model: MODELS.title, question: message, answer: assistant.content })
            if (title) await renameConversation(conversationId, user.id, title)
          } catch (err) {
            console.warn('[chat] could not title the conversation', err)
            title = null
          }
        }
        safeEmit({ type: 'done', conversationId, messageId: assistant.id, citations: result.citations, toolTrace: result.toolTrace, reportedGap: result.reportedGap, wikiCommit: index.commit, title })
      } catch (err) {
        console.error('[chat] turn failed', err)
        safeEmit({ type: 'error', code: 'turn_failed', message: 'The answer could not be completed. Try again.' })
      } finally {
        try {
          controller.close()
        } catch {
          // already closed by an aborted request
        }
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Conversation-Id': conversationId,
    },
  })
}
