'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { useChat } from '@/hooks/use-chat'
import { MAX_HISTORY_MESSAGES, type ChatMessage } from '@/types/chat'
import { EASE_EDITORIAL, EASE_FADE, EASE_SLIDE, fadeIn, slideUp, slideUpMessage } from '@/lib/animations'
import { MessageBubble } from './message-bubble'
import { MessageInput } from './message-input'
import { TypingIndicator } from './typing-indicator'
import { EmptyState } from './empty-state'
import { ConversationCap } from './conversation-cap'

interface Props {
  conversationId: string | null
  initialMessages: ChatMessage[]
  initialWikiCommit: string | null
  initialTitle: string | null
}

// Auto-scroll only follows the stream while the user is already close to the
// bottom, so scrolling up to reread earlier text is not fought by the stream.
const SCROLL_FOLLOW_THRESHOLD_PX = 120

const messageTransition = (role: ChatMessage['role']) => ({
  duration: role === 'user' ? 0.25 : 0.35,
  ease: EASE_EDITORIAL,
})

export function ChatView({ conversationId, initialMessages, initialWikiCommit, initialTitle }: Props) {
  const t = useTranslations('chat')
  const [title, setTitle] = useState(initialTitle)
  const chat = useChat({
    conversationId,
    initialMessages,
    initialWikiCommit,
    onTitle: setTitle,
    // First exchange of a new chat: move the URL to the conversation without a
    // remount, so the streamed messages stay on screen.
    onConversationCreated: (id, t) => { window.history.replaceState(null, '', `/chat/${id}`); if (t) setTitle(t) },
  })
  const scrollRef = useRef<HTMLDivElement>(null)
  // Whether the viewport is close enough to the bottom that new content
  // should pull it down. Starts true so the first paint always lands at
  // the bottom of a resumed conversation.
  const followBottomRef = useRef(true)
  const hasScrolledOnceRef = useRef(false)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    followBottomRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_FOLLOW_THRESHOLD_PX
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (!followBottomRef.current) return
    // Instant on the very first paint (e.g. resuming a long conversation),
    // smooth for every scroll that follows a live stream update.
    const behavior: ScrollBehavior = hasScrolledOnceRef.current ? 'smooth' : 'auto'
    const frame = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior })
    })
    hasScrolledOnceRef.current = true
    return () => cancelAnimationFrame(frame)
  }, [chat.messages.length, chat.streamingText, chat.currentStep])

  const full = chat.messages.length >= MAX_HISTORY_MESSAGES
  const landing = chat.messages.length === 0 && chat.status !== 'streaming'
  const streamingMessage: ChatMessage | null = chat.status === 'streaming' && chat.streamingText
    ? { id: 'streaming', role: 'assistant', content: chat.streamingText, createdAt: '' }
    : null

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence initial={false}>
        {landing ? (
          <motion.div key="landing" className="h-full" variants={fadeIn} initial="initial" animate="animate" exit="exit" transition={EASE_FADE}>
            <EmptyState onSend={(text) => void chat.send(text)} />
          </motion.div>
        ) : (
          <motion.div key="chat" className="flex flex-col h-full">
            <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto custom-scrollbar px-4 py-6">
              <div className="max-w-3xl mx-auto flex flex-col gap-5">
                {title && (
                  <h1 data-testid="chat-title" className="font-headline text-lg font-semibold text-on-surface tracking-tight px-1">
                    {title}
                  </h1>
                )}
                {chat.messages.map((m) => (
                  <motion.div key={m.id} variants={slideUpMessage} initial="initial" animate="animate" transition={messageTransition(m.role)}>
                    <MessageBubble message={m} wikiCommit={chat.wikiCommit} />
                  </motion.div>
                ))}
                {streamingMessage && (
                  <motion.div key={streamingMessage.id} variants={slideUpMessage} initial="initial" animate="animate" transition={messageTransition('assistant')}>
                    <MessageBubble message={streamingMessage} wikiCommit={chat.wikiCommit} streaming />
                  </motion.div>
                )}
                <AnimatePresence>
                  {chat.status === 'streaming' && !chat.streamingText && (
                    <motion.div key="typing" variants={fadeIn} initial="initial" animate="animate" exit="exit" transition={EASE_FADE}>
                      <TypingIndicator step={chat.currentStep} />
                    </motion.div>
                  )}
                </AnimatePresence>
                {chat.status === 'error' && chat.errorCode && (
                  <div role="alert" className="rounded-md bg-error-container border border-error/20 px-4 py-3 text-sm text-on-error-container flex items-center justify-between gap-3">
                    <span>{t(`errors.${chat.errorCode === 'conversation_full' ? 'turn_failed' : chat.errorCode}`)}</span>
                    {chat.lastFailedMessage && (
                      <button type="button" onClick={() => void chat.retry()} className="font-semibold underline underline-offset-2">{t('errors.retry')}</button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <motion.div
              variants={slideUp}
              initial="initial"
              animate="animate"
              transition={EASE_SLIDE}
              className="shrink-0 border-t border-outline-variant/60 bg-surface px-4 py-3"
            >
              <div className="max-w-3xl mx-auto">
                {full ? <ConversationCap /> : <MessageInput onSend={(text) => void chat.send(text)} disabled={chat.status === 'streaming'} />}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  )
}
