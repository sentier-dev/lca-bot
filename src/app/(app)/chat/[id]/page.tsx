import { notFound, redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/session'
import { getConversation } from '@/db/queries/conversations'
import { ChatView } from '@/components/chat/chat-view'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function ChatConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()
  const conversation = await getConversation(id, user.id)
  if (!conversation) notFound()
  return <ChatView conversationId={conversation.id} initialMessages={conversation.messages} initialWikiCommit={conversation.wikiCommit} initialTitle={conversation.title} />
}
