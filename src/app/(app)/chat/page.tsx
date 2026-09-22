import { ChatView } from '@/components/chat/chat-view'
import { wikiStore } from '@/lib/wiki/store'

export const dynamic = 'force-dynamic'

export default function ChatPage() {
  return <ChatView conversationId={null} initialMessages={[]} initialWikiCommit={wikiStore.status().commit} initialTitle={null} />
}
